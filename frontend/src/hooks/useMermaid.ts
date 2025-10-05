import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Socket } from 'socket.io-client';
import { createLogger } from '../utils/logger';

const logger = createLogger('useMermaid');

export function useMermaid(diagram: string, socket?: Socket, onRenderComplete?: (success: boolean, error?: string) => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
      logLevel: 'fatal', // Suppress error messages in console
      mindmap: {
        padding: 20,
        nodeSpacing: 100,
        levelSpacing: 100,
        useMaxWidth: false
      }
    });
  }, []);

  useEffect(() => {
    if (!diagram || !containerRef.current) return;

    const renderDiagram = async () => {
      // Create a unique ID for this render
      const renderId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Render to a temporary div to catch any DOM errors
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        const { svg } = await mermaid.render(renderId, diagram);

        // Clean up temp div
        document.body.removeChild(tempDiv);

        // Remove any error elements mermaid might have created
        const errorElement = document.getElementById(renderId);
        if (errorElement) {
          errorElement.remove();
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }

        // Notify success
        if (onRenderComplete) {
          onRenderComplete(true);
        }
      } catch (error) {
        logger.error('Mermaid rendering error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Clean up any error elements mermaid created
        const errorElement = document.getElementById(renderId);
        if (errorElement) {
          errorElement.remove();
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div class="text-red-500 p-4">
              <p class="font-bold">Error rendering diagram:</p>
              <p class="text-sm mt-2">${errorMessage}</p>
            </div>
          `;
        }

        // Notify error
        if (onRenderComplete) {
          onRenderComplete(false, errorMessage);
        }
      }
    };

    renderDiagram();
  }, [diagram, onRenderComplete]);

  return containerRef;
}
