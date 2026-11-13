import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import { getClient } from '../db/database.ts';
import { generateToken, verifyPassword, hashPassword, authenticateToken } from '../middleware/auth.ts';
import { encryptSecret, decryptSecret } from '../security/crypto.ts';
import {
  generateReadableTempPassword,
  hashResetSecret,
  timingSafeEqualHex,
  normalizePhoneDigits,
  resolvePublicAppUrl,
  buildResetUrl,
} from '../security/passwordUtils.ts';
import { sendPasswordResetEmail, maskEmailAddress, isEmailDeliveryConfigured } from '../services/emailService.ts';
import { validateBody } from '../middleware/validate.ts';
import {
  loginSchema,
  pinLoginSchema,
  createUserSchema,
  forgotPasswordSchema,
  verifyResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  ownerResetStaffSchema,
} from '../validation/schemas.ts';

export const authRouter = Router();

const RESET_TTL_MINUTES = 15;
const MAX_RESET_ATTEMPTS = 5;

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

    // Lazily capture AES-256-GCM recovery credential on successful login if missing
    if (!user.encrypted_recovery_password) {
      const recoveryCipher = encryptSecret(password);
      client.execute({
        sql: `UPDATE users SET encrypted_recovery_password = ? WHERE id = ? AND shop_id = ?`,
        args: [recoveryCipher, String(user.id), shopId],
      }).catch(() => {});
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
        email: user.email,
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
        email: user.email,
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
      sql: `SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active, u.phone, u.email,
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
        email: (row as Record<string, unknown>).email || null,
      })),
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Create User in Current Shop
authRouter.post('/users', authenticateToken, validateBody(createUserSchema), async (req, res) => {
  try {
    const { username, fullName, roleId, password, pinCode, phone, email } = req.body;
    const client = getClient();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

    // Check username uniqueness in current shop
    const dupUser = await client.execute({
      sql: `SELECT id FROM users WHERE shop_id = ? AND LOWER(username) = ?`,
      args: [req.user!.shopId, cleanUsername],
    });
    if (dupUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        field: 'username',
        error: `Username "${cleanUsername}" is already taken in this shop. Please choose another username.`,
      });
    }

    const userId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const plainPassword = password && password.trim() ? password.trim() : 'kconnect123';
    const passwordHash = hashPassword(plainPassword);
    const recoveryCipher = encryptSecret(plainPassword);
    const pin = pinCode && pinCode.trim() ? pinCode.trim() : '1234';

    await client.execute({
      sql: `INSERT INTO users (id, shop_id, username, full_name, role_id, password_hash, encrypted_recovery_password, pin_code, phone, email, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        userId,
        req.user!.shopId,
        cleanUsername,
        fullName.trim(),
        roleId || 'ROLE_TECHNICIAN',
        passwordHash,
        recoveryCipher,
        pin,
        phone ? phone.trim() : null,
        cleanEmail,
      ],
    });

    res.json({ success: true, data: { id: userId, username: cleanUsername, fullName, roleId, email: cleanEmail } });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Logout (stateless token invalidation acknowledgment)
