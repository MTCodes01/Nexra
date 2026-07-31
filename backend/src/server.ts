import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { authRoutes } from './routes/auth';
import { presentationRoutes } from './routes/presentation';
import { sessionRoutes } from './routes/session';
import { setupWebSocket } from './websocket/handler';

const PORT = parseInt(process.env.PORT || '1050', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const storagePath = join(process.cwd(), process.env.UPLOAD_PATH || './storage/presentations');
if (!existsSync(storagePath)) mkdirSync(storagePath, { recursive: true });

const fastify = Fastify({
  logger: {
    level: IS_PRODUCTION ? 'warn' : 'info',
    transport: IS_PRODUCTION
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true } },
  },
  trustProxy: true,
});

async function bootstrap() {
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(multipart, {
    limits: { fileSize: 300 * 1024 * 1024 },
  });

  await fastify.register(staticFiles, {
    root: storagePath,
    prefix: '/files/',
  });

  if (IS_PRODUCTION) {
    const frontendDist = join(__dirname, '../../frontend/dist');
    if (existsSync(frontendDist)) {
      await fastify.register(staticFiles, {
        root: frontendDist,
        prefix: '/',
        decorateReply: false,
      });

      fastify.setNotFoundHandler(async (request, reply) => {
        if (!request.url.startsWith('/api') && !request.url.startsWith('/ws')) {
          return reply.sendFile('index.html', frontendDist);
        }
        return reply.status(404).send({ error: 'Not found' });
      });
    }
  }

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(presentationRoutes, { prefix: '/api/presentation' });
  await fastify.register(sessionRoutes, { prefix: '/api/session' });

  fastify.get('/api/health', async () => ({
    status: 'ok',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }));

  return fastify;
}

async function main() {
  const app = await bootstrap();
  setupWebSocket(app.server as any);

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🚀 Seminar server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 WebSocket: ws://0.0.0.0:${PORT}/ws`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
