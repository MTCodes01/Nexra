import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse as parseCookie } from 'cookie';
import prisma from '../prisma/client';
import { verifyAccessToken } from '../services/jwt';

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
          ws.sessionCode = msg.sessionCode;
          ws.connectionId = msg.connectionId || 'unknown';
          
          if (msg.role === 'host') {
            // Validate host auth via cookie
            const cookieHeader = request.headers.cookie || '';
            const cookies = parseCookie(cookieHeader);
            const token = cookies.accessToken;
            
            if (!token) {
              ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized: No token' }));
              ws.close(4001, 'Unauthorized');
              return;
            }
            
            const payload = verifyAccessToken(token);
            if (!payload || payload.role !== 'host') {
              ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized: Invalid token' }));
              ws.close(4001, 'Unauthorized');
              return;
            }
            ws.role = 'host';
          } else {
            ws.role = 'viewer';
          }

          if (!rooms.has(ws.sessionCode)) {
            rooms.set(ws.sessionCode, new Set());
          }
          rooms.get(ws.sessionCode)!.add(ws);

          if (ws.role === 'viewer') {
            const session = await prisma.session.findUnique({
              where: { sessionCode: ws.sessionCode },
              select: { currentSlide: true, isBlackout: true },
            });
            if (session) {
              ws.send(JSON.stringify({ type: 'slide_changed', slide: session.currentSlide }));
              ws.send(JSON.stringify({ type: 'blackout', isBlackout: session.isBlackout }));
            }
            await updateViewerCount(ws.sessionCode);
          }
        } 
        else if (msg.type === 'slide_change' && ws.role === 'host') {
          await prisma.session.update({
            where: { sessionCode: ws.sessionCode },
            data: { currentSlide: msg.slide },
          });
          broadcastToRoom(ws.sessionCode, { type: 'slide_changed', slide: msg.slide });
        }
        else if (msg.type === 'broadcast' && ws.role === 'host') {
          broadcastToRoom(ws.sessionCode, { type: 'broadcast', message: msg.message });
        }
        else if (msg.type === 'blackout' && ws.role === 'host') {
          await prisma.session.update({
            where: { sessionCode: ws.sessionCode },
            data: { isBlackout: msg.isBlackout },
          });
          broadcastToRoom(ws.sessionCode, { type: 'blackout', isBlackout: msg.isBlackout });
        }
        else if (msg.type === 'settings_updated' && ws.role === 'host') {
          broadcastToRoom(ws.sessionCode, { type: 'settings_updated', settings: msg.settings });
        }
        else if (msg.type === 'session_code_changed' && ws.role === 'host') {
          broadcastToRoom(ws.sessionCode, { type: 'session_code_changed', newCode: msg.newCode });
          
          // Re-map the host to the new room, since the code changed
          const oldRoom = rooms.get(ws.sessionCode);
          if (oldRoom) {
            oldRoom.delete(ws);
            if (oldRoom.size === 0) {
              rooms.delete(ws.sessionCode);
            }
          }
          ws.sessionCode = msg.newCode;
          if (!rooms.has(ws.sessionCode)) {
            rooms.set(ws.sessionCode, new Set());
          }
          rooms.get(ws.sessionCode)!.add(ws);
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', async () => {
      if (ws.sessionCode && rooms.has(ws.sessionCode)) {
        const room = rooms.get(ws.sessionCode)!;
        room.delete(ws);
        if (ws.role === 'viewer') {
          await updateViewerCount(ws.sessionCode);
        }
        if (room.size === 0) {
          rooms.delete(ws.sessionCode);
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

async function updateViewerCount(sessionCode: string) {
  try {
    const room = rooms.get(sessionCode);
    const activeCount = room ? Array.from(room).filter((c) => c.role === 'viewer').length : 0;
    await prisma.session.update({
      where: { sessionCode },
      data: { viewerCount: activeCount },
    });
    broadcastToRoom(sessionCode, { type: 'viewer_count', count: activeCount });
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
