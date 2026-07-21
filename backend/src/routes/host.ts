import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { verifyToken, isHost } from '../services/jwt';
import { getState, updateState } from '../services/state';
import { broadcast, broadcastToViewers, getViewerCount } from '../websocket/handler';

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

export async function hostRoutes(fastify: FastifyInstance) {
  // Presentation control
  fastify.post(
    '/presentation/control',
    {
      schema: {
        body: {
          type: 'object',
          required: ['action'],
          properties: {
            action: {
              type: 'string',
              enum: [
                'start',
                'end',
                'next',
                'prev',
                'jump',
                'black',
                'unblack',
                'reveal',
                'setTotalSlides',
              ],
            },
            slide: { type: 'number' },
            totalSlides: { type: 'number' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireHost(request, reply)) return;
      const { action, slide, totalSlides } = request.body as {
        action: string;
        slide?: number;
        totalSlides?: number;
      };

      const state = await getState();

      switch (action) {
        case 'start': {
          await updateState({ isStarted: true, isBlackScreen: false, currentSlide: 1 });
          broadcast({ type: 'presentationStarted', totalSlides: state.totalSlides });
          break;
        }
        case 'end': {
          await updateState({ isStarted: false, currentSlide: 1 });
          broadcast({ type: 'presentationEnded' });
          break;
        }
        case 'next': {
          const nextSlide = Math.min(state.currentSlide + 1, state.totalSlides || 9999);
          await updateState({ currentSlide: nextSlide });
          broadcast({ type: 'slideChange', slide: nextSlide, activeFile: state.activeFile });
          break;
        }
        case 'prev': {
          const prevSlide = Math.max(state.currentSlide - 1, 1);
          await updateState({ currentSlide: prevSlide });
          broadcast({ type: 'slideChange', slide: prevSlide, activeFile: state.activeFile });
          break;
        }
        case 'jump': {
          if (slide === undefined) return reply.status(400).send({ error: 'slide required' });
          const clamped = Math.max(1, Math.min(slide, state.totalSlides || 9999));
          await updateState({ currentSlide: clamped });
          broadcast({ type: 'slideChange', slide: clamped, activeFile: state.activeFile });
          break;
        }
        case 'black': {
          await updateState({ isBlackScreen: true });
          broadcastToViewers({ type: 'blackScreen', active: true, activeFile: state.activeFile });
          break;
        }
        case 'unblack': {
          await updateState({ isBlackScreen: false });
          broadcastToViewers({ type: 'blackScreen', active: false, activeFile: state.activeFile });
          break;
        }
        case 'reveal': {
          broadcastToViewers({ type: 'reveal', activeFile: state.activeFile });
          break;
        }
        case 'setTotalSlides': {
          if (totalSlides !== undefined) {
            await updateState({ totalSlides });
          }
          break;
        }
      }

      const newState = await getState();
      return reply.send({
        currentSlide: newState.currentSlide,
        totalSlides: newState.totalSlides,
        isStarted: newState.isStarted,
        isBlackScreen: newState.isBlackScreen,
        viewerCount: getViewerCount(),
      });
    }
  );

  // Get current state (for host panel load)
  fastify.get('/state', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    const state = await getState();
    return reply.send({ ...state, viewerCount: getViewerCount() });
  });

  // Change password
  fastify.put(
    '/password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireHost(request, reply)) return;
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      const host = await prisma.hostConfig.findFirst();
      if (!host) return reply.status(500).send({ error: 'Host not configured' });

      const valid = await bcrypt.compare(currentPassword, host.passwordHash);
      if (!valid) return reply.status(401).send({ error: 'Current password incorrect' });

      const hash = await bcrypt.hash(newPassword, 12);
      await prisma.hostConfig.update({
        where: { id: host.id },
        data: { passwordHash: hash },
      });

      return reply.send({ message: 'Password updated successfully' });
    }
  );

  // Get presenter notes
  fastify.get('/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    const state = await getState();
    let notes: Record<string, string> = {};
    try {
      notes = JSON.parse(state.presenterNotes);
    } catch {}
    return reply.send({ notes });
  });

  // Save presenter notes
  fastify.put(
    '/notes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['notes'],
          properties: {
            notes: { type: 'object' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireHost(request, reply)) return;
      const { notes } = request.body as { notes: Record<string, string> };
      await updateState({ presenterNotes: JSON.stringify(notes) });
      return reply.send({ message: 'Notes saved' });
    }
  );

  // Live viewer count
  fastify.get('/viewers/count', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    return reply.send({ count: getViewerCount() });
  });

  // Clear all data
  fastify.post('/data/clear', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;

    await prisma.viewer.deleteMany();
    await updateState({
      activeFile: null,
      currentSlide: 1,
      totalSlides: 0,
      isStarted: false,
      isBlackScreen: false,
      presenterNotes: '{}',
    });

    broadcast({ type: 'presentationEnded' });
    broadcast({ type: 'viewerCountChanged', count: 0 });

    return reply.send({ message: 'All data cleared successfully' });
  });
}
