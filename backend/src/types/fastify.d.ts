import 'fastify';
import type { SendOptions } from '@fastify/static';

declare module 'fastify' {
  interface FastifyReply {
    sendFile(filename: string, rootPath?: string, options?: SendOptions): FastifyReply;
    download(filepath: string, filename?: string, options?: SendOptions): FastifyReply;
  }
}
