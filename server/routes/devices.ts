import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { decryptSecret } from '../security/crypto.ts';

export const devicesRouter = Router();

devicesRouter.use(authenticateToken);

// ── 1. List Devices (Search & Filter) ──────────────────────────────
devicesRouter.get('/', async (req, res) => {
  try {
    const shopId = req.user!.shopId;
    const client = getClient();
    const { search, customerId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        d.*,
        c.full_name as customer_name,
        c.primary_phone as customer_phone,
        c.customer_code,
        (SELECT COUNT(*) FROM service_jobs j WHERE j.device_id = d.id AND j.shop_id = d.shop_id) as total_jobs_count
      FROM devices d
      JOIN customers c ON d.customer_id = c.id
      WHERE d.shop_id = ?
    `;

    const args: (string | number)[] = [shopId];

    if (customerId) {
      query += ` AND d.customer_id = ?`;
      args.push(String(customerId));
    }

    if (search) {
      const q = `%${String(search).trim()}%`;
      query += ` AND (d.brand LIKE ? OR d.model_name LIKE ? OR d.serial_number LIKE ? OR c.full_name LIKE ? OR c.primary_phone LIKE ?)`;
      args.push(q, q, q, q, q);
    }

    query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
    args.push(Number(limit), Number(offset));

    const result = await client.execute({ sql: query, args });

    res.json({
      success: true,
      data: result.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerCode: row.customer_code,
          equipmentType: row.equipment_type,
          brand: row.brand,
          modelName: row.model_name,
          serialNumber: row.serial_number,
          colorFinish: row.color_finish,
          specsSummary: row.specs_summary,
          hasPasscode: Boolean(row.encrypted_security_passcode),
          totalJobsCount: Number(row.total_jobs_count || 0),
          createdAt: row.created_at,
        };
      }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── 2. Get Comprehensive Equipment Profile by Device ID ────────────
devicesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const client = getClient();

    // 1. Fetch Device Record with Customer Data
    const devRes = await client.execute({
      sql: `
        SELECT 
          d.*,
          c.full_name as customer_name,
          c.primary_phone as customer_phone,
          c.customer_code
        FROM devices d
        JOIN customers c ON d.customer_id = c.id
        WHERE d.shop_id = ? AND d.id = ?
      `,
      args: [shopId, id],
    });

    if (devRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Equipment record not found in current shop organization.' });
      return;
    }

    const row = devRes.rows[0] as Record<string, unknown>;

    // 2. Fetch parallel Jobs and Photos for this device
    const [jobsRes, photosRes] = await Promise.all([
      client.execute({
        sql: `
          SELECT 
            j.id,
            j.job_number,
            j.service_category,
            j.current_status,
            j.priority,
            j.reported_issue,
            j.created_at,
            u.full_name as technician_name
          FROM service_jobs j
          LEFT JOIN users u ON j.assigned_technician_id = u.id
          WHERE j.shop_id = ? AND j.device_id = ?
          ORDER BY j.created_at DESC
        `,
        args: [shopId, id],
      }),
      client.execute({
        sql: `
          SELECT id, photo_type, file_path, caption, created_at
          FROM device_photos
          WHERE shop_id = ? AND device_id = ?
          ORDER BY created_at DESC
        `,
        args: [shopId, id],
      }),
    ]);

    res.json({
      success: true,
      data: {
        device: {
          id: row.id,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerCode: row.customer_code,
          equipmentType: row.equipment_type,
          brand: row.brand,
          modelName: row.model_name,
          serialNumber: row.serial_number,
          colorFinish: row.color_finish,
          specsSummary: row.specs_summary,
          hasPasscode: Boolean(row.encrypted_security_passcode),
          createdAt: row.created_at,
        },
        jobs: jobsRes.rows.map((j) => {
          const jr = j as Record<string, unknown>;
          return {
            id: jr.id,
            jobNumber: jr.job_number,
            serviceCategory: jr.service_category,
            currentStatus: jr.current_status,
            priority: jr.priority,
            reportedIssue: jr.reported_issue,
            technicianName: jr.technician_name || null,
            createdAt: jr.created_at,
          };
        }),
        photos: photosRes.rows.map((p) => {
          const pr = p as Record<string, unknown>;
          return {
            id: pr.id,
            photoType: pr.photo_type,
            filePath: pr.file_path,
            caption: pr.caption || null,
            createdAt: pr.created_at,
          };
        }),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── 3. Unlock Hardware Security Passcode (AES-256-GCM Vault) ────────
devicesRouter.post('/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const client = getClient();

    const devRes = await client.execute({
      sql: `SELECT encrypted_security_passcode FROM devices WHERE shop_id = ? AND id = ?`,
      args: [shopId, id],
    });

    if (devRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Equipment record not found.' });
      return;
    }

    const encPass = devRes.rows[0]?.encrypted_security_passcode as string | undefined;

    if (!encPass) {
      res.json({ success: true, data: { passcode: 'NO_PASSCODE_SET' } });
      return;
    }

    const decrypted = decryptSecret(encPass);

    // Record access event into audit_logs table (or saas_admin_audit_logs if Super Admin)
    try {
      if (req.user!.isSuperAdmin) {
        await client.execute({
          sql: `
            INSERT INTO saas_admin_audit_logs (id, admin_id, action, target_entity_type, target_entity_id, details_json, ip_address)
            VALUES (?, ?, 'PASSCODE_VAULT_ACCESSED', 'DEVICE', ?, ?, ?)
          `,
          args: [
            `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            req.user!.userId,
            id,
            JSON.stringify({ deviceId: id, timestamp: new Date().toISOString() }),
            req.ip || '127.0.0.1',
          ],
        });
      } else {
        await client.execute({
          sql: `
            INSERT INTO audit_logs (id, shop_id, user_id, action, entity_type, entity_id, after_state, ip_address)
            VALUES (?, ?, ?, 'PASSCODE_VAULT_ACCESSED', 'DEVICE', ?, ?, ?)
          `,
          args: [
            `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            shopId,
            req.user!.userId,
            id,
            JSON.stringify({ deviceId: id, timestamp: new Date().toISOString() }),
            req.ip || '127.0.0.1',
          ],
        });
      }
    } catch (auditErr) {
      console.warn('[Audit Log Warning]', auditErr);
    }

    res.json({
      success: true,
      passcode: decrypted || 'UNABLE_TO_DECRYPT',
      data: {
        passcode: decrypted || 'UNABLE_TO_DECRYPT',
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── 4. Upload / Record Device Photo ─────────────────────────────────
devicesRouter.post('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const { photoType = 'INTAKE_CONDITION', filePath, caption, jobId } = req.body;
    const client = getClient();

    const devCheck = await client.execute({
      sql: `SELECT id FROM devices WHERE id = ? AND shop_id = ?`,
      args: [id, shopId],
    });
    if (devCheck.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Device not found in current shop organization.' });
      return;
    }

    if (!filePath) {
      res.status(400).json({ success: false, error: 'filePath is required.' });
      return;
    }

    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await client.execute({
      sql: `
        INSERT INTO device_photos (id, shop_id, device_id, job_id, photo_type, file_path, caption)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [photoId, shopId, id, jobId || null, photoType, filePath, caption || null],
    });

    res.json({
      success: true,
      data: {
        id: photoId,
        deviceId: id,
        jobId: jobId || null,
        photoType,
        filePath,
        caption: caption || null,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ── 5. List Photos for Device ───────────────────────────────────────
devicesRouter.get('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user!.shopId;
    const client = getClient();

    const result = await client.execute({
      sql: `SELECT id, photo_type, file_path, caption, created_at FROM device_photos WHERE device_id = ? AND shop_id = ? ORDER BY created_at DESC`,
      args: [id, shopId],
    });

    res.json({
      success: true,
      data: result.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: row.id,
          photoType: row.photo_type,
          filePath: row.file_path,
          caption: row.caption,
          createdAt: row.created_at,
        };
      }),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

