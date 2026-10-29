import { Router } from 'express';
import { getClient } from '../db/database.ts';
import { generateToken, verifyPassword, hashPassword, authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { loginSchema, pinLoginSchema, createUserSchema } from '../validation/schemas.ts';

export const authRouter = Router();

// Login (Shop Staff or Super-Admin)
authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { shopSlug, username, password, isSuperAdmin } = req.body;
    const client = getClient();

    // 1. Super-Admin Portal Login
    if (isSuperAdmin) {
      const adminRes = await client.execute({
        sql: `SELECT * FROM vendor_admins WHERE username = ?`,
        args: [username.trim().toLowerCase()],
      });

      if (adminRes.rows.length === 0) {
        res.status(401).json({ success: false, error: 'Invalid Super-Admin credentials.' });
        return;
      }

      const admin = adminRes.rows[0] as Record<string, unknown>;
      if (!verifyPassword(password, String(admin.password_hash))) {
        res.status(401).json({ success: false, error: 'Invalid Super-Admin credentials.' });
        return;
      }

      const token = generateToken({
        userId: String(admin.id),
        shopId: 'VENDOR_PLATFORM',
        username: String(admin.username),
        fullName: String(admin.full_name),
        roleId: 'ROLE_SUPER_ADMIN',
        permissions: ['*'],
        isSuperAdmin: true,
      });

      res.json({
        success: true,
        token,
        user: {
          id: admin.id,
          username: admin.username,
          fullName: admin.full_name,
          roleId: 'ROLE_SUPER_ADMIN',
          isSuperAdmin: true,
        },
      });
      return;
    }

    // 2. Regular Shop Staff Login
    if (!shopSlug) {
      res.status(400).json({ success: false, error: 'Shop identifier (slug) is required.' });
      return;
    }

    const shopRes = await client.execute({
      sql: `SELECT * FROM shops WHERE slug = ? OR id = ?`,
      args: [shopSlug.trim().toLowerCase(), shopSlug.trim().toLowerCase()],
    });

    if (shopRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Shop not found. Please verify your shop ID or URL.' });
      return;
    }

    const shop = shopRes.rows[0] as Record<string, unknown>;
    const shopId = String(shop.id);

    if (shop.status === 'FROZEN' || shop.status === 'EXPIRED') {
      res.status(403).json({
        success: false,
        error: `Shop subscription is ${String(shop.status).toLowerCase()}. Please contact vendor support.`,
      });
      return;
    }

    const userRes = await client.execute({
      sql: `SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.shop_id = ? AND (u.username = ? OR u.phone = ?) AND u.is_active = 1`,
      args: [shopId, username.trim().toLowerCase(), username.trim()],
    });


    if (userRes.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid username or inactive user account.' });
      return;
    }

    const user = userRes.rows[0] as Record<string, unknown>;
    if (!verifyPassword(password, String(user.password_hash))) {
      res.status(401).json({ success: false, error: 'Invalid password.' });
      return;
    }

    // Fetch permissions
    const permRes = await client.execute({
      sql: `SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?`,
      args: [user.role_id as string],
    });
    const permissions = permRes.rows.map((r) => (r as Record<string, unknown>).code as string);

    const token = generateToken({
      userId: String(user.id),
      shopId,
      username: String(user.username),
      fullName: String(user.full_name),
      roleId: String(user.role_id),
      permissions,
      isSuperAdmin: false,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        shopId,
        shopName: shop.name,
        shopSlug: shop.slug,
        username: user.username,
        fullName: user.full_name,
        roleId: user.role_id,
        roleName: user.role_name,
        phone: user.phone,
        commissionPct: user.commission_pct,
        permissions,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Fast PIN Switch Login (inside a shop)
authRouter.post('/pin', validateBody(pinLoginSchema), async (req, res) => {
  try {
    const { shopId, pinCode } = req.body;
    const client = getClient();

    const userRes = await client.execute({
      sql: `SELECT u.*, r.name as role_name, s.name as shop_name, s.status as shop_status
            FROM users u 
            JOIN roles r ON u.role_id = r.id
            JOIN shops s ON u.shop_id = s.id
            WHERE (u.shop_id = ? OR s.slug = ?) AND u.pin_code = ? AND u.is_active = 1`,
      args: [shopId, shopId, pinCode.trim()],
    });

    if (userRes.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid PIN code.' });
      return;
    }

    const user = userRes.rows[0] as Record<string, unknown>;
    if (user.shop_status === 'FROZEN' || user.shop_status === 'EXPIRED') {
      res.status(403).json({ success: false, error: 'Shop is inactive or suspended.' });
      return;
    }

    const permRes = await client.execute({
      sql: `SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?`,
      args: [user.role_id as string],
    });
    const permissions = permRes.rows.map((r) => (r as Record<string, unknown>).code as string);

    const token = generateToken({
      userId: String(user.id),
      shopId,
      username: String(user.username),
      fullName: String(user.full_name),
      roleId: String(user.role_id),
      permissions,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        shopId,
        shopName: user.shop_name,
        username: user.username,
        fullName: user.full_name,
        roleId: user.role_id,
        roleName: user.role_name,
        phone: user.phone,
        permissions,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Current User & Shop Details
authRouter.get('/me', authenticateToken, async (req, res) => {
  try {
    const client = getClient();
    if (req.user?.isSuperAdmin) {
      res.json({
        success: true,
        user: {
          id: req.user.userId,
          username: req.user.username,
          fullName: req.user.fullName,
          roleId: 'ROLE_SUPER_ADMIN',
          isSuperAdmin: true,
        },
      });
      return;
    }

    const shopRes = await client.execute({
      sql: `SELECT * FROM shops WHERE id = ?`,
      args: [req.user!.shopId],
    });
    const shop = shopRes.rows[0] as Record<string, unknown>;

    res.json({
      success: true,
      user: req.user,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        phone: shop.phone,
        email: shop.email,
        gstin: shop.gstin,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        pincode: shop.pincode,
        upiId: shop.upi_id,
        status: shop.status,
        subscriptionPlan: shop.subscription_plan,
        subscriptionEndsAt: shop.subscription_ends_at,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// List Shop Users (for quick profile switcher, never leaking credentials)
authRouter.get('/users', authenticateToken, async (req, res) => {
  try {
    const client = getClient();
    const result = await client.execute({
      sql: `SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active, u.phone,
            (CASE WHEN u.pin_code IS NOT NULL AND u.pin_code != '' THEN 1 ELSE 0 END) as has_pin
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.shop_id = ?
            ORDER BY u.created_at ASC`,
      args: [req.user!.shopId],
    });

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: (row as Record<string, unknown>).id,
        username: (row as Record<string, unknown>).username,
        fullName: (row as Record<string, unknown>).full_name,
        roleId: (row as Record<string, unknown>).role_id,
        roleName: (row as Record<string, unknown>).role_name,
        isActive: Boolean((row as Record<string, unknown>).is_active),
        hasPin: Boolean((row as Record<string, unknown>).has_pin),
        phone: (row as Record<string, unknown>).phone,
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create User in Current Shop
authRouter.post('/users', authenticateToken, validateBody(createUserSchema), async (req, res) => {
  try {
    const { username, fullName, roleId, password, pinCode, phone } = req.body;
    const client = getClient();
    const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const passwordHash = hashPassword(password && password.trim() ? password.trim() : 'kconnect123');
    const pin = pinCode && pinCode.trim() ? pinCode.trim() : '1234';

    await client.execute({
      sql: `INSERT INTO users (id, shop_id, username, full_name, role_id, password_hash, pin_code, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        userId,
        req.user!.shopId,
        username.trim().toLowerCase(),
        fullName.trim(),
        roleId || 'ROLE_TECHNICIAN',
        passwordHash,
        pin,
        phone ? phone.trim() : null,
      ],
    });

    res.json({ success: true, data: { id: userId, username, fullName, roleId } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Logout (stateless token invalidation acknowledgment)
authRouter.post('/logout', authenticateToken, (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

