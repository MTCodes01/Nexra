import { FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import { verifyAccessToken, isHost, HostPayload } from '../services/jwt';

export function requireHost(request: FastifyRequest, reply: FastifyReply): HostPayload | null {
  // First try to read from cookie
  let token = request.cookies?.accessToken;
  
  // Fallback to Authorization header if no cookie (for API clients)
  if (!token) {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      token = auth.slice(7);
    }
  }

  if (!token) {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
  
  const payload = verifyAccessToken(token);
  if (!isHost(payload)) {
    reply.status(403).send({ error: 'Forbidden' });
    return null;
  }
  return payload;
}
