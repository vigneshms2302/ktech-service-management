import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { hashPassword, generateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { z } from 'zod';

export const publicRouter = Router();

const publicRegistrationSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(3, 'Shop slug must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-_]+$/i, 'Slug must contain only alphanumeric characters, dashes, or underscores'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Valid 10-digit mobile number required').max(15),
  email: z.string().email('Invalid email address').optional(),
  username: z.string().min(3).max(50).default('admin'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  city: z.string().max(100).default('Coimbatore'),
  state: z.string().max(100).default('Tamil Nadu'),
  pincode: z.string().max(10).optional(),
});

const contactInquirySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
  subject: z.string().min(2).max(150),
  message: z.string().min(10).max(2000),
});

// 1. Self-Service Customer Registration & Instant 14-Day Free Trial Provisioning
publicRouter.post('/register', validateBody(publicRegistrationSchema), async (req, res) => {
  try {
    const { shopName, slug, ownerName, phone, email, username, password, city, state, pincode } = req.body;
    const client = getClient();

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const shopId = `shop_${cleanSlug}`;

    // Verify slug uniqueness
    const checkRes = await client.execute({
      sql: `SELECT id FROM shops WHERE slug = ? OR id = ?`,
      args: [cleanSlug, shopId],
    });

    if (checkRes.rows.length > 0) {
      res.status(400).json({
        success: false,
        error: `Shop address URL "${cleanSlug}" is already taken. Please choose another shop handle.`,
      });
      return;
    }

    // 14-day free trial timestamp calculation
    const trialDays = 14;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create Shop Record
    await client.execute({
      sql: `
        INSERT INTO shops (
          id, name, slug, owner_name, phone, email, address, city, state, pincode,
          status, max_seats, subscription_plan, subscription_ends_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 5, 'PRO_ANNUAL', ?)
      `,
      args: [
        shopId,
        shopName.trim(),
        cleanSlug,
        ownerName.trim(),
        phone.trim(),
        email ? email.trim() : null,
        `${city.trim()}, ${state.trim()}`,
        city.trim(),
        state.trim(),
        pincode ? pincode.trim() : null,
        trialEndsAt,
      ],
    });

    // 2. Provision Subscription Record (Status: TRIALING)
    const subId = `sub_${cleanSlug}`;
    await client.execute({
      sql: `
        INSERT INTO saas_subscriptions (
          id, shop_id, plan_id, status, trial_starts_at, trial_ends_at,
          current_period_starts_at, current_period_ends_at, is_complimentary
        ) VALUES (?, ?, 'plan_pro_annual', 'TRIALING', CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, ?, 0)
      `,
      args: [subId, shopId, trialEndsAt, trialEndsAt],
    });

    // 3. Create Shop Owner Account (ROLE_OWNER)
    const ownerUserId = `usr_${cleanSlug}_owner`;
    const cleanUsername = username ? username.trim().toLowerCase() : 'admin';
    const passwordHash = hashPassword(password);
    const pin = '1234'; // Default initial quick PIN for shop POS

    await client.execute({
      sql: `
        INSERT INTO users (id, shop_id, username, password_hash, pin_code, full_name, role_id, phone, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 'ROLE_OWNER', ?, 1)
      `,
      args: [ownerUserId, shopId, cleanUsername, passwordHash, pin, ownerName.trim(), phone.trim()],
    });

    // 4. Fetch permissions for token
    const permRes = await client.execute({
      sql: `SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = 'ROLE_OWNER'`,
      args: [],
    });
    const permissions = permRes.rows.map((r) => (r as Record<string, unknown>).code as string);

    // 5. Generate authenticated JWT
    const token = generateToken({
      userId: ownerUserId,
      shopId,
      username: cleanUsername,
      fullName: ownerName.trim(),
      roleId: 'ROLE_OWNER',
      permissions,
    });

    // 6. Notify Super-Admin
    await client.execute({
      sql: `
        INSERT INTO saas_notifications (id, recipient_type, recipient_id, channel, title, message)
        VALUES (?, 'VENDOR_ADMIN', 'VND-ROOT-01', 'IN_APP', ?, ?)
      `,
      args: [
        `notif_${Date.now()}`,
        `New Shop Registration: ${shopName.trim()}`,
        `New shop "${shopName.trim()}" (slug: ${cleanSlug}) started a 14-day free trial. Owner: ${ownerName.trim()} (${phone.trim()}).`,
      ],
    });

    res.json({
      success: true,
      message: 'Account created successfully! Your 14-day free trial has been activated.',
      token,
      user: {
        id: ownerUserId,
        shopId,
        shopName: shopName.trim(),
        username: cleanUsername,
        fullName: ownerName.trim(),
        roleId: 'ROLE_OWNER',
        permissions,
      },
      shop: {
        id: shopId,
        name: shopName.trim(),
        slug: cleanSlug,
        trialEndsAt,
        daysRemaining: trialDays,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Public Active Plans & Pricing
publicRouter.get('/plans', async (_req, res) => {
  try {
    const client = getClient();
    const result = await client.execute(`SELECT * FROM saas_plans WHERE is_active = 1 ORDER BY price_inr ASC`);

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        priceInr: Number(row.price_inr),
        billingCycle: row.billing_cycle,
        trialDays: Number(row.trial_days),
        maxSeats: Number(row.max_seats),
        features: JSON.parse(String(row.features_json || '[]')),
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Public Platform Info & Settings (Payee details, trial policy)
publicRouter.get('/settings', async (_req, res) => {
  try {
    const client = getClient();
    const result = await client.execute(`SELECT key, value FROM saas_platform_settings`);

    const map: Record<string, string> = {};
    for (const row of result.rows) {
      map[String(row.key)] = String(row.value);
    }

    res.json({
      success: true,
      data: {
        annualPriceInr: Number(map['payment.annual_price_inr'] || 14999),
        payeeName: map['payment.payee_name'] || 'K-Connect Cloud SaaS Technologies',
        upiId: map['payment.upi_id'] || 'ktech@upi',
        trialDurationDays: Number(map['trial.duration_days'] || 14),
        supportPhone: map['support.phone'] || '+91 98422 00000',
        supportEmail: map['support.email'] || 'billing@kconnect.cloud',
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. Public Contact Form Submission
publicRouter.post('/contact', validateBody(contactInquirySchema), async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const client = getClient();

    await client.execute({
      sql: `
        INSERT INTO saas_notifications (id, recipient_type, recipient_id, channel, title, message, metadata_json)
        VALUES (?, 'VENDOR_ADMIN', 'VND-ROOT-01', 'IN_APP', ?, ?, ?)
      `,
      args: [
        `inquiry_${Date.now()}`,
        `Contact Inquiry: ${subject}`,
        `From: ${name} (${email}, ${phone || 'No phone'})\n\n${message}`,
        JSON.stringify({ name, email, phone, subject, message, receivedAt: new Date().toISOString() }),
      ],
    });

    res.json({
      success: true,
      message: 'Thank you! Your message has been received. Our team will get back to you shortly.',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. Public Job Status Tracking (Accessed by customer via QR Code or Link)
publicRouter.get('/track/:jobNumber', async (req, res) => {
  try {
    const { jobNumber } = req.params;
    const client = getClient();

    const cleanJobNo = jobNumber.trim().toUpperCase();

    const result = await client.execute({
      sql: `
        SELECT 
          j.job_number,
          j.current_status,
          j.service_category,
          j.reported_issue,
          j.estimated_cost,
          j.advance_deposit,
          j.promised_delivery_date,
          j.actual_delivery_date,
          j.created_at,
          d.equipment_type,
          d.brand as device_brand,
          d.model_name as device_model,
          s.name as shop_name,
          s.phone as shop_phone,
          s.address as shop_address,
          s.city as shop_city,
          s.upi_id as shop_upi
        FROM service_jobs j
        JOIN devices d ON j.device_id = d.id
        JOIN shops s ON j.shop_id = s.id
        WHERE UPPER(j.job_number) = ? OR j.id = ?
      `,
      args: [cleanJobNo, cleanJobNo],
    });

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Job ticket not found. Please verify the ticket number.' });
      return;
    }

    const row = result.rows[0] as Record<string, unknown>;

    // Fetch status progression history
    const historyRes = await client.execute({
      sql: `SELECT new_status, reason_or_notes, created_at 
            FROM job_status_history 
            WHERE job_id = (SELECT id FROM service_jobs WHERE UPPER(job_number) = ? LIMIT 1)
            ORDER BY created_at ASC`,
      args: [cleanJobNo],
    });

    res.json({
      success: true,
      data: {
        jobNumber: row.job_number,
        currentStatus: row.current_status,
        serviceCategory: row.service_category,
        reportedIssue: row.reported_issue,
        estimatedCost: Number(row.estimated_cost || 0),
        advanceDeposit: Number(row.advance_deposit || 0),
        promisedDeliveryDate: row.promised_delivery_date,
        createdAt: row.created_at,
        device: {
          equipmentType: row.equipment_type,
          brand: row.device_brand,
          modelName: row.device_model,
        },
        shop: {
          name: row.shop_name,
          phone: row.shop_phone,
          address: `${row.shop_address}, ${row.shop_city}`,
          upiId: row.shop_upi,
        },
        timeline: historyRes.rows.map((h) => ({
          status: (h as Record<string, unknown>).new_status,
          notes: (h as Record<string, unknown>).reason_or_notes,
          timestamp: (h as Record<string, unknown>).created_at,
        })),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
