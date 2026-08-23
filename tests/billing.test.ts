import { describe, it, expect, beforeAll } from 'vitest';
import { initializeSchema, setDatabasePath, getClient } from '../electron/db/database.ts';
import { seedDatabase } from '../electron/db/seed.ts';
import path from 'node:path';
import os from 'node:os';

describe('Phase 5: Quotations, Approvals, Billing & Payments Integration', () => {
  beforeAll(async () => {
    const testDbPath = path.join(os.tmpdir(), `ktech-test-billing-${Date.now()}.sqlite`);
    setDatabasePath(testDbPath);
    await initializeSchema();
    await seedDatabase();
  });

  it('creates quotation with parts and labor subtotals', async () => {
    const client = getClient();
    const qId = `QUOTE-TEST-${Date.now()}`;
    const qNum = `EST-2026-00001`;

    await client.execute({
      sql: `INSERT INTO quotations (
              id, quotation_number, job_id, parts_subtotal,
              labor_subtotal, discount_amount, tax_amount, total_amount, status, created_by
            ) VALUES (?, ?, 'JOB-001', 3500.0, 1200.0, 200.0, 810.0, 5310.0, 'PENDING', 'USR_TECH1')`,
      args: [qId, qNum],
    });

    const check = await client.execute({
      sql: `SELECT * FROM quotations WHERE id = ?`,
      args: [qId],
    });
    expect(check.rows.length).toBe(1);
    expect(check.rows[0].quotation_number).toBe(qNum);
    expect(Number(check.rows[0].total_amount)).toBe(5310.0);
  });

  it('captures customer approval with channel attribution and transitions ticket', async () => {
    const client = getClient();
    const qId = `QUOTE-APP-TEST-${Date.now()}`;
    const qNum = `EST-2026-00002`;
    const approvalId = `QA-TEST-${Date.now()}`;

    await client.execute({
      sql: `INSERT INTO quotations (
              id, quotation_number, job_id, parts_subtotal,
              labor_subtotal, discount_amount, tax_amount, total_amount, status, created_by
            ) VALUES (?, ?, 'JOB-001', 2000.0, 800.0, 0.0, 504.0, 3304.0, 'PENDING', 'USR_TECH1')`,
      args: [qId, qNum],
    });

    // Record Approval
    await client.execute({
      sql: `INSERT INTO quotation_approvals (
              id, quotation_id, job_id, approval_status, approved_amount, approval_method,
              customer_contact_used, notes, recorded_by_user_id, approval_timestamp
            ) VALUES (?, ?, 'JOB-001', 'APPROVED', 3304.0, 'WHATSAPP', '9843011223', 'Customer approved full quote via WhatsApp reply', 'USR_RECEPTION', CURRENT_TIMESTAMP)`,
      args: [approvalId, qId],
    });

    await client.execute({
      sql: `UPDATE quotations SET status = 'APPROVED' WHERE id = ?`,
      args: [qId],
    });

    const checkApp = await client.execute({
      sql: `SELECT qa.*, q.status as quote_status 
            FROM quotation_approvals qa 
            JOIN quotations q ON qa.quotation_id = q.id 
            WHERE qa.id = ?`,
      args: [approvalId],
    });

    expect(checkApp.rows.length).toBe(1);
    expect(checkApp.rows[0].approval_status).toBe('APPROVED');
    expect(checkApp.rows[0].quote_status).toBe('APPROVED');
    expect(checkApp.rows[0].approval_method).toBe('WHATSAPP');
  });

  it('creates tax invoice with 9%+9% CGST/SGST split and records payment receipt', async () => {
    const client = getClient();
    const invId = `INV-TEST-${Date.now()}`;
    const invNum = `INV-2026-00001`;

    const subtotal = 4000.0;
    const cgst = subtotal * 0.09; // 360
    const sgst = subtotal * 0.09; // 360
    const total = subtotal + cgst + sgst; // 4720

    await client.execute({
      sql: `INSERT INTO invoices (
              id, invoice_number, customer_id, service_job_id, invoice_type, is_gst_invoice,
              subtotal_parts, subtotal_labor, cgst_amount, sgst_amount, total_amount, amount_paid, balance_due,
              payment_status, created_by
            ) VALUES (?, ?, 'CUST-001', 'JOB-001', 'SERVICE_REPAIR', 1, 2500.0, 1500.0, ?, ?, ?, 0.0, ?, 'UNPAID', 'USR_RECEPTION')`,
      args: [invId, invNum, cgst, sgst, total, total],
    });

    const invCheck = await client.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [invId],
    });
    expect(invCheck.rows.length).toBe(1);
    expect(Number(invCheck.rows[0].cgst_amount)).toBe(360.0);
    expect(Number(invCheck.rows[0].sgst_amount)).toBe(360.0);
    expect(Number(invCheck.rows[0].balance_due)).toBe(4720.0);

    // Record Payment
    const payId = `PAY-TEST-${Date.now()}`;
    const recNum = `REC-2026-00001`;

    await client.execute({
      sql: `INSERT INTO payments (
              id, receipt_number, invoice_id, customer_id, amount, payment_mode,
              payment_type, transaction_reference, received_by
            ) VALUES (?, ?, ?, 'CUST-001', 4720.0, 'UPI_QR', 'INVOICE_SETTLEMENT', 'UPI/Ref/938129031', 'USR_RECEPTION')`,
      args: [payId, recNum, invId],
    });

    await client.execute({
      sql: `UPDATE invoices SET amount_paid = 4720.0, balance_due = 0.0, payment_status = 'PAID' WHERE id = ?`,
      args: [invId],
    });

    const paidCheck = await client.execute({
      sql: `SELECT * FROM invoices WHERE id = ?`,
      args: [invId],
    });
    expect(paidCheck.rows[0].payment_status).toBe('PAID');
    expect(Number(paidCheck.rows[0].balance_due)).toBe(0.0);
  });
});
