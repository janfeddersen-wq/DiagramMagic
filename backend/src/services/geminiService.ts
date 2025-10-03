import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import { ImageToMermaidService } from './imageToMermaidService.js';

export class GeminiService implements ImageToMermaidService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Convert an image to a Mermaid diagram
   */
  async convertImageToDiagram(imagePath: string, mimeType: string): Promise<{ diagram: string; description: string }> {
    try {
      // Read the image file
      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      const prompt = `You are an expert at analyzing images and converting them to Mermaid diagrams.

Analyze this image and convert it to a Mermaid diagram. The image might contain:
- Flowcharts
- Network diagrams
- Entity relationship diagrams
- Sequence diagrams
- Class diagrams
- State diagrams
- Or any other type of diagram

Your task:
1. Identify what type of diagram is shown in the image
2. Extract all the elements, nodes, relationships, and connections
3. Convert it to proper Mermaid syntax
4. Ensure the diagram is complete and accurate

Return a JSON object with this structure:
{
  "description": "Brief description of what the diagram represents",
  "diagramType": "The type of diagram (flowchart, sequence, etc.)",
  "mermaidDiagram": "The complete Mermaid diagram code"
}

Make sure the Mermaid code is syntactically correct and follows Mermaid best practices.`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        diagram: parsed.mermaidDiagram || '',
        description: parsed.description || 'Diagram converted from image'
      };
    } catch (error) {
      throw new Error(`Failed to convert image to diagram: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
