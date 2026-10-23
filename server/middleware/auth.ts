import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getClient } from '../db/database.ts';
import { config } from '../config.ts';

export interface AuthUserPayload {
  userId: string;
  shopId: string;
  username: string;
  fullName: string;
  roleId: string;
  permissions: string[];
  isSuperAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function generateToken(payload: AuthUserPayload, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: expiresIn as any });
}

export function hashPassword(plainText: string): string {
  return bcrypt.hashSync(plainText, 10);
}

export function verifyPassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

/**
 * Extracts and verifies JWT, injecting req.user.
 * Also enforces shop active status (blocking frozen/expired shops).
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUserPayload;
    req.user = decoded;

    // If Super-Admin, allow all operations
    if (decoded.isSuperAdmin) {
      next();
      return;
    }

    const client = getClient();

    // Check user active status
    const userRes = await client.execute({
      sql: `SELECT is_active FROM users WHERE id = ? AND shop_id = ?`,
      args: [decoded.userId, decoded.shopId],
    });

    if (userRes.rows.length === 0 || Number((userRes.rows[0] as Record<string, unknown>).is_active) === 0) {
      res.status(401).json({ success: false, error: 'User account has been deactivated or removed.' });
      return;
    }

    // Check if tenant shop is active
    const shopRes = await client.execute({
      sql: `SELECT status, subscription_ends_at FROM shops WHERE id = ?`,
      args: [decoded.shopId],
    });

    if (shopRes.rows.length === 0) {
      res.status(403).json({ success: false, error: 'Shop organization not found.' });
      return;
    }

    const shop = shopRes.rows[0] as Record<string, unknown>;
    let status = String(shop.status);

    // Evaluate subscription expiry based on authoritative server timestamp
    const subEnds = shop.subscription_ends_at ? new Date(String(shop.subscription_ends_at)).getTime() : null;
    const isPastDue = subEnds !== null && subEnds < Date.now();

    if (isPastDue && status !== 'FROZEN') {
      status = 'EXPIRED';
      client.execute({
        sql: `UPDATE shops SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [decoded.shopId],
      }).catch(() => {});
    }

    if (status === 'FROZEN') {
      const reqUrl = (req.originalUrl || req.baseUrl + req.path).toLowerCase();
      const isAllowedExemption =
        reqUrl.includes('/api/subscription') ||
        reqUrl.includes('/api/auth/me') ||
        reqUrl.includes('/api/auth/logout') ||
        reqUrl.includes('/api/public');

      if (!isAllowedExemption) {
        res.status(403).json({
          success: false,
          error: 'Your shop subscription is frozen. Please contact platform support or renew your subscription.',
          code: 'SHOP_FROZEN',
        });
        return;
      }
    } else if (status === 'EXPIRED') {
      // Allow read operations (GET/HEAD) for data retention, and allow renewal/auth endpoints
      const isReadRequest = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
      const reqUrl = (req.originalUrl || req.baseUrl + req.path).toLowerCase();
      const isAllowedExemption =
        reqUrl.includes('/api/subscription') ||
        reqUrl.includes('/api/auth/me') ||
        reqUrl.includes('/api/auth/logout') ||
        reqUrl.includes('/api/public');

      if (!isReadRequest && !isAllowedExemption) {
        res.status(403).json({
          success: false,
          error: 'Your shop subscription has expired. Prohibited writes are blocked. Please renew your annual subscription to resume full workspace access.',
          code: 'SHOP_EXPIRED',
        });
        return;
      }
    }

    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Session token has expired. Please log in again.' });
      return;
    }
    res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
  }
}

/**
 * Middleware restricting access to Vendor Super-Admin.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.isSuperAdmin) {
    res.status(403).json({ success: false, error: 'Access Denied: Vendor Super-Admin access required.' });
    return;
  }
  next();
}

/**
 * Middleware restricting access to specific roles.
 */
export function requireRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }
    if (req.user.isSuperAdmin || allowedRoles.includes(req.user.roleId)) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Access Denied: Insufficient user role permissions.' });
  };
}
