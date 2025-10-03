/**
 * Abstract interface for image to mermaid conversion services
 */
export interface ImageToMermaidService {
  convertImageToDiagram(imagePath: string, mimeType: string): Promise<{ diagram: string; description: string }>;
}
