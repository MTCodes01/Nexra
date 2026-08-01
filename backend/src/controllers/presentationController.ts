import { FastifyRequest, FastifyReply } from 'fastify';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, copyFileSync, openSync, readSync, closeSync } from 'fs';
import { join, basename, extname } from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
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

function verifyMagicBytes(filePath: string): boolean {
  try {
    const fd = openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    readSync(fd, buffer, 0, 5, 0);
    closeSync(fd);
    
    // PDF Magic Bytes: %PDF-
    if (buffer.toString('utf-8', 0, 5) === '%PDF-') return true;
    
    // PPTX Magic Bytes (ZIP): PK\x03\x04
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) return true;
    
    // PPT Magic Bytes (OLE): \xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1
    if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) return true;
    
    return false;
  } catch {
    return false;
  }
}

export async function uploadPresentation(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const storagePath = getStoragePath();
  let uploadFile: MultipartFile | null = null;
  try {
    uploadFile = await (request as any).file();
  } catch (err) {
    return reply.status(400).send({ error: 'No file uploaded or file too large' });
  }

  if (!uploadFile) {
    return reply.status(400).send({ error: 'No file uploaded' });
  }

  const originalName = uploadFile.filename;
  // Use UUID instead of original filename to prevent Path Traversal and Collisions
  const safeName = `${uuidv4()}${extname(originalName).toLowerCase()}`;
  const destPath = join(storagePath, safeName);

  await pipeline(uploadFile.file, createWriteStream(destPath));

  // Verify magic bytes after writing to avoid RAM exhaustion
  if (!verifyMagicBytes(destPath)) {
    unlinkSync(destPath);
    return reply.status(400).send({ error: 'Invalid file type. Only PDF, PPT, and PPTX are allowed.' });
  }

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
    include: {
      sessions: {
        where: { isActive: true },
        select: { sessionCode: true }
      }
    },
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

export async function updateNotes(request: FastifyRequest, reply: FastifyReply) {
  const host = requireHost(request, reply);
  if (!host) return;

  const { id } = request.params as { id: string };
  const { notes } = request.body as { notes: Record<number, string> };

  const presentation = await prisma.presentation.findFirst({
    where: { id, hostId: host.hostId },
  });

  if (!presentation) {
    return reply.status(404).send({ error: 'Presentation not found' });
  }

  const updated = await prisma.presentation.update({
    where: { id },
    data: { notes },
  });

  return reply.send(updated);
}
