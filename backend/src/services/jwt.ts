import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seminar-fallback-secret';
const JWT_EXPIRES_IN = '24h';

export interface HostPayload {
  role: 'host';
  hostId: string;
  username: string;
}

export type JWTPayload = HostPayload;

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function isHost(payload: JWTPayload | null): payload is HostPayload {
  return payload?.role === 'host';
}
