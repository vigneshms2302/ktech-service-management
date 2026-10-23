import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = formatZodErrors(result.error);
      res.status(400).json({
        success: false,
        error: errorMessages[0] || 'Invalid request payload.',
        details: errorMessages,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errorMessages = formatZodErrors(result.error);
      res.status(400).json({
        success: false,
        error: errorMessages[0] || 'Invalid query parameters.',
        details: errorMessages,
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errorMessages = formatZodErrors(result.error);
      res.status(400).json({
        success: false,
        error: errorMessages[0] || 'Invalid URL parameters.',
        details: errorMessages,
      });
      return;
    }
    req.params = result.data as any;
    next();
  };
}

function formatZodErrors(error: ZodError): string[] {
  const issues = (error && (error.issues || (error as any).errors)) || [];
  if (!Array.isArray(issues) || issues.length === 0) {
    return [error.message || 'Validation error'];
  }
  return issues.map((e: any) => {
    const field = e.path && e.path.length > 0 ? e.path.join('.') : '';
    return field ? `${field}: ${e.message}` : e.message;
  });
}
