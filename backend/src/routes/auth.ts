import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { signToken } from '../services/jwt';
import { v4 as uuidv4 } from 'uuid';

function getBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Unknown';
}

function getIP(request: FastifyRequest): string {
  // Trust Cloudflare and reverse proxy headers
  const cfIP = request.headers['cf-connecting-ip'];
  if (cfIP && typeof cfIP === 'string') return cfIP;
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return request.ip || '0.0.0.0';
}

export async function authRoutes(fastify: FastifyInstance) {
  // Audience login
  fastify.post(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'dob'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            dob: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, dob } = request.body as { name: string; dob: string };
      const ip = getIP(request);
      const ua = request.headers['user-agent'] || '';
      const browser = getBrowser(ua);
      const sessionId = uuidv4();

      await prisma.viewer.create({
        data: {
          name: name.trim(),
          dob,
          ip,
          browser,
          sessionId,
          isOnline: true,
        },
      });

      const token = signToken({ role: 'viewer', sessionId, name: name.trim() });
      return reply.send({ token, sessionId });
    }
  );

  // Host login
  fastify.post(
    '/host',
    {
      schema: {
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { password } = request.body as { password: string };

      const host = await prisma.hostConfig.findFirst();
      if (!host) {
        return reply.status(500).send({ error: 'Host not configured' });
      }

      const valid = await bcrypt.compare(password, host.passwordHash);
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid password' });
      }

      const token = signToken({ role: 'host', username: host.username });
      return reply.send({ token, username: host.username });
    }
  );
}
