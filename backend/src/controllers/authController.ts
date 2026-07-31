import { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import argon2 from 'argon2';
import prisma from '../prisma/client';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/jwt';

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
};

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as any;

  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password required' });
  }

  const host = await prisma.host.findUnique({ where: { username } });
  if (!host) {
    // Avoid timing attacks by still hashing
    await argon2.hash('dummy_password');
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  // Check lockout
  const anyHost = host as any;
  if (anyHost.lockoutUntil && new Date(anyHost.lockoutUntil) > new Date()) {
    return reply.status(429).send({ error: 'Too many failed attempts. Try again later.' });
  }

  const valid = await argon2.verify(host.passwordHash, password).catch(() => false);
  
  if (!valid) {
    try {
      await (prisma.host as any).update({
        where: { id: host.id },
        data: {
          failedLoginAttempts: { increment: 1 },
          lockoutUntil: anyHost.failedLoginAttempts >= 4 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        }
      });
    } catch {} // Ignore if schema not migrated
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  // Reset lockout
  try {
    await (prisma.host as any).update({
      where: { id: host.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null }
    });
  } catch {}

  const accessToken = signAccessToken({ role: 'host', hostId: host.id, username: host.username });
  const refreshToken = signRefreshToken({ role: 'host', hostId: host.id, username: host.username });

  try {
    await (prisma as any).refreshToken.create({
      data: {
        token: refreshToken,
        hostId: host.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  } catch {} // Ignore if schema not migrated

  reply.setCookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
  reply.setCookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });

  return reply.send({ success: true, username: host.username, hostId: host.id });
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as any;

  if (!username || !password || password.length < 8) {
    return reply.status(400).send({ error: 'Valid username and password (min 8 chars) required' });
  }

  const existingHost = await prisma.host.findUnique({ where: { username } });
  if (existingHost) {
    return reply.status(400).send({ error: 'Username already taken' });
  }

  const passwordHash = await argon2.hash(password);
  const host = await prisma.host.create({
    data: { username, passwordHash },
  });

  const accessToken = signAccessToken({ role: 'host', hostId: host.id, username: host.username });
  const refreshToken = signRefreshToken({ role: 'host', hostId: host.id, username: host.username });

  try {
    await (prisma as any).refreshToken.create({
      data: {
        token: refreshToken,
        hostId: host.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  } catch {} // Ignore if schema not migrated

  reply.setCookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
  reply.setCookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });

  return reply.status(201).send({ success: true, username: host.username, hostId: host.id });
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies.refreshToken;
  if (!token) return reply.status(401).send({ error: 'No refresh token' });

  const payload = verifyRefreshToken(token);
  if (!payload) return reply.status(401).send({ error: 'Invalid refresh token' });

  // Optional: check DB if token is revoked
  
  const newAccessToken = signAccessToken({ role: 'host', hostId: payload.hostId, username: payload.username });
  reply.setCookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });

  return reply.send({ success: true });
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies.refreshToken;
  if (token) {
    try {
      await (prisma as any).refreshToken.update({
        where: { token },
        data: { revoked: true }
      });
    } catch {}
  }

  reply.clearCookie('accessToken', { path: '/' });
  reply.clearCookie('refreshToken', { path: '/' });
  return reply.send({ success: true });
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  // Uses middleware in route, so if we reach here we are authenticated
  const host = (request as any).user;
  return reply.send({ authenticated: true, username: host.username, hostId: host.hostId });
}
