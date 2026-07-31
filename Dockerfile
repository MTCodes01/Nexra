# Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Build Backend
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend ./
RUN npx prisma generate
RUN npm run build

# Production Environment
FROM node:22-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copy frontend build to backend so fastify can serve it
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
# Create storage path
RUN mkdir -p /app/backend/storage/presentations

# Ensure start script does migration before running
# Use a script or simply run it in CMD, but better to just use start command
EXPOSE 1050

# Setup a startup script
RUN echo '#!/bin/sh' > /app/backend/start.sh && \
    echo 'npx prisma migrate deploy' >> /app/backend/start.sh && \
    echo 'node dist/server.js' >> /app/backend/start.sh && \
    chmod +x /app/backend/start.sh

CMD ["/app/backend/start.sh"]
