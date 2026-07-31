import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface UsePDFOptions {
  url: string | null;
  token?: string | null;
  enabled?: boolean;
}

interface UsePDFReturn {
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  renderPage: (
    pageNum: number,
    canvas: HTMLCanvasElement,
    containerWidth?: number,
    isPreload?: boolean
  ) => Promise<boolean>;
}

export function usePDF({ url, token, enabled = true }: UsePDFOptions): UsePDFReturn {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const pdfCacheRef = useRef<Map<string, PDFDocumentProxy>>(new Map());

  useEffect(() => {
    if (!url || !enabled) return;

    // Check cache first
    const cached = pdfCacheRef.current.get(url);
    if (cached) {
      setPdfDoc(cached);
      setTotalPages(cached.numPages);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setPdfDoc(null);
    setIsLoading(true);
    setError(null);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch(url, { headers })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (cancelled) return;
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        return loadingTask.promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        pdfCacheRef.current.set(url, doc);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load PDF');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [url, token, enabled]);

  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement, containerWidth = 800, isPreload = false): Promise<boolean> => {
      if (!pdfDoc) return false;

      // Cancel any in-progress render (only for main renders)
      if (!isPreload && renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }

      let page: PDFPageProxy | null = null;
      try {
        page = await pdfDoc.getPage(pageNum);
        const unscaled = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;
        
        // Calculate scale to make the rendered canvas exactly match the container's physical pixels
        const targetWidth = containerWidth > 0 ? containerWidth : 800;
        const scale = (targetWidth / unscaled.width) * dpr;
        
        const viewport = page.getViewport({ scale });

        // Double buffering: render to offscreen canvas first to prevent white flash
        const offscreen = document.createElement('canvas');
        offscreen.width = viewport.width;
        offscreen.height = viewport.height;
        const offscreenCtx = offscreen.getContext('2d');
        if (!offscreenCtx) return false;

        const task = page.render({ canvasContext: offscreenCtx, viewport });
        if (!isPreload) renderTaskRef.current = task;
        await task.promise;
        if (!isPreload && renderTaskRef.current === task) {
          renderTaskRef.current = null;
        }

        // Draw offscreen canvas to main canvas atomically
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          ctx.drawImage(offscreen, 0, 0);
          return true; // Successfully rendered and drawn
        }
        return false;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err);
        }
        return false; // Failed or cancelled
      } finally {
        page?.cleanup();
      }
    },
    [pdfDoc]
  );

  return { pdfDoc, totalPages, isLoading, error, renderPage };
}
