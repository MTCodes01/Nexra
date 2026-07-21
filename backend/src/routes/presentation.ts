import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import { getState, updateState } from '../services/state';
import { broadcast, broadcastToHosts } from '../websocket/handler';
import { verifyToken, isViewer, isHost } from '../services/jwt';
import { MultipartFile } from '@fastify/multipart';

function requireAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    reply.status(401).send({ error: 'Invalid token' });
    return false;
  }
  return true;
}

function requireHost(request: FastifyRequest, reply: FastifyReply): boolean {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  const token = auth.slice(7);
  const payload = verifyToken(token);
  if (!isHost(payload)) {
    reply.status(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}

function getStoragePath(): string {
  const storagePath = process.env.STORAGE_PATH || './storage/presentations';
  const absolute = storagePath.startsWith('.')
    ? join(process.cwd(), storagePath)
    : storagePath;
  if (!existsSync(absolute)) {
    mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}

export async function presentationRoutes(fastify: FastifyInstance) {
  // Get presentation status (public after auth)
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAuth(request, reply)) return;
    const state = await getState();
    return reply.send({
      activeFile: state.activeFile,
      currentSlide: state.currentSlide,
      totalSlides: state.totalSlides,
      isStarted: state.isStarted,
      isBlackScreen: state.isBlackScreen,
    });
  });

  // Download the active PDF
  fastify.get('/pdf', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAuth(request, reply)) return;
    const state = await getState();
    const query = request.query as { v?: string };
    
    // Serve the requested file if specified in the query string,
    // otherwise fallback to the current active file
    const requestedFile = query.v || state.activeFile;
    
    if (!requestedFile) {
      return reply.status(404).send({ error: 'No presentation loaded' });
    }
    const filePath = join(getStoragePath(), requestedFile);
    if (!existsSync(filePath)) {
      return reply.status(404).send({ error: 'PDF file not found' });
    }
    return reply.sendFile(requestedFile, getStoragePath());
  });
}

export async function libraryRoutes(fastify: FastifyInstance) {
  // List all presentations
  fastify.get('/library', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireHost(request, reply)) return;
    const storagePath = getStoragePath();
    const files = readdirSync(storagePath)
      .filter((f) => f.endsWith('.pdf'))
      .map((f) => {
        const stat = statSync(join(storagePath, f));
        return {
          filename: f,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));

    const state = await getState();
    return reply.send({ files, activeFile: state.activeFile });
  });

  // Upload new PDF
  fastify.post(
    '/library/upload',
    {},
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireHost(request, reply)) return;
      const storagePath = getStoragePath();

      let uploadFile: MultipartFile | null = null;
      try {
        uploadFile = await (request as any).file();
      } catch (err) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      if (!uploadFile) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const originalName = uploadFile.filename;
      if (!originalName.endsWith('.pdf')) {
        return reply.status(400).send({ error: 'Only PDF files are allowed' });
      }

      const safeName = basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const destPath = join(storagePath, safeName);

      await pipeline(uploadFile.file, createWriteStream(destPath));

      return reply.send({ filename: safeName, message: 'Uploaded successfully' });
    }
  );

  // Select active presentation
  fastify.put(
    '/library/select',
    {
      schema: {
        body: {
          type: 'object',
          required: ['filename'],
          properties: { filename: { type: 'string' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireHost(request, reply)) return;
      const { filename } = request.body as { filename: string };
      const storagePath = getStoragePath();
      const filePath = join(storagePath, filename);

      if (!existsSync(filePath) || !filename.endsWith('.pdf')) {
        return reply.status(404).send({ error: 'File not found' });
      }

      const state = await getState();

      await updateState({
        activeFile: filename,
        currentSlide: 1,
        isStarted: false,
        isBlackScreen: false,
      });

      broadcast({ type: 'pdfUpdated', filename });
      broadcastToHosts({ type: 'pdfUpdated', filename });

      return reply.send({ activeFile: filename });
    }
  );

  // Delete a presentation
  fastify.delete(
    '/library/:filename',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireHost(request, reply)) return;
      const { filename } = request.params as { filename: string };
      const storagePath = getStoragePath();
      const filePath = join(storagePath, filename);

      if (!existsSync(filePath) || !filename.endsWith('.pdf')) {
        return reply.status(404).send({ error: 'File not found' });
      }

      const state = await getState();
      if (state.activeFile === filename) {
        await updateState({ activeFile: null, isStarted: false });
      }

      unlinkSync(filePath);
      return reply.send({ message: 'Deleted' });
    }
  );
}
