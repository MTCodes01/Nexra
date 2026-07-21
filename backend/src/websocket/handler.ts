import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';
import { verifyToken, isHost } from '../services/jwt';
import prisma from '../prisma/client';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  sessionId?: string;
  role?: 'viewer' | 'host';
  isAuthenticated: boolean;
}

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

// Connected clients
const viewers = new Set<ExtendedWebSocket>();
const hosts = new Set<ExtendedWebSocket>();

export function getViewerCount(): number {
  return viewers.size;
}

export function broadcast(data: WSMessage, excludeWs?: WebSocket) {
  const payload = JSON.stringify(data);
  const all = new Set([...viewers, ...hosts]);
  all.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastToViewers(data: WSMessage) {
  const payload = JSON.stringify(data);
  viewers.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function broadcastToHosts(data: WSMessage) {
  const payload = JSON.stringify(data);
  hosts.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat interval — ping every 30 seconds
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as ExtendedWebSocket;
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', (rawWs: WebSocket, req: IncomingMessage) => {
    const ws = rawWs as ExtendedWebSocket;
    ws.isAlive = true;
    ws.isAuthenticated = false;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'identify') {
        const token = msg.token as string;
        const payload = verifyToken(token);
        if (!payload) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
          return;
        }

        ws.isAuthenticated = true;
        ws.role = payload.role;

        if (isHost(payload)) {
          ws.sessionId = 'host';
          hosts.add(ws);
          ws.send(JSON.stringify({ type: 'identified', role: 'host' }));
        } else {
          ws.sessionId = payload.sessionId;
          viewers.add(ws);

          // Mark viewer as online in DB
          await prisma.viewer
            .updateMany({
              where: { sessionId: payload.sessionId },
              data: { isOnline: true },
            })
            .catch(() => {});

          const count = viewers.size;

          // Notify all about new viewer
          broadcast({ type: 'viewerConnected', count });
          broadcast({ type: 'viewerCountChanged', count });

          ws.send(JSON.stringify({ type: 'identified', role: 'viewer' }));
        }
        return;
      }

      // Ignore unauthenticated messages beyond identify/ping
      if (!ws.isAuthenticated) return;
    });

    ws.on('close', async () => {
      const wasViewer = viewers.has(ws);
      viewers.delete(ws);
      hosts.delete(ws);

      if (wasViewer && ws.sessionId) {
        await prisma.viewer
          .updateMany({
            where: { sessionId: ws.sessionId },
            data: { isOnline: false },
          })
          .catch(() => {});

        const count = viewers.size;
        broadcast({ type: 'viewerDisconnected', count });
        broadcast({ type: 'viewerCountChanged', count });
      }
    });

    ws.on('error', () => {
      viewers.delete(ws);
      hosts.delete(ws);
    });
  });

  return wss;
}