authRouter.post('/logout', authenticateToken, (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

interface ResolvedShopUser {
  id: string;
  shopId: string;
  shopName: string;
  shopSlug: string;
  shopPhone: string | null;
  shopEmail: string | null;
  username: string;
  fullName: string;
  roleId: string;
  phone: string | null;
  userEmail: string | null;
}

type ShopUserLookupResult =
  | { status: 'FOUND'; user: ResolvedShopUser }
  | { status: 'NOT_FOUND' }
  | { status: 'AMBIGUOUS'; message: string };

async function getVendorSupportPhone(): Promise<string | null> {
  try {
    const client = getClient();
    const res = await client.execute({
      sql: `SELECT value FROM saas_platform_settings WHERE key IN ('support_phone', 'support_whatsapp', 'vendor_phone') LIMIT 1`,
      args: [],
    });
    if (res.rows.length > 0 && res.rows[0].value) {
      return String(res.rows[0].value);
    }
  } catch {
    // Non-critical lookup
  }
  return null;
}

async function findShopUserForReset(params: {
  shopSlug?: string;
  username?: string;
  contact?: string;
}): Promise<ShopUserLookupResult> {
  const client = getClient();
  const cleanSlug = params.shopSlug?.trim().toLowerCase() || '';
  const cleanUsername = params.username?.trim().toLowerCase() || '';
  const cleanContact = params.contact?.trim() || '';
  const isEmailContact = cleanContact.includes('@');
  const contactDigits = isEmailContact ? '' : normalizePhoneDigits(cleanContact);

  const mapRow = (r: Record<string, unknown>): ResolvedShopUser => ({
    id: String(r.id),
    shopId: String(r.shop_id),
    shopName: String(r.shop_name),
    shopSlug: String(r.shop_slug),
    shopPhone: r.shop_phone ? String(r.shop_phone) : null,
    shopEmail: r.shop_email ? String(r.shop_email) : null,
    username: String(r.username),
    fullName: String(r.full_name),
    roleId: String(r.role_id),
    phone: r.phone ? String(r.phone) : null,
    userEmail: r.user_email ? String(r.user_email) : null,
  });

  const baseSelect = `
    SELECT u.id, u.shop_id, u.username, u.full_name, u.role_id, u.phone, u.email AS user_email,
           s.name AS shop_name, s.slug AS shop_slug, s.phone AS shop_phone, s.email AS shop_email
    FROM users u
    INNER JOIN shops s ON s.id = u.shop_id
    WHERE u.is_active = 1
  `;

  if (cleanSlug && cleanUsername) {
    const res = await client.execute({
      sql: `${baseSelect} AND LOWER(s.slug) = ? AND LOWER(u.username) = ? LIMIT 1`,
      args: [cleanSlug, cleanUsername],
    });
    if (res.rows.length > 0) {
      return { status: 'FOUND', user: mapRow(res.rows[0] as Record<string, unknown>) };
    }
    return { status: 'NOT_FOUND' };
  }

  const candidatesRes = cleanSlug
    ? await client.execute({ sql: `${baseSelect} AND LOWER(s.slug) = ?`, args: [cleanSlug] })
    : await client.execute({ sql: baseSelect, args: [] });

  const allCandidates = candidatesRes.rows.map((row) => mapRow(row as Record<string, unknown>));

  if (cleanContact) {
    const matched = allCandidates.filter((u) => {
      if (cleanUsername && u.username.toLowerCase() !== cleanUsername) return false;
      if (isEmailContact) {
        const contactLower = cleanContact.toLowerCase();
        const userEmailMatch = (u.userEmail || '').trim().toLowerCase() === contactLower;
        const ownerEmailMatch = u.roleId === 'ROLE_OWNER' && (u.shopEmail || '').trim().toLowerCase() === contactLower;
        return userEmailMatch || ownerEmailMatch;
      }
      if (!contactDigits) return false;
      const userDigits = normalizePhoneDigits(u.phone);
      const shopDigits = normalizePhoneDigits(u.shopPhone);
      return userDigits === contactDigits || (u.roleId === 'ROLE_OWNER' && shopDigits === contactDigits);
    });

    if (matched.length === 0) return { status: 'NOT_FOUND' };
    if (matched.length === 1) return { status: 'FOUND', user: matched[0] };
    return {
      status: 'AMBIGUOUS',
      message: 'Multiple accounts match this contact detail. Please enter your Shop ID (slug) or username to select the exact account.',
    };
  }

  if (cleanUsername) {
    const matched = allCandidates.filter((u) => u.username.toLowerCase() === cleanUsername);
    if (matched.length === 0) return { status: 'NOT_FOUND' };
    if (matched.length === 1) return { status: 'FOUND', user: matched[0] };
    return {
      status: 'AMBIGUOUS',
      message: 'Multiple shops use this username. Please include your Shop ID (slug) or registered phone/email.',
    };
  }

  return { status: 'NOT_FOUND' };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : (forwarded as string | undefined);
  return req.ip || raw || '127.0.0.1';
}

async function applyUserPasswordUpdate(params: {
  accountType: 'SHOP_USER' | 'SUPER_ADMIN';
  userId: string;
  shopId?: string | null;
  newPassword: string;
  newPin?: string;
  actorId: string;
  auditAction: string;
  ipAddress: string;
}): Promise<void> {
  const client = getClient();
  const passwordHash = hashPassword(params.newPassword);

  if (params.accountType === 'SUPER_ADMIN') {
    await client.execute({
      sql: `UPDATE vendor_admins SET password_hash = ? WHERE id = ?`,
      args: [passwordHash, params.userId],
    });
    await client.execute({
      sql: `INSERT INTO saas_admin_audit_logs (id, admin_id, action, target_entity_type, target_entity_id, details_json, ip_address)
            VALUES (?, ?, ?, 'VENDOR_ADMIN', ?, ?, ?)`,
      args: [
        `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        params.actorId,
        params.auditAction,
        params.userId,
        JSON.stringify({ updatedAt: new Date().toISOString() }),
        params.ipAddress,
      ],
    });
    return;
  }

  if (!params.shopId) {
    throw new Error('Shop context missing for user password update.');
  }
  const recoveryCipher = encryptSecret(params.newPassword);

  if (params.newPin) {
    await client.execute({
      sql: `UPDATE users SET password_hash = ?, encrypted_recovery_password = ?, pin_code = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?`,
      args: [passwordHash, recoveryCipher, params.newPin, params.userId, params.shopId],
    });
  } else {
    await client.execute({
      sql: `UPDATE users SET password_hash = ?, encrypted_recovery_password = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?`,
      args: [passwordHash, recoveryCipher, params.userId, params.shopId],
    });
  }

  await client.execute({
    sql: `INSERT INTO audit_logs (id, shop_id, user_id, action, entity_type, entity_id, after_state, ip_address)
          VALUES (?, ?, ?, ?, 'USER', ?, ?, ?)`,
    args: [
      `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      params.shopId,
      params.actorId,
      params.auditAction,
      params.userId,
      JSON.stringify({ pinUpdated: Boolean(params.newPin) }),
      params.ipAddress,
    ],
  });
}

async function resolveResetTargetAccount(input: {
  mode?: 'SHOP_USER' | 'SUPER_ADMIN';
  shopSlug?: string;
  username?: string;
  contact?: string;
}): Promise<
  | { status: 'FOUND'; accountType: 'SHOP_USER'; user: ResolvedShopUser }
  | { status: 'FOUND'; accountType: 'SUPER_ADMIN'; admin: { id: string; username: string; fullName: string; email: string | null } }
  | { status: 'NOT_FOUND' }
  | { status: 'AMBIGUOUS'; message: string }
> {
  const client = getClient();
  if (input.mode === 'SUPER_ADMIN') {
    const cleanUser = (input.username || '').trim().toLowerCase();
    const cleanContact = (input.contact || '').trim().toLowerCase();
    const adminRes = cleanUser || cleanContact
      ? await client.execute({
          sql: `SELECT id, username, full_name, email FROM vendor_admins
                WHERE (? != '' AND LOWER(username) = ?)
                   OR (? != '' AND email IS NOT NULL AND LOWER(email) = ?)
                LIMIT 1`,
          args: [cleanUser, cleanUser, cleanContact, cleanContact],
        })
      : await client.execute({
          sql: `SELECT id, username, full_name, email FROM vendor_admins ORDER BY created_at ASC LIMIT 1`,
          args: [],
        });

    if (adminRes.rows.length === 0) return { status: 'NOT_FOUND' };
    const row = adminRes.rows[0] as Record<string, unknown>;
    return {
      status: 'FOUND',
      accountType: 'SUPER_ADMIN',
      admin: {
        id: String(row.id),
        username: String(row.username),
        fullName: String(row.full_name),
        email: row.email ? String(row.email) : null,
      },
    };
  }

  const lookup = await findShopUserForReset({
    shopSlug: input.shopSlug,
    username: input.username,
    contact: input.contact,
  });
  if (lookup.status === 'FOUND') {
    return { status: 'FOUND', accountType: 'SHOP_USER', user: lookup.user };
  }
  return lookup;
}

// Initiate Forgot Password Flow (Generates OTP + Reset Link, sends Email if configured, & stores encrypted copy for Support Queue)
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
  try {
    const client = getClient();
    const { mode = 'SHOP_USER', shopSlug, username, contact } = req.body;
    const ipAddress = getClientIp(req);
    const supportPhone = await getVendorSupportPhone();

    const target = await resolveResetTargetAccount({ mode, shopSlug, username, contact });

    if (target.status === 'AMBIGUOUS') {
      res.status(400).json({ success: false, error: target.message });
      return;
    }

    if (target.status === 'NOT_FOUND') {
      if (mode === 'SUPER_ADMIN') {
        res.json({
          success: true,
          data: {
            requestSubmitted: true,
            deliveryChannel: 'SUPPORT_QUEUE',
            maskedEmail: null,
            supportPhone,
            recoveryKeyAvailable: Boolean(process.env.SUPERADMIN_RECOVERY_KEY && process.env.SUPERADMIN_RECOVERY_KEY.trim().length >= 8),
            expiresInMinutes: RESET_TTL_MINUTES,
          },
          message: 'If a matching Super-Admin account exists, recovery instructions have been prepared.',
        });
        return;
      }
      res.status(404).json({
        success: false,
        error: 'No active account matched that email address, phone, or shop details. Check your spelling or ask your Shop Owner to reset your password.',
      });
      return;
    }

    const accountType = target.accountType;
    const userId = accountType === 'SUPER_ADMIN' ? target.admin.id : target.user.id;
    const shopId = accountType === 'SUPER_ADMIN' ? null : target.user.shopId;
    const accountUsername = accountType === 'SUPER_ADMIN' ? target.admin.username : target.user.username;
    const recipientName = accountType === 'SUPER_ADMIN' ? target.admin.fullName : target.user.fullName;
    const targetEmail = accountType === 'SUPER_ADMIN'
      ? target.admin.email
      : (target.user.userEmail || (target.user.roleId === 'ROLE_OWNER' ? target.user.shopEmail : null));

    // Cancel prior pending requests for this user
    await client.execute({
      sql: `UPDATE password_reset_tokens SET status = 'CANCELLED' WHERE account_type = ? AND user_id = ? AND status = 'PENDING'`,
      args: [accountType, userId],
    });

    const otp = crypto.randomInt(100000, 1000000).toString();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const otpHash = hashResetSecret(otp);
    const tokenHash = hashResetSecret(rawToken);
    const encryptedOtp = encryptSecret(otp);
    const encryptedToken = encryptSecret(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000).toISOString();
    const resetId = `prt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const publicBase = resolvePublicAppUrl(req);
    const resetUrl = buildResetUrl(publicBase, rawToken, accountType);

    let deliveryChannel: 'EMAIL' | 'SUPPORT_QUEUE' = 'SUPPORT_QUEUE';
    if (targetEmail && isEmailDeliveryConfigured()) {
      const emailRes = await sendPasswordResetEmail({
        to: targetEmail,
        recipientName,
        username: accountUsername,
        shopName: accountType === 'SHOP_USER' ? target.user.shopName : undefined,
        shopSlug: accountType === 'SHOP_USER' ? target.user.shopSlug : undefined,
        otp,
        resetUrl,
        expiresInMinutes: RESET_TTL_MINUTES,
      });
      if (emailRes.delivered) {
        deliveryChannel = 'EMAIL';
      }
    }

    const identifierUsed = [shopSlug, username, contact].filter(Boolean).join(' / ') || accountUsername;

    await client.execute({
      sql: `
        INSERT INTO password_reset_tokens (
          id, account_type, user_id, shop_id, username, requested_identifier,
          token_hash, otp_hash, encrypted_otp, encrypted_token,
          delivery_channel, status, expires_at, attempts, requested_ip
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 0, ?)
      `,
      args: [
        resetId,
        accountType,
        userId,
        shopId,
        accountUsername,
        identifierUsed,
        tokenHash,
        otpHash,
        encryptedOtp,
        encryptedToken,
        deliveryChannel,
        expiresAt,
        ipAddress,
      ],
    });

    if (accountType === 'SHOP_USER') {
      await client.execute({
        sql: `
          INSERT INTO saas_notifications (id, recipient_type, recipient_id, channel, title, message, metadata_json)
          VALUES (?, 'VENDOR_ADMIN', 'VND-ROOT-01', 'IN_APP', ?, ?, ?)
        `,
        args: [
          `notif_rst_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          `Password Reset Requested: ${target.user.shopName}`,
          `User "${accountUsername}" (@${target.user.shopSlug}) requested a password reset. Open Shop Logins -> Pending Reset Requests to view or share the 6-digit code.`,
          JSON.stringify({ resetId, shopId, userId, username: accountUsername }),
        ],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO saas_admin_audit_logs (id, admin_id, action, target_entity_type, target_entity_id, details_json, ip_address)
              VALUES (?, ?, 'SUPERADMIN_RESET_REQUESTED', 'VENDOR_ADMIN', ?, ?, ?)`,
        args: [
          `audit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          userId,
          userId,
          JSON.stringify({ deliveryChannel }),
          ipAddress,
        ],
      });
    }

    const maskedEmail = maskEmailAddress(targetEmail);
    res.json({
      success: true,
      data: {
        requestSubmitted: true,
        deliveryChannel,
        maskedEmail,
        supportPhone,
        recoveryKeyAvailable: accountType === 'SUPER_ADMIN'
          ? Boolean(process.env.SUPERADMIN_RECOVERY_KEY && process.env.SUPERADMIN_RECOVERY_KEY.trim().length >= 8)
          : false,
        expiresInMinutes: RESET_TTL_MINUTES,
      },
      message:
        deliveryChannel === 'EMAIL' && maskedEmail
          ? `A 6-digit verification code and direct reset link were sent to ${maskedEmail}.`
          : accountType === 'SHOP_USER'
            ? target.user.roleId === 'ROLE_OWNER'
              ? (targetEmail
                  ? `A reset link was generated. Check your inbox at ${maskedEmail || 'your registered email'}.`
                  : 'A reset request has been recorded. Check your email or ask your administrator.')
              : 'Reset request created! Check your email inbox, or ask your Shop Owner to reset your password or PIN in Shop Settings -> Staff Accounts.'
            : 'Super-Admin reset request recorded. Check the configured email or enter your emergency SUPERADMIN_RECOVERY_KEY.',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

async function locatePendingResetRow(input: {
  token?: string;
  otp?: string;
  mode?: 'SHOP_USER' | 'SUPER_ADMIN';
  shopSlug?: string;
  username?: string;
  contact?: string;
}): Promise<{
  error?: { status: number; message: string };
  row?: Record<string, unknown>;
}> {
  const client = getClient();

  if (input.token) {
    const tHash = hashResetSecret(input.token);
    const res = await client.execute({
      sql: `
        SELECT prt.*, s.name AS shop_name, s.slug AS shop_slug
        FROM password_reset_tokens prt
        LEFT JOIN shops s ON s.id = prt.shop_id
        WHERE prt.token_hash = ? AND prt.status = 'PENDING'
        LIMIT 1
      `,
      args: [tHash],
    });
    if (res.rows.length === 0) {
      return { error: { status: 400, message: 'This password reset link is invalid or has already been used.' } };
    }
    const row = res.rows[0] as Record<string, unknown>;
    const rowId = String(row.id);
    if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
      await client.execute({ sql: `UPDATE password_reset_tokens SET status = 'CANCELLED' WHERE id = ?`, args: [rowId] });
      return { error: { status: 400, message: 'This password reset link has expired. Please request a new one.' } };
    }
    return { row };
  }

  const target = await resolveResetTargetAccount({
    mode: input.mode,
    shopSlug: input.shopSlug,
    username: input.username,
    contact: input.contact,
  });
  if (target.status === 'AMBIGUOUS') {
    return { error: { status: 400, message: target.message } };
  }
  if (target.status === 'NOT_FOUND') {
    return { error: { status: 400, message: 'No active pending password reset request found for this account.' } };
  }

  const targetUserId = target.accountType === 'SUPER_ADMIN' ? target.admin.id : target.user.id;
  const res = await client.execute({
    sql: `
      SELECT prt.*, s.name AS shop_name, s.slug AS shop_slug
      FROM password_reset_tokens prt
      LEFT JOIN shops s ON s.id = prt.shop_id
      WHERE prt.account_type = ? AND prt.user_id = ? AND prt.status = 'PENDING'
      ORDER BY prt.created_at DESC
      LIMIT 1
    `,
    args: [target.accountType, targetUserId],
  });

  if (res.rows.length === 0) {
    return { error: { status: 400, message: 'No active reset request found. Please request a new verification code first.' } };
  }

  const row = res.rows[0] as Record<string, unknown>;
  const rowId = String(row.id);
  if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
    await client.execute({ sql: `UPDATE password_reset_tokens SET status = 'CANCELLED' WHERE id = ?`, args: [rowId] });
    return { error: { status: 400, message: 'Your 6-digit verification code has expired. Please request a new code.' } };
  }

  const attempts = Number(row.attempts || 0);
  if (attempts >= MAX_RESET_ATTEMPTS) {
    await client.execute({ sql: `UPDATE password_reset_tokens SET status = 'CANCELLED' WHERE id = ?`, args: [rowId] });
    return { error: { status: 429, message: 'Too many invalid verification attempts. Please request a new reset code.' } };
  }

  const suppliedOtpHash = hashResetSecret(input.otp || '');
  if (!timingSafeEqualHex(suppliedOtpHash, String(row.otp_hash))) {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= MAX_RESET_ATTEMPTS) {
      await client.execute({
        sql: `UPDATE password_reset_tokens SET attempts = ?, status = 'CANCELLED' WHERE id = ?`,
        args: [nextAttempts, rowId],
      });
      return { error: { status: 429, message: 'Verification code locked after 5 failed attempts. Please request a new code.' } };
    }
    await client.execute({
      sql: `UPDATE password_reset_tokens SET attempts = ? WHERE id = ?`,
      args: [nextAttempts, rowId],
    });
    const remaining = MAX_RESET_ATTEMPTS - nextAttempts;
    return { error: { status: 400, message: `Invalid 6-digit verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` } };
  }

  return { row };
}

