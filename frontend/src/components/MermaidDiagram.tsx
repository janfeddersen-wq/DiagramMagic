import { useState, useEffect, useRef } from 'react';
import { useMermaid } from '../hooks/useMermaid';
import panzoom, { PanZoom } from 'panzoom';
import { Socket } from 'socket.io-client';

interface MermaidDiagramProps {
  diagram: string;
  socket?: Socket;
  onRenderComplete?: (success: boolean, error?: string) => void;
}

export function MermaidDiagram({ diagram, socket, onRenderComplete }: MermaidDiagramProps) {
  const containerRef = useMermaid(diagram, socket, onRenderComplete);
  const panzoomRef = useRef<PanZoom | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (containerRef.current && diagram) {
      // Initialize panzoom
      panzoomRef.current = panzoom(containerRef.current, {
        maxZoom: 3,
        minZoom: 0.3,
        bounds: true,
        boundsPadding: 0.1,
        onTouch: (e) => {
          // Allow touch events
          return true;
        }
      });

      // Listen to zoom changes
      panzoomRef.current.on('zoom', (instance) => {
        setZoom(instance.getTransform().scale);
      });

      return () => {
        panzoomRef.current?.dispose();
      };
    }
  }, [diagram, containerRef]);

  const handleZoomIn = () => {
    panzoomRef.current?.zoomTo(0, 0, 1.2);
  };

  const handleZoomOut = () => {
    panzoomRef.current?.zoomTo(0, 0, 0.8);
  };

  const handleReset = () => {
    panzoomRef.current?.moveTo(0, 0);
    panzoomRef.current?.zoomAbs(0, 0, 1);
  };

  const handleFitToScreen = () => {
    if (wrapperRef.current && containerRef.current) {
      const wrapper = wrapperRef.current.getBoundingClientRect();
      const content = containerRef.current.getBoundingClientRect();

      const scaleX = (wrapper.width * 0.9) / content.width;
      const scaleY = (wrapper.height * 0.9) / content.height;
      const scale = Math.min(scaleX, scaleY, 1);

      panzoomRef.current?.zoomAbs(0, 0, scale);
      panzoomRef.current?.moveTo(0, 0);
    }
  };

  const handleSaveMarkdown = () => {
    const blob = new Blob([diagram], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveImage = () => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;

    // Get the SVG dimensions
    const bbox = svgElement.getBBox();
    clonedSvg.setAttribute('width', bbox.width.toString());
    clonedSvg.setAttribute('height', bbox.height.toString());
    clonedSvg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    // Convert SVG to string and encode as data URL
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (2x for better quality)
    const scale = 2;
    canvas.width = bbox.width * scale;
    canvas.height = bbox.height * scale;

    const img = new Image();

    img.onload = () => {
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the image scaled
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `diagram-${new Date().toISOString().slice(0, 10)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    };

    img.src = svgDataUrl;
  };

  const handleOpenInDrawIO = () => {
    if (!diagram) return;

    // Create the JSON object for Draw.io
    const drawioPayload = {
      type: 'mermaid',
      data: diagram
    };

    // URL encode the JSON
    const encodedPayload = encodeURIComponent(JSON.stringify(drawioPayload));

    // Open Draw.io in a new tab
    window.open(`https://app.diagrams.net/?create=${encodedPayload}`, '_blank');
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {diagram ? (
        <>
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            {/* Save buttons */}
            <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
              <button
                type="button"
                onClick={handleSaveMarkdown}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                title="Save as Markdown"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSaveImage}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                title="Save as Image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleOpenInDrawIO}
                className="w-10 h-10 flex items-center justify-center hover:bg-green-50 hover:text-green-600 rounded-md transition-colors"
                title="Open in Draw.io Visual Editor"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            {/* Zoom controls */}
            <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
              <button
                onClick={handleZoomIn}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                title="Zoom in"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
              <button
                onClick={handleZoomOut}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                title="Zoom out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={handleFitToScreen}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                title="Fit to screen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <button
                onClick={handleReset}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
                title="Reset"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Zoom indicator */}
            <div className="bg-white rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-gray-700">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Diagram container */}
          <div ref={wrapperRef} className="flex-1 overflow-hidden relative">
            <div ref={containerRef} className="mermaid-container absolute" />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <svg
                className="w-12 h-12 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No diagram yet</h3>
            <p className="text-sm text-gray-500">Start a conversation to generate a diagram</p>
          </div>
        </div>
      )}
    </div>
  );
}
