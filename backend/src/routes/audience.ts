import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../prisma/client';
import { verifyToken, isHost } from '../services/jwt';

function requireHost(request: FastifyRequest, reply: FastifyReply): boolean {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  const payload = verifyToken(auth.slice(7));
  if (!isHost(payload)) {
    reply.status(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export async function audienceRoutes(fastify: FastifyInstance) {
  // Get all viewers
  fastify.get('/audience', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    const viewers = await prisma.viewer.findMany({
      orderBy: { joinTime: 'asc' },
    });
    return reply.send({ viewers });
  });

  // Clear all viewers
  fastify.delete('/audience', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    await prisma.viewer.deleteMany();
    return reply.send({ message: 'All audience records cleared' });
  });

  // Export CSV
  fastify.get('/audience/export', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    const viewers = await prisma.viewer.findMany({
      orderBy: { joinTime: 'asc' },
    });

    const header = 'Name,DOB,IP,Browser,Session ID,Join Time,Last Seen,Online\n';
    const rows = viewers
      .map(
        (v) =>
          `"${v.name}","${v.dob}","${v.ip}","${v.browser}","${v.sessionId}","${v.joinTime.toISOString()}","${v.lastSeen.toISOString()}","${v.isOnline}"`
      )
      .join('\n');

    const csv = header + rows;
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="audience.csv"')
      .send(csv);
  });
}
