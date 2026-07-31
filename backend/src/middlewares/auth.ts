import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, isHost, HostPayload } from '../services/jwt';

export function requireHost(request: FastifyRequest, reply: FastifyReply): HostPayload | null {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!isHost(payload)) {
    reply.status(403).send({ error: 'Forbidden' });
    return null;
  }
  return payload;
}