// Verify a reset token or 6-digit OTP without consuming it
authRouter.post('/reset-password/verify', validateBody(verifyResetSchema), async (req, res) => {
  try {
    const located = await locatePendingResetRow(req.body);
    if (located.error || !located.row) {
      res.status(located.error?.status || 400).json({ success: false, error: located.error?.message || 'Invalid reset request.' });
      return;
    }

    const row = located.row;
    res.json({
      success: true,
      data: {
        valid: true,
        accountType: String(row.account_type),
        username: String(row.username),
        shopName: row.shop_name ? String(row.shop_name) : null,
        shopSlug: row.shop_slug ? String(row.shop_slug) : null,
        expiresAt: String(row.expires_at),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Complete Password Reset via Token, 6-Digit OTP, or Super-Admin Recovery Key
authRouter.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const client = getClient();
    const ipAddress = getClientIp(req);
    const { recoveryKey, newPassword, newPin, mode, shopSlug, username, contact, token, otp } = req.body;

    if (recoveryKey) {
      if (mode !== 'SUPER_ADMIN') {
        res.status(400).json({ success: false, error: 'Emergency recovery key is only valid for Super-Admin recovery.' });
        return;
      }
      const envKey = process.env.SUPERADMIN_RECOVERY_KEY?.trim() || '';
      if (!envKey || envKey.length < 8) {
        res.status(400).json({ success: false, error: 'Super-Admin emergency recovery key is not configured on this server.' });
        return;
      }
      if (!timingSafeEqualHex(hashResetSecret(recoveryKey), hashResetSecret(envKey))) {
        res.status(401).json({ success: false, error: 'Invalid Super-Admin recovery key.' });
        return;
      }
      const target = await resolveResetTargetAccount({ mode: 'SUPER_ADMIN', username, contact });
      if (target.status !== 'FOUND' || target.accountType !== 'SUPER_ADMIN') {
        res.status(404).json({ success: false, error: 'Super-Admin account not found.' });
        return;
      }
      await applyUserPasswordUpdate({
        accountType: 'SUPER_ADMIN',
        userId: target.admin.id,
        newPassword,
        actorId: target.admin.id,
        auditAction: 'SUPERADMIN_PASSWORD_RESET_BY_RECOVERY_KEY',
        ipAddress,
      });
      res.json({
        success: true,
        data: { accountType: 'SUPER_ADMIN', username: target.admin.username },
        message: 'Super-Admin password updated successfully. You can now sign in with your new password.',
      });
      return;
    }

    const located = await locatePendingResetRow({ token, otp, mode, shopSlug, username, contact });
    if (located.error || !located.row) {
      res.status(located.error?.status || 400).json({ success: false, error: located.error?.message || 'Invalid or expired reset code.' });
      return;
    }

    const row = located.row;
    const accountType = String(row.account_type) === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SHOP_USER';
    const userId = String(row.user_id);
    const shopId = row.shop_id ? String(row.shop_id) : null;

    await applyUserPasswordUpdate({
      accountType,
      userId,
      shopId,
      newPassword,
      newPin: accountType === 'SHOP_USER' ? newPin : undefined,
      actorId: userId,
      auditAction: accountType === 'SUPER_ADMIN' ? 'SUPERADMIN_PASSWORD_RESET' : 'PASSWORD_RESET_COMPLETED',
      ipAddress,
    });

    await client.execute({
      sql: `UPDATE password_reset_tokens SET status = 'USED', used_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [String(row.id)],
    });

    res.json({
      success: true,
      data: {
        accountType,
        username: String(row.username),
        shopSlug: row.shop_slug ? String(row.shop_slug) : null,
      },
      message: 'Your password has been reset successfully. You can now sign in.',
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Authenticated Self-Service Password Change (Shop Owner, Staff, or Super-Admin)
authRouter.put('/change-password', authenticateToken, validateBody(changePasswordSchema), async (req, res) => {
  try {
    const client = getClient();
    const { currentPassword, newPassword, newPin } = req.body;
    const ipAddress = getClientIp(req);

    if (req.user!.isSuperAdmin) {
      const adminRes = await client.execute({
        sql: `SELECT id, password_hash FROM vendor_admins WHERE id = ? LIMIT 1`,
        args: [req.user!.userId],
      });
      if (adminRes.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Admin account not found.' });
        return;
      }
      if (!verifyPassword(currentPassword, String(adminRes.rows[0].password_hash))) {
        res.status(401).json({ success: false, error: 'Current password is incorrect.' });
        return;
      }
      await applyUserPasswordUpdate({
        accountType: 'SUPER_ADMIN',
        userId: req.user!.userId,
        newPassword,
        actorId: req.user!.userId,
        auditAction: 'SUPERADMIN_PASSWORD_CHANGED',
        ipAddress,
      });
      res.json({ success: true, message: 'Super-Admin password updated successfully.' });
      return;
    }

    if (!req.user!.shopId) {
      res.status(403).json({ success: false, error: 'Shop workspace context required.' });
      return;
    }

    const userRes = await client.execute({
      sql: `SELECT id, password_hash FROM users WHERE id = ? AND shop_id = ? LIMIT 1`,
      args: [req.user!.userId, req.user!.shopId],
    });
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User account not found.' });
      return;
    }
    if (!verifyPassword(currentPassword, String(userRes.rows[0].password_hash))) {
      res.status(401).json({ success: false, error: 'Current password is incorrect.' });
      return;
    }

    await applyUserPasswordUpdate({
      accountType: 'SHOP_USER',
      userId: req.user!.userId,
      shopId: req.user!.shopId,
      newPassword,
      newPin,
      actorId: req.user!.userId,
      auditAction: 'PASSWORD_CHANGED_SELF',
      ipAddress,
    });

    res.json({ success: true, message: 'Your password has been updated successfully.' });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Shop Owner: List Pending Password Reset Requests for Staff in Own Shop
authRouter.get('/password-reset-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user!.roleId !== 'ROLE_OWNER' || !req.user!.shopId) {
      res.status(403).json({ success: false, error: 'Only the Shop Owner can view staff password reset requests.' });
      return;
    }

    const client = getClient();
    const publicBase = resolvePublicAppUrl(req);
    const result = await client.execute({
      sql: `
        SELECT prt.id, prt.user_id, prt.username, prt.encrypted_otp, prt.encrypted_token,
               prt.delivery_channel, prt.expires_at, prt.created_at,
               u.full_name, u.role_id, u.phone
        FROM password_reset_tokens prt
        INNER JOIN users u ON u.id = prt.user_id AND u.shop_id = prt.shop_id
        WHERE prt.account_type = 'SHOP_USER'
          AND prt.shop_id = ?
          AND prt.status = 'PENDING'
          AND datetime(prt.expires_at) > datetime('now')
        ORDER BY prt.created_at DESC
        LIMIT 25
      `,
      args: [req.user!.shopId],
    });

    const data = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      const otp = r.encrypted_otp ? decryptSecret(String(r.encrypted_otp)) : '';
      const rawToken = r.encrypted_token ? decryptSecret(String(r.encrypted_token)) : '';
      return {
        id: String(r.id),
        userId: String(r.user_id),
        username: String(r.username),
        fullName: String(r.full_name || r.username),
        roleId: String(r.role_id),
        phone: r.phone ? String(r.phone) : null,
        otp,
        resetUrl: rawToken ? buildResetUrl(publicBase, rawToken, 'SHOP_USER') : '',
        deliveryChannel: String(r.delivery_channel || 'SUPPORT_QUEUE'),
        expiresAt: String(r.expires_at),
        createdAt: String(r.created_at),
      };
    });

    res.json({ success: true, data });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Shop Owner: Directly Issue a New Temporary Password / PIN for a Staff User in Own Shop
authRouter.post('/users/:userId/reset-password', authenticateToken, validateBody(ownerResetStaffSchema), async (req, res) => {
  try {
    if (req.user!.roleId !== 'ROLE_OWNER' || !req.user!.shopId) {
      res.status(403).json({ success: false, error: 'Only the Shop Owner can reset staff passwords.' });
      return;
    }

    const client = getClient();
    const { userId } = req.params;
    const { newPassword, newPin } = req.body;
    const ipAddress = getClientIp(req);

    const targetRes = await client.execute({
      sql: `SELECT id, username, full_name, role_id, phone, pin_code FROM users WHERE id = ? AND shop_id = ? LIMIT 1`,
      args: [String(userId), req.user!.shopId],
    });
    if (targetRes.rows.length === 0) {
      res.status(404).json({ success: false, error: 'User not found in your shop.' });
      return;
    }

    const target = targetRes.rows[0] as Record<string, unknown>;
    const tempPassword = (newPassword && newPassword.trim()) || generateReadableTempPassword(10);
    const nextPin = (newPin && newPin.trim()) || (target.pin_code ? String(target.pin_code) : undefined);

    await applyUserPasswordUpdate({
      accountType: 'SHOP_USER',
      userId: String(target.id),
      shopId: req.user!.shopId,
      newPassword: tempPassword,
      newPin: nextPin,
      actorId: req.user!.userId,
      auditAction: 'OWNER_RESET_USER_PASSWORD',
      ipAddress,
    });

    await client.execute({
      sql: `UPDATE password_reset_tokens SET status = 'CANCELLED' WHERE account_type = 'SHOP_USER' AND user_id = ? AND shop_id = ? AND status = 'PENDING'`,
      args: [String(target.id), req.user!.shopId],
    });

    res.json({
      success: true,
      data: {
        userId: String(target.id),
        username: String(target.username),
        fullName: String(target.full_name),
        phone: target.phone ? String(target.phone) : null,
        temporaryPassword: tempPassword,
        pinCode: nextPin || null,
      },
      message: `Credentials updated for ${String(target.full_name)}.`,
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

