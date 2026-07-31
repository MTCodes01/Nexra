import { FastifyInstance } from 'fastify';
import {
  uploadPresentation,
  listPresentations,
  deletePresentation,
  renamePresentation,
  duplicatePresentation,
  downloadPresentation
} from '../controllers/presentationController';

export async function presentationRoutes(fastify: FastifyInstance) {
  fastify.get('/library', listPresentations);
  fastify.post('/library/upload', uploadPresentation);
  fastify.delete('/library/:id', deletePresentation);
  fastify.put('/library/:id/rename', renamePresentation);
  fastify.post('/library/:id/duplicate', duplicatePresentation);
  
  // Publicly accessible via ID (for viewers/downloads)
  fastify.get('/:id/download', downloadPresentation);
}
