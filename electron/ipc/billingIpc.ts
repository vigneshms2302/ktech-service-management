import { ipcMain } from 'electron';
import type { InValue } from '@libsql/client';
import { getClient, logAudit } from '../db/database.ts';
import { getActiveSession } from './authIpc.ts';

export function registerBillingIpc(): void {
  // 1. Generate Numbers
  ipcMain.handle('billing:generateQuotationNumber', async () => {
    try {
      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM quotations`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const quotationNumber = `EST-${currentYear}-${String(count).padStart(5, '0')}`;
      return { success: true, data: { quotationNumber } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('billing:generateInvoiceNumber', async () => {
    try {
      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM invoices`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const invoiceNumber = `INV-${currentYear}-${String(count).padStart(5, '0')}`;
      return { success: true, data: { invoiceNumber } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('billing:generateReceiptNumber', async () => {
    try {
      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM payments`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const receiptNumber = `REC-${currentYear}-${String(count).padStart(5, '0')}`;
      return { success: true, data: { receiptNumber } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 2. List & Get Quotations
  ipcMain.handle('billing:listQuotations', async (_event, params?: {
    jobId?: string;
    status?: string;
    search?: string;
  }) => {
    try {
      const client = getClient();
      const conditions: string[] = [];
      const args: InValue[] = [];

      if (params?.jobId) {
        conditions.push(`q.job_id = ?`);
        args.push(params.jobId);
      }

      if (params?.status) {
        conditions.push(`q.status = ?`);
        args.push(params.status);
      }

      if (params?.search?.trim()) {
        const q = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(LOWER(q.quotation_number) LIKE ? OR LOWER(c.full_name) LIKE ? OR LOWER(sj.job_number) LIKE ?)`);
        args.push(q, q, q);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await client.execute({
        sql: `SELECT q.*, 
                sj.job_number, sj.reported_issue,
                c.full_name as customer_name, c.primary_phone as customer_phone,
                u.full_name as created_by_name,
                qa.approval_status, qa.approved_amount, qa.approval_method, qa.approval_timestamp
              FROM quotations q
              LEFT JOIN service_jobs sj ON q.job_id = sj.id
              LEFT JOIN customers c ON sj.customer_id = c.id
              LEFT JOIN users u ON q.created_by = u.id
              LEFT JOIN quotation_approvals qa ON q.id = qa.quotation_id
              ${whereClause}
              ORDER BY q.created_at DESC`,
        args,
      });

      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('billing:getQuotationById', async (_event, params: { quotationId: string }) => {
    try {
      const client = getClient();
      const qRes = await client.execute({
        sql: `SELECT q.*, 
                sj.job_number, sj.reported_issue,
                c.full_name as customer_name, c.primary_phone as customer_phone, c.customer_code, c.email as customer_email,
                d.equipment_type, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial,
                u.full_name as created_by_name
              FROM quotations q
              LEFT JOIN service_jobs sj ON q.job_id = sj.id
              LEFT JOIN customers c ON sj.customer_id = c.id
              LEFT JOIN devices d ON sj.device_id = d.id
              LEFT JOIN users u ON q.created_by = u.id
              WHERE q.id = ? OR q.quotation_number = ?
              LIMIT 1`,
        args: [params.quotationId, params.quotationId],
      });

      if (qRes.rows.length === 0) return { success: false, error: `Quotation "${params.quotationId}" not found` };

      const quotation = qRes.rows[0] as Record<string, unknown>;
      const quotationId = String(quotation.id);

      const itemsRes = await client.execute({
        sql: `SELECT qi.*, ii.sku as item_sku 
              FROM quotation_items qi
              LEFT JOIN inventory_items ii ON qi.inventory_item_id = ii.id
              WHERE qi.quotation_id = ?`,
        args: [quotationId],
      });

      const approvalRes = await client.execute({
        sql: `SELECT qa.*, u.full_name as recorded_by_name
              FROM quotation_approvals qa
              LEFT JOIN users u ON qa.recorded_by_user_id = u.id
              WHERE qa.quotation_id = ?
              ORDER BY qa.created_at DESC
              LIMIT 1`,
        args: [quotationId],
      });

      return {
        success: true,
        data: {
          quotation,
          items: itemsRes.rows,
          approval: approvalRes.rows.length > 0 ? approvalRes.rows[0] : null,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 3. Create Quotation with Parts & Labor Items
  ipcMain.handle('billing:createQuotation', async (_event, payload: {
    jobId: string;
    validityDays?: number;
    discountAmount?: number;
    items: Array<{
      itemType: 'PART' | 'LABOR' | 'OTHER';
      inventoryItemId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };
      if (!payload.items || payload.items.length === 0) return { success: false, error: 'Quotation items are required' };

      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM quotations`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const quotationNumber = `EST-${currentYear}-${String(count).padStart(5, '0')}`;
      const quotationId = `EST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let partsSubtotal = 0;
      let laborSubtotal = 0;
      let totalTax = 0;

      for (const item of payload.items) {
        const itemTotal = item.quantity * item.unitPrice;
        const taxRate = item.taxRate ?? 18.0;
        const itemTax = (itemTotal * taxRate) / 100;
        totalTax += itemTax;

        if (item.itemType === 'PART') {
          partsSubtotal += itemTotal;
        } else {
          laborSubtotal += itemTotal;
        }
      }

      const discount = payload.discountAmount || 0;
      const grandTotal = Math.max(0, partsSubtotal + laborSubtotal + totalTax - discount);

      const tx = await client.transaction('write');
      try {
        await tx.execute({
          sql: `INSERT INTO quotations (
                  id, quotation_number, job_id, parts_subtotal, labor_subtotal,
                  discount_amount, tax_amount, total_amount, status, validity_days, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
          args: [
            quotationId,
            quotationNumber,
            payload.jobId,
            partsSubtotal,
            laborSubtotal,
            discount,
            totalTax,
            grandTotal,
            payload.validityDays || 7,
            session.id,
          ],
        });

        for (const item of payload.items) {
          const qiId = `QI-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const lineTotal = item.quantity * item.unitPrice;
          await tx.execute({
            sql: `INSERT INTO quotation_items (
                    id, quotation_id, item_type, inventory_item_id, description,
                    quantity, unit_price, tax_rate, total_price
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              qiId,
              quotationId,
              item.itemType,
              item.inventoryItemId || null,
              item.description.trim(),
              item.quantity,
              item.unitPrice,
              item.taxRate ?? 18.0,
              lineTotal,
            ],
          });
        }

        // Update service job estimated_cost and transition to WAITING_FOR_APPROVAL
        await tx.execute({
          sql: `UPDATE service_jobs 
                SET estimated_cost = ?, current_status = 'WAITING_FOR_APPROVAL', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [grandTotal, payload.jobId],
        });

        // Add to job status history
        await tx.execute({
          sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                VALUES (?, ?, 'DIAGNOSIS_COMPLETED', 'WAITING_FOR_APPROVAL', ?, ?)`,
          args: [
            `JSH-${Date.now()}`,
            payload.jobId,
            session.id,
            `Quotation ${quotationNumber} generated for ₹${grandTotal.toFixed(2)}. Awaiting customer approval.`,
          ],
        });

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'QUOTATION_CREATE', 'quotations', quotationId, null, { quotationNumber, grandTotal });

      return { success: true, data: { quotationId, quotationNumber, totalAmount: grandTotal } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 4. Record Explicit Customer Approval
  ipcMain.handle('billing:recordApproval', async (_event, payload: {
    quotationId: string;
    approvalStatus: 'APPROVED' | 'PARTIAL_APPROVAL' | 'REJECTED';
    approvedAmount: number;
    approvalMethod: 'WHATSAPP' | 'PHONE_CALL' | 'IN_PERSON' | 'EMAIL' | 'OTHER';
    customerContactUsed: string;
    notes?: string;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };

      const client = getClient();
      const qRes = await client.execute({ sql: `SELECT * FROM quotations WHERE id = ?`, args: [payload.quotationId] });
      if (qRes.rows.length === 0) return { success: false, error: 'Quotation not found' };

      const quotation = qRes.rows[0] as Record<string, unknown>;
      const approvalId = `QA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const tx = await client.transaction('write');
      try {
        // Record approval
        await tx.execute({
          sql: `INSERT INTO quotation_approvals (
                  id, quotation_id, job_id, approved_amount, approval_status,
                  approval_method, customer_contact_used, recorded_by_user_id,
                  approval_timestamp, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            approvalId,
            payload.quotationId,
            String(quotation.job_id),
            payload.approvedAmount,
            payload.approvalStatus,
            payload.approvalMethod,
            payload.customerContactUsed.trim(),
            session.id,
            now,
            payload.notes?.trim() || null,
          ],
        });

        // Update quotation status
        await tx.execute({
          sql: `UPDATE quotations SET status = ? WHERE id = ?`,
          args: [payload.approvalStatus, payload.quotationId],
        });

        // If approved, transition job to APPROVED / UNDER_REPAIR
        if (payload.approvalStatus === 'APPROVED' || payload.approvalStatus === 'PARTIAL_APPROVAL') {
          await tx.execute({
            sql: `UPDATE service_jobs 
                  SET current_status = 'APPROVED', updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [String(quotation.job_id)],
          });

          await tx.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, 'WAITING_FOR_APPROVAL', 'APPROVED', ?, ?)`,
            args: [
              `JSH-${Date.now()}`,
              String(quotation.job_id),
              session.id,
              `Customer approved quotation ${String(quotation.quotation_number)} (₹${payload.approvedAmount}) via ${payload.approvalMethod}. Contact: ${payload.customerContactUsed}.`,
            ],
          });
        } else if (payload.approvalStatus === 'REJECTED') {
          await tx.execute({
            sql: `UPDATE service_jobs 
                  SET current_status = 'ESTIMATE_REJECTED', updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [String(quotation.job_id)],
          });

          await tx.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, 'WAITING_FOR_APPROVAL', 'ESTIMATE_REJECTED', ?, ?)`,
            args: [
              `JSH-${Date.now()}`,
              String(quotation.job_id),
              session.id,
              `Customer rejected estimate ${String(quotation.quotation_number)}. Reason/Notes: ${payload.notes || 'No reason provided'}.`,
            ],
          });
        }

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'QUOTATION_APPROVAL', 'quotation_approvals', approvalId, null, {
        quotationNumber: quotation.quotation_number,
        status: payload.approvalStatus,
        method: payload.approvalMethod,
      });

      return { success: true, data: { approvalId, status: payload.approvalStatus } };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 5. Invoicing & Payments
  ipcMain.handle('billing:listInvoices', async (_event, params?: {
    paymentStatus?: string;
    customerId?: string;
    search?: string;
  }) => {
    try {
      const client = getClient();
      const conditions: string[] = [];
      const args: InValue[] = [];

      if (params?.customerId) {
        conditions.push(`inv.customer_id = ?`);
        args.push(params.customerId);
      }

      if (params?.paymentStatus) {
        conditions.push(`inv.payment_status = ?`);
        args.push(params.paymentStatus);
      }

      if (params?.search?.trim()) {
        const q = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(LOWER(inv.invoice_number) LIKE ? OR LOWER(c.full_name) LIKE ? OR LOWER(c.primary_phone) LIKE ?)`);
        args.push(q, q, q);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await client.execute({
        sql: `SELECT inv.*, 
                c.full_name as customer_name, c.primary_phone as customer_phone, c.customer_code,
                sj.job_number,
                u.full_name as created_by_name
              FROM invoices inv
              LEFT JOIN customers c ON inv.customer_id = c.id
              LEFT JOIN service_jobs sj ON inv.service_job_id = sj.id
              LEFT JOIN users u ON inv.created_by = u.id
              ${whereClause}
              ORDER BY inv.created_at DESC`,
        args,
      });

      return { success: true, data: res.rows };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('billing:getInvoiceById', async (_event, params: { invoiceId: string }) => {
    try {
      const client = getClient();
      const invRes = await client.execute({
        sql: `SELECT inv.*, 
                c.full_name as customer_name, c.primary_phone as customer_phone, c.customer_code, c.email as customer_email, c.gstin as customer_gstin,
                sj.job_number, sj.reported_issue,
                d.equipment_type, d.brand as device_brand, d.model_name as device_model, d.serial_number as device_serial,
                u.full_name as created_by_name
              FROM invoices inv
              LEFT JOIN customers c ON inv.customer_id = c.id
              LEFT JOIN service_jobs sj ON inv.service_job_id = sj.id
              LEFT JOIN devices d ON sj.device_id = d.id
              LEFT JOIN users u ON inv.created_by = u.id
              WHERE inv.id = ? OR inv.invoice_number = ?
              LIMIT 1`,
        args: [params.invoiceId, params.invoiceId],
      });

      if (invRes.rows.length === 0) return { success: false, error: `Invoice "${params.invoiceId}" not found` };

      const invoice = invRes.rows[0] as Record<string, unknown>;
      const invoiceId = String(invoice.id);

      const itemsRes = await client.execute({
        sql: `SELECT * FROM invoice_items WHERE invoice_id = ?`,
        args: [invoiceId],
      });

      const paymentsRes = await client.execute({
        sql: `SELECT p.*, u.full_name as received_by_name
              FROM payments p
              LEFT JOIN users u ON p.received_by = u.id
              WHERE p.invoice_id = ?
              ORDER BY p.payment_date ASC`,
        args: [invoiceId],
      });

      return {
        success: true,
        data: {
          invoice,
          items: itemsRes.rows,
          payments: paymentsRes.rows,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 6. Create Tax Invoice (from Job / Quotation / Direct Sale)
  ipcMain.handle('billing:createInvoice', async (_event, payload: {
    customerId: string;
    serviceJobId?: string;
    invoiceType?: 'SERVICE_REPAIR' | 'DIRECT_SALE' | 'PC_BUILD' | 'REFURBISHED_SALE';
    isGstInvoice?: boolean;
    customerGstin?: string;
    advanceAdjusted?: number;
    discountAmount?: number;
    items: Array<{
      itemType: 'PART' | 'LABOR' | 'FINISHED_GOOD' | 'SERVICE';
      itemRefId?: string;
      description: string;
      hsnSacCode?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      taxRate?: number;
    }>;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };
      if (!payload.items || payload.items.length === 0) return { success: false, error: 'Invoice items are required' };

      const client = getClient();
      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM invoices`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const invoiceNumber = `INV-${currentYear}-${String(count).padStart(5, '0')}`;
      const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      let subtotalParts = 0;
      let subtotalLabor = 0;
      let totalTax = 0;

      for (const item of payload.items) {
        const lineNet = (item.quantity * item.unitPrice) - (item.discount || 0);
        const taxRate = payload.isGstInvoice !== false ? (item.taxRate ?? 18.0) : 0;
        const lineTax = (lineNet * taxRate) / 100;
        totalTax += lineTax;

        if (item.itemType === 'PART' || item.itemType === 'FINISHED_GOOD') {
          subtotalParts += lineNet;
        } else {
          subtotalLabor += lineNet;
        }
      }

      const discount = payload.discountAmount || 0;
      const totalAmount = Math.max(0, subtotalParts + subtotalLabor + totalTax - discount);
      const advance = payload.advanceAdjusted || 0;
      const balanceDue = Math.max(0, totalAmount - advance);
      const paymentStatus = balanceDue <= 0 ? 'PAID' : advance > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

      // Split CGST and SGST (9% + 9% by default for 18% intra-state Tamil Nadu)
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;

      const tx = await client.transaction('write');
      try {
        await tx.execute({
          sql: `INSERT INTO invoices (
                  id, invoice_number, invoice_type, customer_id, service_job_id,
                  is_gst_invoice, customer_gstin, subtotal_parts, subtotal_labor,
                  discount_amount, cgst_amount, sgst_amount, igst_amount, total_amount,
                  advance_adjusted, amount_paid, balance_due, payment_status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?, ?, ?)`,
          args: [
            invoiceId,
            invoiceNumber,
            payload.invoiceType || 'SERVICE_REPAIR',
            payload.customerId,
            payload.serviceJobId || null,
            payload.isGstInvoice !== false ? 1 : 0,
            payload.customerGstin?.trim() || null,
            subtotalParts,
            subtotalLabor,
            discount,
            cgst,
            sgst,
            totalAmount,
            advance,
            advance,
            balanceDue,
            paymentStatus,
            session.id,
          ],
        });

        for (const item of payload.items) {
          const iiId = `II-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const net = (item.quantity * item.unitPrice) - (item.discount || 0);
          const taxRate = payload.isGstInvoice !== false ? (item.taxRate ?? 18.0) : 0;
          const tax = (net * taxRate) / 100;
          const itemTotal = net + tax;

          await tx.execute({
            sql: `INSERT INTO invoice_items (
                    id, invoice_id, item_type, item_ref_id, description, hsn_sac_code,
                    quantity, unit_price, discount, tax_rate, tax_amount, total_amount
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              iiId,
              invoiceId,
              item.itemType,
              item.itemRefId || null,
              item.description.trim(),
              item.hsnSacCode?.trim() || null,
              item.quantity,
              item.unitPrice,
              item.discount || 0.0,
              taxRate,
              tax,
              itemTotal,
            ],
          });

          // If item is linked to inventory, deduct stock!
          if (item.itemRefId) {
            await tx.execute({
              sql: `UPDATE inventory_items 
                    SET quantity_on_hand = MAX(0, quantity_on_hand - ?)
                    WHERE id = ?`,
              args: [item.quantity, item.itemRefId],
            });

            const itxId = `ITX-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await tx.execute({
              sql: `INSERT INTO inventory_transactions (
                      id, item_id, transaction_type, quantity_delta, balance_after,
                      reference_type, reference_id, notes, created_by
                    ) VALUES (?, ?, 'DIRECT_SALE', ?, 
                              (SELECT quantity_on_hand FROM inventory_items WHERE id = ?),
                              'INVOICE', ?, 'Sold on invoice', ?)`,
              args: [itxId, item.itemRefId, -item.quantity, item.itemRefId, invoiceNumber, session.id],
            });
          }
        }

        // If advance was adjusted, write payment receipt for advance
        if (advance > 0) {
          const rCountRes = await tx.execute(`SELECT COUNT(*) as cnt FROM payments`);
          const rCnt = Number((rCountRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
          const receiptNumber = `REC-${currentYear}-${String(rCnt).padStart(5, '0')}`;
          const payId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

          await tx.execute({
            sql: `INSERT INTO payments (
                    id, receipt_number, invoice_id, service_job_id, customer_id,
                    payment_type, payment_mode, transaction_reference, amount, received_by
                  ) VALUES (?, ?, ?, ?, ?, 'ADVANCE_DEPOSIT', 'CASH', 'Advance Settlement', ?, ?)`,
            args: [payId, receiptNumber, invoiceId, payload.serviceJobId || null, payload.customerId, advance, session.id],
          });
        }

        // Transition service job to READY_FOR_DELIVERY / DELIVERED
        if (payload.serviceJobId) {
          await tx.execute({
            sql: `UPDATE service_jobs 
                  SET current_status = 'READY_FOR_DELIVERY', updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [payload.serviceJobId],
          });

          await tx.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, 'REPAIR_COMPLETED', 'READY_FOR_DELIVERY', ?, ?)`,
            args: [
              `JSH-${Date.now()}`,
              payload.serviceJobId,
              session.id,
              `Invoice ${invoiceNumber} billed for ₹${totalAmount.toFixed(2)}. Ready for customer collection.`,
            ],
          });
        }

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'INVOICE_CREATE', 'invoices', invoiceId, null, { invoiceNumber, totalAmount, balanceDue });

      return {
        success: true,
        data: {
          invoiceId,
          invoiceNumber,
          totalAmount,
          advanceAdjusted: advance,
          balanceDue,
          paymentStatus,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 7. Record Payment & Receipt
  ipcMain.handle('billing:recordPayment', async (_event, payload: {
    invoiceId: string;
    amount: number;
    paymentMode: 'CASH' | 'UPI_QR' | 'CARD' | 'NET_BANKING' | 'CHEQUE';
    paymentType?: 'ADVANCE_DEPOSIT' | 'INVOICE_PARTIAL' | 'INVOICE_FULL';
    transactionReference?: string;
    markJobDelivered?: boolean;
  }) => {
    try {
      const session = getActiveSession();
      if (!session) return { success: false, error: 'Unauthorized' };
      if (!payload.amount || payload.amount <= 0) return { success: false, error: 'Payment amount must be greater than 0' };

      const client = getClient();
      const invRes = await client.execute({ sql: `SELECT * FROM invoices WHERE id = ?`, args: [payload.invoiceId] });
      if (invRes.rows.length === 0) return { success: false, error: 'Invoice not found' };

      const invoice = invRes.rows[0] as Record<string, unknown>;
      const currentPaid = Number(invoice.amount_paid || 0);
      const totalAmount = Number(invoice.total_amount || 0);
      const newPaid = currentPaid + payload.amount;
      const newBalance = Math.max(0, totalAmount - newPaid);
      const newPaymentStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      const currentYear = new Date().getFullYear();
      const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM payments`);
      const count = Number((countRes.rows[0] as Record<string, unknown>).cnt || 0) + 1;
      const receiptNumber = `REC-${currentYear}-${String(count).padStart(5, '0')}`;
      const payId = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const tx = await client.transaction('write');
      try {
        await tx.execute({
          sql: `INSERT INTO payments (
                  id, receipt_number, invoice_id, service_job_id, customer_id,
                  payment_type, payment_mode, transaction_reference, amount, received_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            payId,
            receiptNumber,
            String(invoice.id),
            invoice.service_job_id ? String(invoice.service_job_id) : null,
            String(invoice.customer_id),
            payload.paymentType || (newBalance <= 0 ? 'INVOICE_FULL' : 'INVOICE_PARTIAL'),
            payload.paymentMode,
            payload.transactionReference?.trim() || null,
            payload.amount,
            session.id,
          ],
        });

        await tx.execute({
          sql: `UPDATE invoices 
                SET amount_paid = ?, balance_due = ?, payment_status = ? 
                WHERE id = ?`,
          args: [newPaid, newBalance, newPaymentStatus, String(invoice.id)],
        });

        // If markJobDelivered or fully paid, optionally transition job to DELIVERED
        if (invoice.service_job_id && (payload.markJobDelivered || newBalance <= 0)) {
          const sJobId = String(invoice.service_job_id);
          await tx.execute({
            sql: `UPDATE service_jobs 
                  SET current_status = 'DELIVERED', actual_delivery_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                  WHERE id = ?`,
            args: [sJobId],
          });

          await tx.execute({
            sql: `INSERT INTO job_status_history (id, job_id, previous_status, new_status, changed_by, reason_or_notes)
                  VALUES (?, ?, 'READY_FOR_DELIVERY', 'DELIVERED', ?, ?)`,
            args: [
              `JSH-${Date.now()}`,
              sJobId,
              session.id,
              `Payment of ₹${payload.amount.toFixed(2)} received via ${payload.paymentMode} (${receiptNumber}). Device handed over to customer.`,
            ],
          });
        }

        await tx.commit();
      } catch (txErr) {
        await tx.rollback();
        throw txErr;
      }

      await logAudit(session.id, 'PAYMENT_RECEIPT', 'payments', payId, null, { receiptNumber, amount: payload.amount, mode: payload.paymentMode });

      return {
        success: true,
        data: {
          receiptNumber,
          amountPaid: payload.amount,
          totalPaid: newPaid,
          balanceDue: newBalance,
          paymentStatus: newPaymentStatus,
        },
      };
    } catch (error: unknown) {
      return { success: false, error: (error as Error).message };
    }
  });
}
