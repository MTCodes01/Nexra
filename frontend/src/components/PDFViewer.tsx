import React, { useEffect, useRef, useCallback, memo } from 'react';
import { usePDF } from '../hooks/usePDF';

interface PDFViewerProps {
  url: string | null;
  token?: string | null;
  currentSlide: number;
  onTotalPagesLoaded?: (n: number) => void;
  className?: string;
}

const PDFViewer = memo(function PDFViewer({
  url,
  token,
  currentSlide,
  onTotalPagesLoaded,
  className = '',
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentSlideRef = useRef(currentSlide);
  const slideCanvasCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const { pdfDoc, totalPages, isLoading, error, renderPage } = usePDF({
    url,
    token,
    enabled: !!url,
  });

  // Notify parent when PDF loads
  useEffect(() => {
    if (totalPages > 0 && onTotalPagesLoaded) {
      onTotalPagesLoaded(totalPages);
    }
  }, [totalPages, onTotalPagesLoaded]);

  // Clear slide canvas cache when PDF URL changes
  useEffect(() => {
    slideCanvasCacheRef.current.clear();
  }, [url]);

  // Get current container width and height for rendering scale
  const getContainerSize = useCallback(() => {
    return {
      width: containerRef.current?.clientWidth || window.innerWidth,
      height: containerRef.current?.clientHeight || window.innerHeight,
    };
  }, []);

  // Render current slide
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentSlide < 1) return;
    currentSlideRef.current = currentSlide;

    const canvas = canvasRef.current;
    const { width: containerWidth, height: containerHeight } = getContainerSize();
    const cacheKey = `${url}-${currentSlide}`;

    // Instant 0ms render for previously visited slides in this PDF
    const cached = slideCanvasCacheRef.current.get(cacheKey);
    if (cached) {
      canvas.width = cached.width;
      canvas.height = cached.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(cached, 0, 0);
        return;
      }
    }

    renderPage(currentSlide, canvas, containerWidth, containerHeight).then((success) => {
      // If render failed, was cancelled, or if canvas unmounted/changed during render, do not cache
      if (!success || canvas !== canvasRef.current) return;

      // Store in slide canvas cache if context/canvas was rendered successfully
      if (canvas.width > 0 && canvas.height > 0) {
        const copy = document.createElement('canvas');
        copy.width = canvas.width;
        copy.height = canvas.height;
        const copyCtx = copy.getContext('2d');
        if (copyCtx) {
          copyCtx.drawImage(canvas, 0, 0);
          slideCanvasCacheRef.current.set(cacheKey, copy);
        }
      }
    });
  }, [pdfDoc, currentSlide, url, renderPage, getContainerSize]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-purple-300 text-sm font-medium animate-pulse">Loading presentation…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-red-400 text-sm">Failed to load PDF: {error}</p>
      </div>
    );
  }

  if (!url || !pdfDoc) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-gray-500 text-sm">No presentation loaded</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
});

export default PDFViewer;
