# Nexra 🎤

> A production-quality interactive seminar and live presentation platform.

Audience members scan a QR code, log in with their name & DOB, and watch a live PDF presentation controlled entirely by the presenter. After the seminar, the host can trigger a **Reveal** popup to highlight a key takeaway or interactive quiz to all viewers simultaneously.

## Features

- **Live Presentation Sync**: When the host changes slides, all viewers instantly sync via WebSockets.
- **Audience Dashboard**: The host can see exactly who is connected in real-time.
- **Interactive Reveals**: The host can trigger full-screen animated modals for the entire audience.
- **Zero Installation**: Viewers join via browser (mobile & desktop friendly).
- **Presentation Library**: Upload and switch between multiple PDF decks instantly.
- **Presenter Notes**: Host can view and edit private Markdown notes per slide.

## Tech Stack


## Quick Start

### Prerequisites

- **Node.js 22+** — [nodejs.org](https://nodejs.org)
- **npm 10+** (comes with Node.js 22)

### 1. Install Dependencies

```bash
# From the project root (d:\VScode\PDF viewer)
npm install                    # root tools (concurrently)
npm install --prefix backend   # backend deps
npm install --prefix frontend  # frontend deps
```

### 2. Set Up the Database

```bash
# Generate Prisma client
cd backend
npx prisma migrate dev --name init
npx tsx src/seed.ts            # Creates admin user (Sreedev / 12345678)
cd ..
```

### 3. Start Development

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws
- **Host Panel**: http://localhost:5173/host

---

## Production Deployment

### 1. Build

```bash
npm run build
```

This builds the React frontend to `frontend/dist/` and compiles the backend TypeScript to `backend/dist/`.

### 2. Configure Environment

Edit `backend/.env`:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-strong-random-secret-here
DATABASE_URL="file:../data/database.db"
STORAGE_PATH=./storage/presentations
TRUST_PROXY=true
```

> ⚠️ **Change JWT_SECRET** to a strong random string in production!

### 3. Database Setup (Production)

```bash
cd backend
npx prisma migrate deploy
npx tsx src/seed.ts
cd ..
```

### 4. Start Production Server

```bash
npm run start
```

The server starts on port `3000` and serves both the API and the React frontend.

### 5. Cloudflare Tunnel

Install `cloudflared` and run:

```bash
cloudflared tunnel --url http://localhost:3000
```

Or configure in your Cloudflare dashboard to point `nexra.sreedevss.in` → `localhost:3000`.

---

## Project Structure

```
nexra/
├── backend/
│   ├── prisma/schema.prisma        # Database schema
│   ├── src/
│   │   ├── server.ts               # Fastify entry point
│   │   ├── routes/
│   │   │   ├── auth.ts             # Login endpoints
│   │   │   ├── presentation.ts     # PDF serve + library
│   │   │   ├── audience.ts         # Viewer CRUD + CSV
│   │   │   └── host.ts             # Controls + notes + password
│   │   ├── websocket/handler.ts    # Native ws server
│   │   ├── services/
│   │   │   ├── state.ts            # In-memory + DB state
│   │   │   └── jwt.ts              # JWT helpers
│   │   └── seed.ts                 # Initial data seed
│   ├── storage/presentations/      # PDF library
│   └── data/database.db            # SQLite database
│
├── frontend/
│   └── src/
│       ├── routes/
│       │   ├── LoginPage.tsx       # Audience login (Name + DOB)
│       │   ├── ViewerPage.tsx      # Fullscreen presentation viewer
│       │   └── HostPage.tsx        # Presenter dashboard
│       ├── components/             # Reusable UI
│       ├── hooks/                  # useWebSocket, usePDF
│       ├── context/                # PresentationContext
│       └── api/client.ts           # Typed API calls
│
└── package.json                    # Root scripts
```

---

## Host Panel

**URL:** `/host`  
**Default credentials:** `Sreedev` / `12345678`

### Features

| Feature | Description |
|---|---|
| 📚 Presentation Library | Upload, select, delete PDFs |
| ▶ Start / ⏹ End | Begin or end the presentation |
| ← → Navigation | Prev/Next slide (keyboard + swipe) |
| 🔢 Jump to Slide | Go to any slide instantly |
| ⛶ Fullscreen | Preview PDF in fullscreen |
| 🌑 Black Screen | Toggle black screen for all viewers |
| 🎭 Reveal | Show key takeaway modal to all viewers |
| ⏱ Timer | Presentation stopwatch |
| 📝 Presenter Notes | Per-slide notes, auto-saved |
| 👥 Audience List | Live attendee table with search/sort |
| 📥 CSV Export | Download audience data |
| 🗑 Clear Database | Delete all audience records |
| 🔑 Change Password | Update host password |

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

---

## WebSocket Events

### Server → All Clients

```json
{ "type": "slideChange", "slide": 7 }
{ "type": "presentationStarted", "totalSlides": 20 }
{ "type": "presentationEnded" }
{ "type": "viewerCountChanged", "count": 42 }
{ "type": "blackScreen", "active": true }
{ "type": "reveal" }
{ "type": "pdfUpdated", "filename": "nexra.pdf" }
```

### Client → Server

```json
{ "type": "identify", "token": "JWT..." }
{ "type": "ping" }
```

---

## PDF Strategy

Clients download the PDF **once** via `GET /api/presentation/pdf` with JWT auth.  
PDF.js renders pages **locally** in the browser.  
WebSocket only transmits the **current slide number** — a tiny integer payload.  
Adjacent pages (±1) are preloaded in background canvases for instant transitions.

---

## Data Collected

For each audience member:

| Field | Description |
|---|---|
| Name | As entered on login |
| Date of Birth | As entered on login |
| IP Address | Via `CF-Connecting-IP` / `X-Forwarded-For` |
| Browser | Detected from User-Agent |
| Session ID | UUID per login |
| Join Time | Timestamp |
| Last Seen | Auto-updated timestamp |
| Online Status | Live WebSocket connection status |

---

## Default Credentials

| Role | Username | Password |
|---|---|---|
| Host | `Sreedev` | `12345678` |

> 🔐 Change the password immediately after first login via **Settings → Change Password**.

---

## License

MIT — For educational use only.
