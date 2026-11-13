import { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { getClient } from '../db/database.ts';
import { hashPassword, generateToken } from '../middleware/auth.ts';
import { encryptSecret } from '../security/crypto.ts';
import { hashResetSecret, timingSafeEqualHex, normalizePhoneDigits } from '../security/passwordUtils.ts';
import { sendRegistrationVerificationEmail, maskEmailAddress } from '../services/emailService.ts';
import { sendRegistrationSmsOtp } from '../services/smsService.ts';
import { sendWhatsAppOtp } from '../services/whatsappService.ts';
import { validateBody } from '../middleware/validate.ts';
import { z } from 'zod';

export const publicRouter = Router();

function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 4) return phone;
  const last4 = digits.slice(-4);
  return `${digits.slice(0, 2)}******${last4}`;
}

const sendVerificationSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().min(10, 'Valid 10-digit mobile number required'),
  shopName: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
  slug: z.string().trim().optional(),
});

const verifyCodeSchema = z.object({
  verificationId: z.string().trim().min(1, 'Verification ID is required'),
  emailOtp: z.string().trim().regex(/^\d{6}$/, 'Email confirmation code must be 6 digits').optional(),
  phoneOtp: z.string().trim().regex(/^\d{6}$/, 'Mobile OTP must be 6 digits').optional(),
});

const publicRegistrationSchema = z.object({
  shopName: z.string().trim().min(2, 'Shop name must be at least 2 characters').max(100),
  slug: z
    .string()
    .trim()
    .min(3, 'Shop URL handle must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9-_]+$/i, 'Slug must contain only alphanumeric characters, dashes, or underscores'),
  ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters').max(100),
  phone: z.string().trim().min(10, 'Valid 10-digit mobile number required').max(20),
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Email address is required').email('Please enter a valid email address')
  ),
  username: z.string().trim().min(3).max(50).default('admin'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  city: z.string().trim().min(2, 'City is required').max(100).default('Coimbatore'),
  state: z.string().trim().min(2, 'State is required').max(100).default('Tamil Nadu'),
  pincode: z.preprocess(
    (val) => (val === '' || val === null ? undefined : typeof val === 'string' ? val.trim() : val),
    z.string().max(10).optional()
  ),
  verificationId: z.string().trim().optional(),
  emailOtp: z.string().trim().optional(),
  phoneOtp: z.string().trim().optional(),
});

const contactInquirySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
  subject: z.string().min(2).max(150),
  message: z.string().min(10).max(2000),
});

