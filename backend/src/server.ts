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
    origin: true, // In production, this should be restricted
    credentials: true,
  });

  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false, // We'll disable it for static assets, or configure strictly
    crossOriginEmbedderPolicy: false, // Prevents PDF loading from some clients
  });

  await fastify.register(require('@fastify/cookie'), {
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'cookie-secret',
    parseOptions: {} 
  });

  await fastify.register(require('@fastify/rate-limit'), {
    max: 100, // global max 100 requests per minute
    timeWindow: '1 minute'
  });

  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  fastify.setErrorHandler((error, request, reply) => {
    // Log the actual error internally
    request.log.error(error);
    const err = error as any;
    
    // Only send the generic message to the client unless it's a known Fastify error (like rate limit)
    if (err.statusCode === 429) {
      reply.status(429).send({ error: 'Rate limit exceeded, retry in 1 minute' });
    } else if (err.validation) {
      reply.status(400).send({ error: 'Validation error' });
    } else if (err.statusCode && err.statusCode < 500) {
      reply.status(err.statusCode).send({ error: err.message });
    } else {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
  if (IS_PRODUCTION) {
    const frontendDist = join(__dirname, '../../frontend/dist');
    if (existsSync(frontendDist)) {
      await fastify.register(staticFiles, {
        root: frontendDist,
        prefix: '/',
      });

      fastify.setNotFoundHandler(async (request, reply) => {
        if (!request.url.startsWith('/api') && !request.url.startsWith('/ws')) {
          return reply.sendFile('index.html');
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
    console.log(`\n🚀 Nexra server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 WebSocket: ws://0.0.0.0:${PORT}/ws`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
