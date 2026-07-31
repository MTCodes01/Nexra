import { FastifyInstance } from 'fastify';
import {
  startSession,
  endSession,
  getSession,
  updateSessionSettings,
} from '../controllers/sessionController';

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.post('/', startSession);
  fastify.post('/:id/end', endSession);
  fastify.put('/:id/settings', updateSessionSettings);
  
  // Public route for viewers
  fastify.get('/:code', getSession);
}
