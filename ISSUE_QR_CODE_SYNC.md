# [Feature]: QR Code Pairing and Real-Time Multi-Device Presentation Sync

**Title:** `[Feature]: QR Code Pairing and Real-Time Multi-Device Presentation Sync`  
**Labels:** `feature`, `needs triage`

---

### Feature Description

Currently, attendees must manually type in a 6-character room code or receive a manually shared URL to join an active session. In live conference halls, lecture theaters, and classroom settings, this introduces friction and delays.

We propose adding a **QR Code generator and display system** directly inside Nexra:
1. **Instant Device Joining via QR Code**: Presenters can display a scannable QR code on the active session screen or project it full-screen on the auditorium display.
2. **Multi-Device Live Sync**: Any attendee can point their smartphone camera, tablet, or laptop at the QR code to open the session link (`/p/<sessionCode>`).
3. **Simultaneous Real-Time Presentation**: Multiple connected audience devices view the exact same PDF presentation synchronized with the presenter via WebSockets. When the host navigates slides, triggers blackout mode, or broadcasts messages, all connected viewer devices reflect the changes instantaneously.

---

### Proposed Implementation

#### 1. Architecture & Components
- **QR Code Engine**: Integrate `qrcode.react` (`QRCodeSVG` for crisp rendering across device DPIs and `QRCodeCanvas` for high-resolution PNG export).
- **Network Interface Resolver**:
  - Add `/api/network-info` to Fastify backend using Node's `os.networkInterfaces()`.
  - When the presenter hosts on `localhost` during development or local demos, automatically detect the host PC's Wi-Fi / LAN IP (e.g. `192.168.x.x:5173`) so mobile phones on the same Wi-Fi network can scan and connect without "localhost not reachable" errors.
- **Frontend QR Modals & Cards**:
  - `QRCodeDisplay.tsx`: Reusable component rendering the QR code, session code, copy link action, and LAN IP selector.
  - `QRCodeModal.tsx`: Presenter modal dialog with a "Project to Room" full-screen mode and keyboard toggle (`Q`).
  - `HostPage.tsx`: Integrated QR Code card on the "Session Active" screen.
  - `PresenterPage.tsx`: Quick-access top-bar "📱 QR Code" button with live attendee count.

#### 2. Network & Synchronization Handling
- Configure Vite development server with `server: { host: true, port: 5173 }` so the frontend binds to `0.0.0.0` and accepts LAN traffic.
- Ensure Fastify backend defaults to port `3001` matching Vite dev proxies (`/api`, `/ws`, `/files`).
- Update `PresentationContext.tsx` with exponential backoff WebSocket auto-reconnect so mobile devices that lock or dim screens automatically recover and re-sync to the current slide upon waking up.

---

### Additional Context

- **Target User Flow**:
  1. Host uploads PDF and starts a session.
  2. Host presses `Q` or clicks "📱 QR Code" to project the QR code onto the venue screen.
  3. Attendees point their camera app at the code.
  4. The browser opens the presentation viewer with zero login required.
  5. The host navigates slides (`→` / `Space`), and all audience screens update in unison.
- **Export & Print**:
  - Presenters can download a high-res branded PNG of the QR card to insert into their deck cover slide or print on physical badges/handouts.

---

### Checklist

- [x] I confirm that I want to work on this feature.
- [x] I have searched the existing issues for similar feature requests.
- [x] I have read the `CONTRIBUTING.md` guidelines.

