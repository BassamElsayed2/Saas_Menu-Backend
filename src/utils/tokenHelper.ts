import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
}

export function generateRandomToken(): string {
  return jwt.sign(
    { random: Math.random().toString(36) },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '24h' }
  );
}


