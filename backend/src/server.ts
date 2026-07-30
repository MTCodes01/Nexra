import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { authRoutes } from './routes/auth';
import { presentationRoutes, libraryRoutes } from './routes/presentation';
import { audienceRoutes } from './routes/audience';
import { hostRoutes } from './routes/host';
import { setupWebSocket } from './websocket/handler';
import { getState } from './services/state';

const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ensure required directories exist
const storagePath = join(process.cwd(), process.env.STORAGE_PATH || './storage/presentations');
const dataPath = join(process.cwd(), '../data');
[storagePath, dataPath].forEach((p) => {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
});

const fastify = Fastify({
  logger: {
    level: IS_PRODUCTION ? 'warn' : 'info',
    transport: IS_PRODUCTION
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
  },
  trustProxy: true, // Trust Cloudflare & reverse proxy headers
});

async function bootstrap() {
  // CORS
  await fastify.register(cors, {
    origin: IS_PRODUCTION
      ? ['https://seminar.sreedevss.in']
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  // Multipart (for PDF upload)
  await fastify.register(multipart, {
    limits: {
      fileSize: 300 * 1024 * 1024, // 300 MB max PDF
    },
  });

  // Serve static PDF files
  await fastify.register(staticFiles, {
    root: storagePath,
    prefix: '/files/',
  });

  // In production, serve the frontend build
  if (IS_PRODUCTION) {
    const frontendDist = join(__dirname, '../../frontend/dist');
    if (existsSync(frontendDist)) {
      await fastify.register(staticFiles, {
        root: frontendDist,
        prefix: '/',
        decorateReply: false,
      });

      // SPA fallback: any non-API GET serves index.html
      fastify.setNotFoundHandler(async (request, reply) => {
        if (!request.url.startsWith('/api') && !request.url.startsWith('/ws')) {
          return reply.sendFile('index.html', frontendDist);
        }
        return reply.status(404).send({ error: 'Not found' });
      });
    }
  }

  // API Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(presentationRoutes, { prefix: '/api/presentation' });
  await fastify.register(libraryRoutes, { prefix: '/api/host' });
  await fastify.register(audienceRoutes, { prefix: '/api/host' });
  await fastify.register(hostRoutes, { prefix: '/api/host' });

  // Health check
  fastify.get('/api/health', async () => ({
    status: 'ok',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }));

  // Warm up state cache
  await getState();

  return fastify;
}

async function main() {
  const app = await bootstrap();

  // Attach WebSocket server to Fastify's underlying Node http.Server
  setupWebSocket(app.server as any);

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Seminar server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 WebSocket: ws://0.0.0.0:${PORT}/ws`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
