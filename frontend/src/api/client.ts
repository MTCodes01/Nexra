import { PresentationStatus, Viewer, PresentationFile, PresenterNotes } from '../types';

const BASE = '/api';

function getViewerToken(): string | null {
  return sessionStorage.getItem('viewer_token');
}

function getHostToken(): string | null {
  return localStorage.getItem('host_token');
}

// We now use cookies via credentials: 'include'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginViewer(name: string, dob: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, dob }),
  });
  return handleResponse<{ token: string; sessionId: string }>(res);
}

export async function loginHost(password: string) {
  const res = await fetch(`${BASE}/auth/host`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return handleResponse<{ token: string; username: string }>(res);
}

// ─── Presentation ─────────────────────────────────────────────────────────────

export async function getPresentationStatus(): Promise<PresentationStatus> {
  const res = await fetch(`${BASE}/presentation/status`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<PresentationStatus>(res);
}

export function getPDFUrl(): string {
  return `${BASE}/presentation/pdf`;
}

export function getPDFAuthToken(): string | null {
  return getViewerToken() || getHostToken();
}

// ─── Host: Library ────────────────────────────────────────────────────────────

export async function getLibrary(): Promise<{ files: PresentationFile[]; activeFile: string | null }> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/library`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  return handleResponse(res);
}

export function uploadPresentation(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ filename: string }> {
  return new Promise((resolve, reject) => {
    const token = getHostToken();
    if (!token) return reject(new Error('Not authenticated'));

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/host/library/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(res);
        } else {
          reject(new Error(res.error || `HTTP ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error('Failed to parse response'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function selectPresentation(filename: string): Promise<void> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/library/select`, {
    method: 'PUT',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
  return handleResponse(res);
}

export async function deletePresentation(filename: string): Promise<void> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/library/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res);
}

// ─── Host: Audience ───────────────────────────────────────────────────────────

export async function getAudience(): Promise<{ viewers: Viewer[] }> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/audience`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  return handleResponse(res);
}

export async function clearAudience(): Promise<void> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/audience`, {
    method: 'DELETE',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res);
}

export function getCSVExportUrl(): string {
  return `${BASE}/host/audience/export`;
}

// ─── Host: Control ────────────────────────────────────────────────────────────

export async function sendControl(action: string, params?: { slide?: number; totalSlides?: number }) {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/presentation/control`, {
    method: 'POST',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  return handleResponse<PresentationStatus & { viewerCount: number }>(res);
}

export async function getHostState(): Promise<PresentationStatus & { viewerCount: number }> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/state`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  return handleResponse(res);
}

// ─── Host: Password ───────────────────────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/password`, {
    method: 'PUT',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(res);
}

// ─── Host: Notes ──────────────────────────────────────────────────────────────

export async function getNotes(): Promise<{ notes: PresenterNotes }> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/notes`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  return handleResponse(res);
}

export async function saveNotes(notes: PresenterNotes): Promise<void> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/notes`, {
    method: 'PUT',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return handleResponse(res);
}

export async function clearAllData(): Promise<void> {
  const token = getHostToken()!;
  const res = await fetch(`${BASE}/host/data/clear`, {
    method: 'POST',
    credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}