// 0. Live Availability & Duplication Pre-Check (For Real-Time Validation on /signup)
publicRouter.get('/check-availability', async (req, res) => {
  try {
    const { slug, email, phone } = req.query;
    const client = getClient();
    const result: {
      slug?: { available: boolean; message?: string };
      email?: { available: boolean; message?: string };
      phone?: { available: boolean; message?: string };
    } = {};

    if (slug) {
      const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const shopId = `shop_${cleanSlug}`;
      if (cleanSlug.length < 3) {
        result.slug = { available: false, message: 'URL handle must be at least 3 characters.' };
      } else {
        const checkRes = await client.execute({
          sql: `SELECT id FROM shops WHERE slug = ? OR id = ?`,
          args: [cleanSlug, shopId],
        });
        if (checkRes.rows.length > 0) {
          result.slug = { available: false, message: `Shop handle "${cleanSlug}" is already taken.` };
        } else {
          result.slug = { available: true, message: `"${cleanSlug}" is available!` };
        }
      }
    }

    if (email && String(email).trim()) {
      const cleanEmail = String(email).trim().toLowerCase();
      const emailRes = await client.execute({
        sql: `SELECT id, name FROM shops WHERE LOWER(email) = ? LIMIT 1`,
        args: [cleanEmail],
      });
      if (emailRes.rows.length > 0) {
        result.email = { available: false, message: `Email "${cleanEmail}" is already registered to a shop.` };
      } else {
        result.email = { available: true, message: 'Email is available' };
      }
    }

    if (phone && String(phone).trim()) {
      const cleanDigits = String(phone).replace(/[^0-9]/g, '');
      if (cleanDigits.length >= 10) {
        const last10 = cleanDigits.slice(-10);
        const phoneRes = await client.execute({
          sql: `SELECT id, name FROM shops WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? LIMIT 1`,
          args: [`%${last10}`],
        });
        if (phoneRes.rows.length > 0) {
          result.phone = { available: false, message: `Mobile number is already registered with shop "${phoneRes.rows[0].name}".` };
        } else {
          result.phone = { available: true, message: 'Mobile number is available' };
        }
      }
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 1. Dispatch Email Confirmation Code + Mobile OTP for Shop Registration
publicRouter.post('/send-verification', validateBody(sendVerificationSchema), async (req, res) => {
  try {
    const { email, phone, shopName = 'Your Workshop', ownerName = 'Shop Owner', slug } = req.body;
    const client = getClient();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhoneDigits = normalizePhoneDigits(phone);
    const last10Digits = cleanPhoneDigits.slice(-10);

    // 1. Check email uniqueness (1 email per shop)
    const checkEmail = await client.execute({
      sql: `SELECT id, name FROM shops WHERE LOWER(email) = ? LIMIT 1`,
      args: [cleanEmail],
    });
    if (checkEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'email',
        error: `Email "${cleanEmail}" is already registered to shop "${checkEmail.rows[0].name}". Each shop must use a unique email address.`,
      });
    }

    // 2. Check mobile uniqueness (1 mobile per shop)
    const checkPhone = await client.execute({
      sql: `SELECT id, name FROM shops WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? LIMIT 1`,
      args: [`%${last10Digits}`],
    });
    if (checkPhone.rows.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'phone',
        error: `Mobile number is already registered to shop "${checkPhone.rows[0].name}". Each shop must use a unique mobile number.`,
      });
    }

    // 3. Check slug uniqueness if provided
    if (slug && slug.trim()) {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const checkSlug = await client.execute({
        sql: `SELECT id FROM shops WHERE slug = ? OR id = ? LIMIT 1`,
        args: [cleanSlug, `shop_${cleanSlug}`],
      });
      if (checkSlug.rows.length > 0) {
        return res.status(409).json({
          success: false,
          field: 'slug',
          error: `Shop handle "${cleanSlug}" is already taken.`,
        });
      }
    }

    const emailOtp = crypto.randomInt(100000, 1000000).toString();
    const phoneOtp = crypto.randomInt(100000, 1000000).toString();
    const emailHash = hashResetSecret(emailOtp);
    const phoneHash = hashResetSecret(phoneOtp);
    const encryptedEmailOtp = encryptSecret(emailOtp);
    const encryptedPhoneOtp = encryptSecret(phoneOtp);
    const verificationId = `reg_v_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const expiresInMinutes = 15;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';

    await client.execute({
      sql: `
        INSERT INTO registration_verifications (
          id, email, phone, email_otp_hash, phone_otp_hash,
          encrypted_email_otp, encrypted_phone_otp, status,
          expires_at, attempts, requested_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 0, ?)
      `,
      args: [
        verificationId,
        cleanEmail,
        cleanPhoneDigits,
        emailHash,
        phoneHash,
        encryptedEmailOtp,
        encryptedPhoneOtp,
        expiresAt,
        ipAddress,
      ],
    });

    // Send email confirmation code via transactional email service
    await sendRegistrationVerificationEmail({
      to: cleanEmail,
      recipientName: ownerName,
      shopName,
      otp: emailOtp,
      expiresInMinutes,
    });

    // Send mobile SMS / WhatsApp OTP
    await Promise.allSettled([
      sendRegistrationSmsOtp({
        toPhone: phone,
        recipientName: ownerName,
        shopName,
        otp: phoneOtp,
        expiresInMinutes,
      }),
      sendWhatsAppOtp({
        toPhone: phone,
        recipientName: ownerName,
        shopName,
        otp: phoneOtp,
        expiresInMinutes,
      }),
    ]);

    const maskedEmail = maskEmailAddress(cleanEmail);
    const maskedPhone = maskPhoneNumber(phone);

    res.json({
      success: true,
      data: {
        verificationId,
        maskedEmail,
        maskedPhone,
        expiresInMinutes,
        devEmailOtp: process.env.NODE_ENV !== 'production' ? emailOtp : undefined,
        devPhoneOtp: process.env.NODE_ENV !== 'production' ? phoneOtp : undefined,
      },
      message: `Confirmation codes dispatched! Check ${maskedEmail} for your email code and ${maskedPhone} for your mobile OTP.`,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Verify Registration Codes (Email + Phone)
publicRouter.post('/verify-code', validateBody(verifyCodeSchema), async (req, res) => {
  try {
    const { verificationId, emailOtp, phoneOtp } = req.body;
    const client = getClient();

    const verifRes = await client.execute({
      sql: `SELECT * FROM registration_verifications WHERE id = ? LIMIT 1`,
      args: [verificationId],
    });
    if (verifRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Verification session not found.' });
    }

    const verif = verifRes.rows[0] as Record<string, unknown>;
    if (verif.status === 'CONSUMED') {
      return res.status(400).json({ success: false, error: 'This verification session has already been used.' });
    }
    if (new Date(String(verif.expires_at)).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'Verification session expired. Please request a new code.' });
    }
    if (Number(verif.attempts || 0) >= 5) {
      return res.status(429).json({ success: false, error: 'Too many failed verification attempts. Please request a new code.' });
    }

    let isEmailValid = true;
    let isPhoneValid = true;

    if (emailOtp) {
      const emailHash = hashResetSecret(emailOtp.trim());
      isEmailValid = timingSafeEqualHex(emailHash, String(verif.email_otp_hash));
    }
    if (phoneOtp) {
      const phoneHash = hashResetSecret(phoneOtp.trim());
      isPhoneValid = timingSafeEqualHex(phoneHash, String(verif.phone_otp_hash));
    }

    if (!isEmailValid || !isPhoneValid) {
      await client.execute({
        sql: `UPDATE registration_verifications SET attempts = attempts + 1 WHERE id = ?`,
        args: [verificationId],
      });
      return res.status(400).json({
        success: false,
        error: !isEmailValid && !isPhoneValid
          ? 'Both codes are invalid.'
          : !isEmailValid
            ? 'Invalid email confirmation code.'
            : 'Invalid mobile OTP.',
      });
    }

    await client.execute({
      sql: `UPDATE registration_verifications SET status = 'VERIFIED' WHERE id = ?`,
      args: [verificationId],
    });

    res.json({ success: true, verified: true, message: 'Codes verified successfully.' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. Self-Service Customer Registration & Instant 14-Day Free Trial Provisioning
publicRouter.post('/register', validateBody(publicRegistrationSchema), async (req, res) => {
  try {
    const { shopName, slug, ownerName, phone, email, username, password, city, state, pincode, verificationId, emailOtp, phoneOtp } = req.body;
    const client = getClient();

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const shopId = `shop_${cleanSlug}`;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhoneDigits = normalizePhoneDigits(phone);
    const last10Digits = cleanPhoneDigits.slice(-10);

    // 1. Verify slug uniqueness
    const checkSlug = await client.execute({
      sql: `SELECT id, name FROM shops WHERE slug = ? OR id = ? LIMIT 1`,
      args: [cleanSlug, shopId],
    });
    if (checkSlug.rows.length > 0) {
      res.status(400).json({
        success: false,
        field: 'slug',
        error: `Shop address URL "${cleanSlug}" is already taken. Please choose another shop handle.`,
      });
      return;
    }

    // 2. Verify email uniqueness (Strict 1 email per shop rule)
    const checkEmail = await client.execute({
      sql: `SELECT id, name FROM shops WHERE LOWER(email) = ? LIMIT 1`,
      args: [cleanEmail],
    });
    if (checkEmail.rows.length > 0) {
      res.status(409).json({
        success: false,
        field: 'email',
        error: `Email "${cleanEmail}" is already registered to shop "${checkEmail.rows[0].name}". Each shop must use a unique email.`,
      });
      return;
    }

    // 3. Verify mobile number uniqueness (Strict 1 mobile per shop rule)
    const checkPhone = await client.execute({
      sql: `SELECT id, name FROM shops WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE ? LIMIT 1`,
      args: [`%${last10Digits}`],
    });
    if (checkPhone.rows.length > 0) {
      res.status(409).json({
        success: false,
        field: 'phone',
        error: `Mobile number is already registered to shop "${checkPhone.rows[0].name}". Each shop must use a unique mobile number.`,
      });
      return;
    }

    // 4. Verify OTPs if verificationId is provided
    if (verificationId) {
      const verifRes = await client.execute({
        sql: `SELECT * FROM registration_verifications WHERE id = ? LIMIT 1`,
        args: [verificationId],
      });
      if (verifRes.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Verification session not found. Please request a new verification code.',
        });
        return;
      }
      const verif = verifRes.rows[0] as Record<string, unknown>;
      if (verif.status === 'CONSUMED') {
        res.status(400).json({
          success: false,
          error: 'This verification session has already been used. Please request a new code.',
        });
        return;
      }
      if (new Date(String(verif.expires_at)).getTime() < Date.now()) {
        res.status(400).json({
          success: false,
          error: 'Verification session expired. Please request a new code.',
        });
        return;
      }

      if (String(verif.email).toLowerCase() !== cleanEmail || String(verif.phone) !== cleanPhoneDigits) {
        res.status(400).json({
          success: false,
          error: 'Verification session contact details do not match the registration email and mobile number.',
        });
        return;
      }

      if (verif.status !== 'VERIFIED') {
        if (!emailOtp || !phoneOtp) {
          res.status(400).json({
            success: false,
            error: 'Both email confirmation code and mobile OTP are required to complete registration.',
          });
          return;
        }

        const emailHash = hashResetSecret(emailOtp.trim());
        const phoneHash = hashResetSecret(phoneOtp.trim());
        const isEmailMatch = timingSafeEqualHex(emailHash, String(verif.email_otp_hash));
        const isPhoneMatch = timingSafeEqualHex(phoneHash, String(verif.phone_otp_hash));

        if (!isEmailMatch || !isPhoneMatch) {
          await client.execute({
            sql: `UPDATE registration_verifications SET attempts = attempts + 1 WHERE id = ?`,
            args: [verificationId],
          });
          const errorMsg = !isEmailMatch && !isPhoneMatch
            ? 'Both email confirmation code and mobile OTP are incorrect.'
            : !isEmailMatch
              ? 'Invalid email confirmation code.'
              : 'Invalid mobile OTP.';
          res.status(400).json({ success: false, error: errorMsg });
          return;
        }
      }

      await client.execute({
        sql: `UPDATE registration_verifications SET status = 'CONSUMED' WHERE id = ?`,
        args: [verificationId],
      });
    }

    // 14-day free trial timestamp calculation
    const trialDays = 14;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create Shop Record (with mandatory email & phone)
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
        cleanEmail,
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

    // 3. Create Shop Owner Account (ROLE_OWNER) with both phone and email attached
    const ownerUserId = `usr_${cleanSlug}_owner`;
    const cleanUsername = username ? username.trim().toLowerCase() : 'admin';
    const passwordHash = hashPassword(password);
    const encryptedRecovery = encryptSecret(password);
    const pin = '1234'; // Default initial quick PIN for shop POS

    await client.execute({
      sql: `
        INSERT INTO users (id, shop_id, username, password_hash, encrypted_recovery_password, pin_code, full_name, role_id, phone, email, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ROLE_OWNER', ?, ?, 1)
      `,
      args: [ownerUserId, shopId, cleanUsername, passwordHash, encryptedRecovery, pin, ownerName.trim(), phone.trim(), cleanEmail],
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
        `New shop "${shopName.trim()}" (slug: ${cleanSlug}) started a 14-day free trial. Owner: ${ownerName.trim()} (${phone.trim()} / ${cleanEmail}).`,
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

// 7. Desktop Application Binary Download & Info
const GITHUB_RELEASE_URL =
  process.env.DESKTOP_DOWNLOAD_URL ||
  'https://github.com/vigneshms2302/ktech-service-management/releases/latest/download/K-Connect-Portable.exe';

publicRouter.get(['/download/desktop', '/download/desktop-app'], (_req, res) => {
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'downloads', 'K-Connect-Portable.exe'),
    path.join(process.cwd(), 'release', 'K-Connect-Portable.exe'),
  ];

  for (const exePath of candidatePaths) {
    if (fs.existsSync(exePath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="K-Connect-Portable.exe"');
      res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
      return res.sendFile(exePath);
    }
  }

  // Graceful fallback to official release download URL
  res.redirect(302, GITHUB_RELEASE_URL);
});

publicRouter.get('/download/info', (_req, res) => {
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'downloads', 'K-Connect-Portable.exe'),
    path.join(process.cwd(), 'release', 'K-Connect-Portable.exe'),
  ];

  let localFileSize = 76193998; // Default build size ~72.6 MB
  let hasLocal = false;

  for (const exePath of candidatePaths) {
    if (fs.existsSync(exePath)) {
      try {
        const stat = fs.statSync(exePath);
        localFileSize = stat.size;
        hasLocal = true;
        break;
      } catch {
        // use default
      }
    }
  }

  res.json({
    success: true,
    data: {
      appName: 'K-Connect',
      version: '1.2.0',
      fileName: 'K-Connect-Portable.exe',
      platform: 'Windows 10 / 11 (64-bit)',
      fileSizeBytes: localFileSize,
      fileSizeFormatted: `${(localFileSize / (1024 * 1024)).toFixed(1)} MB`,
      hasLocalBinary: hasLocal,
      directUrl: '/downloads/K-Connect-Portable.exe',
      downloadUrl: '/api/public/download/desktop',
      githubReleaseUrl: GITHUB_RELEASE_URL,
    },
  });
});
