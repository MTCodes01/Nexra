import { FastifyInstance } from 'fastify';
import {
  startSession,
  endSession,
  getSession,
  updateSessionSettings,
  regenerateCode,
} from '../controllers/sessionController';

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.post('/', startSession);
  fastify.post('/:id/end', endSession);
  fastify.post('/:code/regenerate-code', regenerateCode);
  fastify.put('/:code/settings', updateSessionSettings);
  
  // Public route for viewers
  fastify.get('/:code', getSession);
}
