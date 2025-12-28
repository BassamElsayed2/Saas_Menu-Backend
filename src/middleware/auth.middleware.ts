import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/tokenHelper';
import { ROLES } from '../config/constants';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  verifyToken(req, res, next);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  verifyToken(req, res, () => {
    if (req.user?.role !== ROLES.ADMIN) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

export async function requireEmailVerified(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // This will be checked in the database when needed
  // For now, we'll add it to user verification in controllers
  next();
}


