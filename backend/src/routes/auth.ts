import { FastifyInstance } from 'fastify';
import { login, register, refresh, logout, me } from '../controllers/authController';
import { requireHost } from '../middlewares/auth';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', login);
  fastify.post('/register', register);
  fastify.post('/refresh', refresh);
  fastify.post('/logout', logout);
  
  fastify.get('/me', async (request, reply) => {
    const payload = requireHost(request, reply);
    if (!payload) return;
    (request as any).user = payload;
    return me(request, reply);
  });
}
