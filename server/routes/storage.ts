import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.ts';
import { getStorageProvider } from '../storage/storageAdapter.ts';
import { config } from '../config.ts';

export const storageRouter = Router();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '10485760', 10); // 10MB

/**
 * 1. Upload File (Payment proofs, Device Photos, Job Attachments, Shop Logos)
 * Strictly authenticated & scoped to the user's shopId.
 */
storageRouter.post('/upload', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, base64Data, category = 'JOB_ATTACHMENT', isPrivate = true } = req.body;

    if (!fileName || !base64Data) {
      res.status(400).json({ success: false, error: 'Both fileName and base64Data are required.' });
      return;
    }

    const cleanContentType = (fileType || 'application/octet-stream').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(cleanContentType)) {
      res.status(400).json({
        success: false,
        error: `File type "${cleanContentType}" is not allowed. Supported formats: JPEG, PNG, WEBP, GIF, PDF.`,
      });
      return;
    }

    // Strip data URL header if present
    const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');

    if (buffer.length > MAX_UPLOAD_SIZE) {
      res.status(400).json({
        success: false,
        error: `File size exceeds the limit of ${Math.round(MAX_UPLOAD_SIZE / (1024 * 1024))}MB.`,
      });
      return;
    }

    const shopId = req.user!.shopId;
    const provider = getStorageProvider();

    const result = await provider.upload({
      fileName: fileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      contentType: cleanContentType,
      buffer,
      shopId,
      category,
      isPrivate: Boolean(isPrivate),
    });

    res.json({
      success: true,
      data: {
        fileKey: result.fileKey,
        fileName: result.fileName,
        fileSizeBytes: result.fileSizeBytes,
        contentType: result.contentType,
        category: result.category,
        isPrivate: result.isPrivate,
        url: `/api/storage/files/${result.fileKey}`,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * 2. Download / View Stored File
 * Strictly verifies authorization for private files (payment proofs, attachments, device photos).
 */
storageRouter.use('/files', async (req: Request, res: Response) => {
  try {
    const fullPath = req.path.replace(/^\//, '');
    if (!fullPath || fullPath.includes('..')) {
      res.status(400).json({ success: false, error: 'Invalid file path.' });
      return;
    }

    // Determine target shop from the path (key format: "{shopId}/{category}/{id}.ext")
    const parts = fullPath.split('/');
    const targetShopId = parts[0];
    const category = (parts[1] || '').toLowerCase();

    // Logos are public; proofs, photos, and attachments are private
    const isPublicCategory = category === 'logos' || category === 'shop_logo' || category === 'public';

    if (!isPublicCategory) {
      // Must authenticate
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      if (!token) {
        res.status(401).json({ success: false, error: 'Authentication required to access private storage files.' });
        return;
      }

      // Verify token
      const jwt = (await import('jsonwebtoken')).default;
      let decoded: any;
      try {
        decoded = jwt.verify(token, config.JWT_SECRET);
      } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
        return;
      }

      // Check tenant isolation: caller must be from targetShopId OR Super Admin
      if (!decoded.isSuperAdmin && decoded.shopId !== targetShopId) {
        res.status(403).json({
          success: false,
          error: 'Access Denied: You do not have permission to access files belonging to another shop organization.',
        });
        return;
      }
    }

    const provider = getStorageProvider();
    const { buffer, contentType } = await provider.download(fullPath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (error: unknown) {
    const msg = (error as Error).message || '';
    if (msg.includes('not found')) {
      res.status(404).json({ success: false, error: 'File not found.' });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
});
