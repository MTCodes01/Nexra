import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../prisma/client';
import { requireHost } from '../middlewares/auth';
import { v4 as uuidv4 } from 'uuid';

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function startSession(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { presentationId } = request.body as { presentationId: string };

  const presentation = await prisma.presentation.findFirst({
    where: { id: presentationId, hostId: host.hostId },
  });

  if (!presentation) {
    return reply.status(404).send({ error: 'Presentation not found' });
  }

  // End any existing active sessions for this host
  await prisma.session.updateMany({
    where: { hostId: host.hostId, isActive: true },
    data: { isActive: false, endedTime: new Date() },
  });

  let sessionCode = generateSessionCode();
  while (await prisma.session.findUnique({ where: { sessionCode } })) {
    sessionCode = generateSessionCode();
  }

  const session = await prisma.session.create({
    data: {
      sessionCode,
      hostId: host.hostId,
      presentationId,
      settings: {
        create: {
          allowManualReading: true,
          enableDownload: true,
          enableViewerCount: true,
        },
      },
    },
    include: { settings: true, presentation: true },
  });

  return reply.send(session);
}

export async function endSession(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { id } = request.params as { id: string };

  const session = await prisma.session.update({
    where: { id, hostId: host.hostId },
    data: { isActive: false, endedTime: new Date() },
  });

  return reply.send(session);
}

export async function getSession(request: FastifyRequest, reply: FastifyReply) {
  const { code } = request.params as { code: string };

  const session = await prisma.session.findUnique({
    where: { sessionCode: code.toUpperCase() },
    include: { presentation: true, settings: true },
  });

  if (!session || !session.isActive) {
    return reply.status(404).send({ error: 'Session not found or ended' });
  }

  return reply.send({
    sessionCode: session.sessionCode,
    currentSlide: session.currentSlide,
    presentationId: session.presentation.id,
    presentationTitle: session.presentation.title,
    slideCount: session.presentation.slideCount,
    settings: session.settings,
    viewerCount: session.viewerCount,
  });
}

export async function updateSessionSettings(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { id } = request.params as { id: string };
  const data = request.body as any;

  const session = await prisma.session.findFirst({
    where: { id, hostId: host.hostId },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  const settings = await prisma.sessionSettings.update({
    where: { sessionId: session.id },
    data,
  });

  return reply.send(settings);
}
