import { FastifyRequest, FastifyReply } from 'fastify';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, statSync, copyFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { pipeline } from 'stream/promises';
import prisma from '../prisma/client';
import { requireHost } from '../middlewares/auth';
import { MultipartFile } from '@fastify/multipart';

function getStoragePath(): string {
  const storagePath = process.env.UPLOAD_PATH || './storage/presentations';
  const absolute = storagePath.startsWith('.') ? join(process.cwd(), storagePath) : storagePath;
  if (!existsSync(absolute)) {
    mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}

export async function uploadPresentation(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

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
  const safeName = `${Date.now()}_${basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destPath = join(storagePath, safeName);

  await pipeline(uploadFile.file, createWriteStream(destPath));

  const presentation = await prisma.presentation.create({
    data: {
      hostId: host.hostId,
      title: originalName.replace(extname(originalName), ''),
      originalFilename: originalName,
      filePath: safeName,
    },
  });

  return reply.send(presentation);
}

export async function listPresentations(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const presentations = await prisma.presentation.findMany({
    where: { hostId: host.hostId },
    orderBy: { updatedTimestamp: 'desc' },
  });

  return reply.send(presentations);
}

export async function deletePresentation(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { id } = request.params as { id: string };

  const presentation = await prisma.presentation.findFirst({
    where: { id, hostId: host.hostId },
  });

  if (!presentation) {
    return reply.status(404).send({ error: 'Presentation not found' });
  }

  const filePath = join(getStoragePath(), presentation.filePath);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  await prisma.presentation.delete({ where: { id } });
  return reply.send({ message: 'Deleted successfully' });
}

export async function renamePresentation(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { id } = request.params as { id: string };
  const { title } = request.body as { title: string };

  if (!title) return reply.status(400).send({ error: 'Title is required' });

  const presentation = await prisma.presentation.findFirst({
    where: { id, hostId: host.hostId },
  });

  if (!presentation) {
    return reply.status(404).send({ error: 'Presentation not found' });
  }

  const updated = await prisma.presentation.update({
    where: { id },
    data: { title },
  });

  return reply.send(updated);
}

export async function duplicatePresentation(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { id } = request.params as { id: string };

  const presentation = await prisma.presentation.findFirst({
    where: { id, hostId: host.hostId },
  });

  if (!presentation) {
    return reply.status(404).send({ error: 'Presentation not found' });
  }

  const newFilePath = `${Date.now()}_copy_${presentation.filePath}`;
  const oldPath = join(getStoragePath(), presentation.filePath);
  const newPath = join(getStoragePath(), newFilePath);

  if (existsSync(oldPath)) {
    copyFileSync(oldPath, newPath);
  }

  const duplicated = await prisma.presentation.create({
    data: {
      hostId: host.hostId,
      title: `${presentation.title} (Copy)`,
      originalFilename: presentation.originalFilename,
      filePath: newFilePath,
      slideCount: presentation.slideCount,
    },
  });

  return reply.send(duplicated);
}

export async function downloadPresentation(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const presentation = await prisma.presentation.findUnique({ where: { id } });

  if (!presentation) {
    return reply.status(404).send({ error: 'Presentation not found' });
  }

  const filePath = join(getStoragePath(), presentation.filePath);
  if (!existsSync(filePath)) {
    return reply.status(404).send({ error: 'File not found' });
  }

  return reply.sendFile(presentation.filePath, getStoragePath());
}
