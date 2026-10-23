import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { createInvoiceSchema } from '../validation/schemas.ts';

export const billingRouter = Router();

billingRouter.use(authenticateToken);

// ── List Invoices ─────────────────────────────────────────────────
billingRouter.get('/invoices', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        i.*,
        c.full_name as customer_name,
        c.primary_phone as customer_phone,
        j.job_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN service_jobs j ON i.service_job_id = j.id
      WHERE i.shop_id = ?
    `;

    const args: (string | number)[] = [shopId];
    if (status && status !== 'ALL') {
      query += ` AND i.payment_status = ?`;
      args.push(String(status));
    }

    query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    args.push(Number(limit), Number(offset));

    const result = await client.execute({ sql: query, args });

    res.json({ success: true, data: result.rows });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── List Quotations (Missing Endpoint Implemented) ────────────────
billingRouter.get('/quotations', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        q.*,
        j.job_number,
        j.reported_issue,
        c.id as customer_id,
        c.full_name as customer_name,
        c.primary_phone as customer_phone,
        u.full_name as created_by_name
      FROM quotations q
      JOIN service_jobs j ON q.job_id = j.id AND j.shop_id = q.shop_id
      JOIN customers c ON j.customer_id = c.id AND c.shop_id = q.shop_id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.shop_id = ?
    `;

    const args: (string | number)[] = [shopId];
    if (status && status !== 'ALL') {
      query += ` AND q.status = ?`;
      args.push(String(status));
    }

    query += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`;
    args.push(Number(limit), Number(offset));

    const result = await client.execute({ sql: query, args });

    res.json({
      success: true,
      data: result.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id,
          quotationNumber: row.quotation_number,
          jobId: row.job_id,
          jobNumber: row.job_number,
          reportedIssue: row.reported_issue,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          partsSubtotal: Number(row.parts_subtotal || 0),
          laborSubtotal: Number(row.labor_subtotal || 0),
          discountAmount: Number(row.discount_amount || 0),
          taxAmount: Number(row.tax_amount || 0),
          totalAmount: Number(row.total_amount || 0),
          status: row.status,
          validityDays: Number(row.validity_days || 7),
          createdByName: row.created_by_name || 'Staff',
          createdAt: row.created_at,
        };
      }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── Create Invoice with Multi-Tenant Integrity & GST Breakdown ────
billingRouter.post('/invoices', validateBody(createInvoiceSchema), async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const {
      customerId,
      serviceJobId,
      isGstInvoice = true,
      customerGstin,
      items = [],
      advanceAdjusted = 0,
      payments = [],
    } = req.body;

    // Verify customer exists and belongs to current tenant shop
    const custRes = await client.execute({
      sql: `SELECT id FROM customers WHERE id = ? AND shop_id = ?`,
      args: [customerId, shopId],
    });
    if (custRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Customer not found in current shop organization.' });
      return;
    }

    // If serviceJobId is provided, verify it belongs to current tenant shop
    if (serviceJobId) {
      const jobRes = await client.execute({
        sql: `SELECT id FROM service_jobs WHERE id = ? AND shop_id = ?`,
        args: [serviceJobId, shopId],
      });
      if (jobRes.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Service job not found in current shop organization.' });
        return;
      }
    }

    // Generate Invoice Number: INV-YYYY-XXXXX atomically
    const year = new Date().getFullYear();
    const counterKey = `sequence.invoice_counter_${year}`;

    await client.execute({
      sql: `INSERT OR IGNORE INTO shop_settings (shop_id, key, value, category) VALUES (?, ?, '0', 'SEQUENCE')`,
      args: [shopId, counterKey],
    });

    const seqRes = await client.execute({
      sql: `UPDATE shop_settings 
            SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = CURRENT_TIMESTAMP
            WHERE shop_id = ? AND key = ?
            RETURNING value;`,
      args: [shopId, counterKey],
    });

    const nextVal = seqRes.rows.length > 0 ? Number((seqRes.rows[0] as Record<string, unknown>).value) : 1;
    const invoiceNumber = `INV-${year}-${String(nextVal).padStart(5, '0')}`;
    const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    let subtotalParts = 0;
    let subtotalLabor = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    // Process line items
    const processedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const discount = Number(item.discount) || 0;
      const lineSubtotal = qty * unitPrice - discount;
      const taxRate = isGstInvoice ? Number(item.taxRate || 18.0) : 0;
      const taxAmount = (lineSubtotal * taxRate) / 100;
      const total = lineSubtotal + taxAmount;

      if (item.itemType === 'LABOR') {
        subtotalLabor += lineSubtotal;
      } else {
        subtotalParts += lineSubtotal;
      }

      totalDiscount += discount;
      totalTax += taxAmount;
      grandTotal += total;

      return {
        id: `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...item,
        quantity: qty,
        unitPrice,
        discount,
        taxRate,
        taxAmount,
        totalAmount: total,
      };
    });

    // Indian GST Breakdown (Check shop vs customer state / GSTIN)
    const shopRes = await client.execute({
      sql: `SELECT gstin, state FROM shops WHERE id = ?`,
      args: [shopId],
    });
    const shopRow = (shopRes.rows[0] || {}) as Record<string, unknown>;
    const shopGstin = String(shopRow.gstin || '').trim();
    const shopStateCode = shopGstin ? shopGstin.slice(0, 2) : '33'; // Default Tamil Nadu (33)

    const custGstinClean = customerGstin ? String(customerGstin).trim().toUpperCase() : null;
    const custStateCode = custGstinClean ? custGstinClean.slice(0, 2) : null;

    const isInterState = Boolean(custStateCode && shopStateCode && custStateCode !== shopStateCode);

    let cgstAmount = 0.0;
    let sgstAmount = 0.0;
    let igstAmount = 0.0;

    if (isGstInvoice) {
      if (isInterState) {
        igstAmount = totalTax;
      } else {
        cgstAmount = totalTax / 2;
        sgstAmount = totalTax / 2;
      }
    }

    // Calculate Payments
    const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) + Number(advanceAdjusted || 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);
    const paymentStatus = balanceDue <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

    // 1. Insert Invoice Master
    await client.execute({
      sql: `INSERT INTO invoices (
              id, shop_id, invoice_number, invoice_type, customer_id, service_job_id,
              is_gst_invoice, customer_gstin, subtotal_parts, subtotal_labor,
              discount_amount, cgst_amount, sgst_amount, igst_amount, total_amount,
              advance_adjusted, amount_paid, balance_due, payment_status, created_by
            ) VALUES (?, ?, ?, 'SERVICE_REPAIR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        invoiceId,
        shopId,
        invoiceNumber,
        customerId,
        serviceJobId || null,
        isGstInvoice ? 1 : 0,
        customerGstin ? customerGstin.trim().toUpperCase() : null,
        subtotalParts,
        subtotalLabor,
        totalDiscount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        Number(advanceAdjusted || 0),
        totalPaid,
        balanceDue,
        paymentStatus,
        req.user!.userId,
      ],
    });

    // 2. Insert Invoice Items
    for (const itm of processedItems) {
      await client.execute({
        sql: `INSERT INTO invoice_items (
                id, shop_id, invoice_id, item_type, item_ref_id, description,
                hsn_sac_code, quantity, unit_price, discount, tax_rate, tax_amount, total_amount
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          itm.id,
          shopId,
          invoiceId,
          itm.itemType || 'SERVICE',
          itm.itemRefId || null,
          itm.description,
          itm.hsnSacCode || (itm.itemType === 'LABOR' ? '9987' : '8471'),
          itm.quantity,
          itm.unitPrice,
          itm.discount,
          itm.taxRate,
          itm.taxAmount,
          itm.totalAmount,
        ],
      });
    }

    // 3. Insert Payment Records
    for (const p of payments) {
      const receiptNum = `RCP-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
      await client.execute({
        sql: `INSERT INTO payments (
                id, shop_id, receipt_number, invoice_id, service_job_id, customer_id,
                payment_type, payment_mode, transaction_reference, amount, received_by
              ) VALUES (?, ?, ?, ?, ?, ?, 'INVOICE_SETTLEMENT', ?, ?, ?, ?)`,
        args: [
          `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          shopId,
          receiptNum,
          invoiceId,
          serviceJobId || null,
          customerId,
          p.paymentMode || 'CASH',
          p.transactionRef || null,
          Number(p.amount),
          req.user!.userId,
        ],
      });
    }

    res.json({
      success: true,
      data: {
        invoiceId,
        invoiceNumber,
        totalAmount: grandTotal,
        balanceDue,
        paymentStatus,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});
