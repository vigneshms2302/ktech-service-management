import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { z } from 'zod';

export const subscriptionRouter = Router();

subscriptionRouter.use(authenticateToken);

const submitPaymentClaimSchema = z.object({
  upiTransactionId: z
    .string()
    .min(6, 'UPI Transaction / UTR ID must be at least 6 characters')
    .max(64, 'UPI Transaction ID cannot exceed 64 characters'),
  customerNotes: z.string().max(500).optional(),
  evidenceFilePath: z.string().max(255).optional(),
  planCode: z.string().default('PRO_ANNUAL'),
});

/**
 * Generate sequential payment claim reference: PAY-YYYY-00001
 */
async function generatePaymentClaimNumber(): Promise<string> {
  const client = getClient();
  const year = new Date().getFullYear();
  const countRes = await client.execute({
    sql: `SELECT COUNT(*) as count FROM saas_payment_claims WHERE id LIKE ?`,
    args: [`PAY-${year}-%`],
  });
  const count = Number((countRes.rows[0] as Record<string, unknown>).count) + 1;
  return `PAY-${year}-${String(count).padStart(5, '0')}`;
}

// 1. Get Current Shop Subscription Status & Payment Details
subscriptionRouter.get('/status', async (req, res) => {
  try {
    const client = getClient();
    const shopId = req.user!.shopId;

    // Fetch shop details
    const shopRes = await client.execute({
      sql: `SELECT id, name, slug, status, subscription_plan, subscription_ends_at FROM shops WHERE id = ?`,
      args: [shopId],
    });

    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found.' });
      return;
    }

    const shop = shopRes.rows[0] as Record<string, unknown>;

    // Fetch subscription record
    const subRes = await client.execute({
      sql: `
        SELECT s.*, p.name as plan_name, p.code as plan_code, p.price_inr, p.features_json, p.trial_days
        FROM saas_subscriptions s
        JOIN saas_plans p ON s.plan_id = p.id
        WHERE s.shop_id = ?
        ORDER BY s.created_at DESC LIMIT 1
      `,
      args: [shopId],
    });

    let subscription: Record<string, unknown> | null = null;
    let trialDaysRemaining = 0;
    let daysRemaining = 0;

    if (subRes.rows.length > 0) {
      const sub = subRes.rows[0] as Record<string, unknown>;
      const now = new Date().getTime();

      if (sub.trial_ends_at) {
        const trialEnd = new Date(String(sub.trial_ends_at)).getTime();
        trialDaysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
      }

      if (sub.current_period_ends_at) {
        const periodEnd = new Date(String(sub.current_period_ends_at)).getTime();
        daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)));
      }

      subscription = {
        id: sub.id,
        status: sub.status,
        planName: sub.plan_name,
        planCode: sub.plan_code,
        priceInr: Number(sub.price_inr || 14999),
        features: JSON.parse(String(sub.features_json || '[]')),
        trialStartsAt: sub.trial_starts_at,
        trialEndsAt: sub.trial_ends_at,
        trialDaysRemaining,
        currentPeriodStartsAt: sub.current_period_starts_at,
        currentPeriodEndsAt: sub.current_period_ends_at,
        daysRemaining,
        isComplimentary: Boolean(sub.is_complimentary),
        complimentaryReason: sub.complimentary_reason,
      };
    }

    // Fetch latest pending claim if any
    const claimRes = await client.execute({
      sql: `SELECT * FROM saas_payment_claims WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [shopId],
    });

    const latestClaim = claimRes.rows.length > 0 ? (claimRes.rows[0] as Record<string, unknown>) : null;

    // Fetch platform payment settings
    const settingsRes = await client.execute(`SELECT key, value FROM saas_platform_settings`);
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      settingsMap[String(row.key)] = String(row.value);
    }

    res.json({
      success: true,
      data: {
        shop: {
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          status: shop.status,
          subscriptionEndsAt: shop.subscription_ends_at,
        },
        subscription,
        latestClaim: latestClaim
          ? {
              id: latestClaim.id,
              upiTransactionId: latestClaim.upi_transaction_id,
              amountInr: Number(latestClaim.amount_inr),
              status: latestClaim.status,
              createdAt: latestClaim.created_at,
              reviewedAt: latestClaim.reviewed_at,
              rejectionReason: latestClaim.rejection_reason,
            }
          : null,
        paymentConfig: {
          upiId: settingsMap['payment.upi_id'] || 'ktech@upi',
          payeeName: settingsMap['payment.payee_name'] || 'K-Connect Cloud SaaS Technologies',
          annualPriceInr: Number(settingsMap['payment.annual_price_inr'] || 14999),
          qrImageUrl: settingsMap['payment.qr_image_url'] || '/storage/gpay_qr_code.png',
          instructions:
            settingsMap['payment.instructions'] ||
            'Scan our official GPay QR code, make payment, and enter your UPI transaction reference below.',
          supportPhone: settingsMap['support.phone'] || '+91 98422 00000',
          supportEmail: settingsMap['support.email'] || 'billing@kconnect.cloud',
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. Submit GPay / UPI Payment Claim
subscriptionRouter.post('/claim', validateBody(submitPaymentClaimSchema), async (req, res) => {
  try {
    const { upiTransactionId, customerNotes, evidenceFilePath, planCode } = req.body;
    const client = getClient();
    const shopId = req.user!.shopId;
    const userId = req.user!.userId;

    const cleanUpiRef = upiTransactionId.trim().toUpperCase();

    // Check duplicate transaction ID across all claims
    const dupCheck = await client.execute({
      sql: `SELECT id, shop_id, status FROM saas_payment_claims WHERE upi_transaction_id = ?`,
      args: [cleanUpiRef],
    });

    if (dupCheck.rows.length > 0) {
      res.status(400).json({
        success: false,
        error: `UPI Transaction reference "${cleanUpiRef}" has already been submitted. Please check your transaction record.`,
      });
      return;
    }

    // Fetch plan details
    const planRes = await client.execute({
      sql: `SELECT id, name, price_inr FROM saas_plans WHERE code = ? AND is_active = 1`,
      args: [planCode],
    });

    if (planRes.rows.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid or inactive subscription plan.' });
      return;
    }

    const plan = planRes.rows[0] as Record<string, unknown>;
    const claimId = await generatePaymentClaimNumber();

    // Insert payment claim
    await client.execute({
      sql: `
        INSERT INTO saas_payment_claims (
          id, shop_id, user_id, plan_id, amount_inr, currency, payment_method,
          upi_transaction_id, evidence_file_path, customer_notes, status
        ) VALUES (?, ?, ?, ?, ?, 'INR', 'GPAY_UPI', ?, ?, ?, 'PENDING')
      `,
      args: [
        claimId,
        shopId,
        userId,
        String(plan.id),
        Number(plan.price_inr),
        cleanUpiRef,
        evidenceFilePath || null,
        customerNotes ? customerNotes.trim() : null,
      ],
    });

    // Notify Super-Admin via notification queue
    await client.execute({
      sql: `
        INSERT INTO saas_notifications (id, recipient_type, recipient_id, channel, title, message)
        VALUES (?, 'VENDOR_ADMIN', 'VND-ROOT-01', 'IN_APP', ?, ?)
      `,
      args: [
        `notif_${Date.now()}`,
        `New Payment Claim: ${claimId}`,
        `Shop ${shopId} submitted UPI claim ${cleanUpiRef} for ₹${plan.price_inr}. Pending manual verification.`,
      ],
    });

    res.json({
      success: true,
      message: 'Payment claim submitted successfully. The Super Admin will verify receipt and activate your annual licence.',
      data: {
        claimId,
        upiTransactionId: cleanUpiRef,
        amountInr: Number(plan.price_inr),
        status: 'PENDING',
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 3. List Past Payment Claims for Current Shop
subscriptionRouter.get('/claims', async (req, res) => {
  try {
    const client = getClient();
    const shopId = req.user!.shopId;

    const result = await client.execute({
      sql: `
        SELECT c.*, p.name as plan_name, p.code as plan_code
        FROM saas_payment_claims c
        JOIN saas_plans p ON c.plan_id = p.id
        WHERE c.shop_id = ?
        ORDER BY c.created_at DESC
      `,
      args: [shopId],
    });

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        planName: row.plan_name,
        amountInr: Number(row.amount_inr),
        upiTransactionId: row.upi_transaction_id,
        status: row.status,
        customerNotes: row.customer_notes,
        reviewedAt: row.reviewed_at,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
