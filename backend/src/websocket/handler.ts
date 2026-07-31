import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import prisma from '../prisma/client';

interface ExtWebSocket extends WebSocket {
  isAlive: boolean;
  role: 'host' | 'viewer';
  sessionCode: string;
  connectionId: string;
}

const wss = new WebSocketServer({ noServer: true });
const rooms = new Map<string, Set<ExtWebSocket>>();

export function setupWebSocket(server: Server) {
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: ExtWebSocket, request) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'join') {
          ws.role = msg.role;
          ws.sessionCode = msg.sessionCode;
          ws.connectionId = msg.connectionId || 'unknown';

          if (!rooms.has(ws.sessionCode)) {
            rooms.set(ws.sessionCode, new Set());
          }
          rooms.get(ws.sessionCode)!.add(ws);

          if (ws.role === 'viewer') {
            await updateViewerCount(ws.sessionCode, 1);
          }
        } 
        else if (msg.type === 'slide_change' && ws.role === 'host') {
          await prisma.session.update({
            where: { sessionCode: ws.sessionCode },
            data: { currentSlide: msg.slide },
          });
          broadcastToRoom(ws.sessionCode, { type: 'slide_changed', slide: msg.slide });
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', async () => {
      if (ws.sessionCode && rooms.has(ws.sessionCode)) {
        rooms.get(ws.sessionCode)!.delete(ws);
        if (ws.role === 'viewer') {
          await updateViewerCount(ws.sessionCode, -1);
        }
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket;
      if (!extWs.isAlive) return extWs.terminate();
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

async function updateViewerCount(sessionCode: string, change: number) {
  try {
    const session = await prisma.session.findUnique({ where: { sessionCode } });
    if (!session) return;
    const newCount = Math.max(0, session.viewerCount + change);
    await prisma.session.update({
      where: { sessionCode },
      data: { viewerCount: newCount },
    });
    broadcastToRoom(sessionCode, { type: 'viewer_count', count: newCount });
  } catch (error) {
    console.error('Error updating viewer count:', error);
  }
}

function broadcastToRoom(sessionCode: string, message: any) {
  const room = rooms.get(sessionCode);
  if (!room) return;
  const msgStr = JSON.stringify(message);
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  }
}
