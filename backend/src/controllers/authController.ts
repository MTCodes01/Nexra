import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../prisma/client';
import { signToken } from '../services/jwt';

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as any;

  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password required' });
  }

  const host = await prisma.host.findUnique({ where: { username } });
  if (!host) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, host.passwordHash);
  if (!valid) {
    return reply.status(401).send({ error: 'Invalid credentials' });
  }

  const token = signToken({ role: 'host', hostId: host.id, username: host.username });
  return reply.send({ token, username: host.username, hostId: host.id });
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as any;

  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password required' });
  }

  const existingHost = await prisma.host.findUnique({ where: { username } });
  if (existingHost) {
    return reply.status(400).send({ error: 'Username already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const host = await prisma.host.create({
    data: { username, passwordHash },
  });

  const token = signToken({ role: 'host', hostId: host.id, username: host.username });
  return reply.send({ token, username: host.username, hostId: host.id });
}
