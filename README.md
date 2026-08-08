# Nexra

A live presentation and interactive seminar platform. 

Nexra allows a presenter to control a synchronized PDF presentation for an audience. Audience members join via a browser and their view is kept in sync with the presenter's controls in real-time.

## Features

- **Real-Time Sync**: Viewers' slides sync instantly via WebSockets when the host changes slides.
- **Audience Dashboard**: Real-time view of connected attendees.
- **Interactive Modals**: Trigger full-screen announcements to all viewers simultaneously.
- **Browser-based**: Works in the browser across mobile and desktop.
- **Presentation Management**: Upload, store, and switch between multiple PDF decks.
- **Presenter Notes**: Presenters can write and view markdown-formatted notes for each slide.

## Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Fastify, TypeScript
- **Database**: SQLite, Prisma ORM
- **Real-time**: WebSockets
- **PDF Rendering**: PDF.js

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+

### Setup

1. **Install dependencies**
   ```bash
   npm install
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Initialize the database**
   ```bash
   cd backend
   npx prisma migrate dev --name init
   npx tsx src/seed.ts
   cd ..
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

### Access Points

- **Frontend Viewer**: http://localhost:5173
- **Host Dashboard**: http://localhost:5173/host (Default login: Sreedev / 12345678)
- **Backend API**: http://localhost:3001

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Configure environment variables**
   
   Create or edit `backend/.env`:
   ```env
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-secure-random-secret
   DATABASE_URL="file:../data/database.db"
   STORAGE_PATH=./storage/presentations
   TRUST_PROXY=true
   ```

3. **Deploy database**
   ```bash
   cd backend
   npx prisma migrate deploy
   npx tsx src/seed.ts
   cd ..
   ```

4. **Start the server**
   ```bash
   npm run start
   ```

To expose the local server to the internet, you can use a tunnel like Cloudflare:
```bash
cloudflared tunnel --url http://localhost:3000
```

## Project Structure

- `backend/`: Fastify server, WebSocket handlers, Prisma schema, and API routes.
- `frontend/`: React application, UI components, PDF viewer, and WebSocket client.
- `package.json`: Root configuration and concurrent start scripts.

## Host Panel Features

- **Presentation Library**: Upload, select, and delete PDFs.
- **Presentation Controls**: Start, end, and navigate slides (keyboard + swipe).
- **Fullscreen Preview**: Preview PDF in fullscreen.
- **Black Screen**: Toggle black screen for all viewers.
- **Reveal**: Show a key takeaway modal to all viewers.
- **Timer**: Presentation stopwatch.
- **Presenter Notes**: Per-slide notes, auto-saved.
- **Audience List**: Live attendee table with search and sort.
- **Data Export**: Download audience data as CSV.
- **Database Management**: Clear all audience records.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `→` / `↓` / `Space` | Next slide |
| `←` / `↑` | Previous slide |
| `B` | Toggle black screen |
| `F5` | Start presentation |
| `Esc` | End presentation |
| Swipe ← | Next slide (mobile) |
| Swipe → | Previous slide (mobile) |

## Data Collection

For each audience member, the following is collected during a session:
- Name and Date of Birth
- IP Address and Browser
- Session ID, Join Time, and Last Seen status

## License
MIT
