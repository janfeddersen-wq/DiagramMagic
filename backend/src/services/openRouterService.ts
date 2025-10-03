import OpenAI from 'openai';
import fs from 'fs/promises';
import { ImageToMermaidService } from './imageToMermaidService.js';

export class OpenRouterService implements ImageToMermaidService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'meta-llama/llama-4-scout:free') {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
    });
    this.model = model;
  }

  /**
   * Convert an image to a Mermaid diagram with retry logic
   */
  async convertImageToDiagram(imagePath: string, mimeType: string): Promise<{ diagram: string; description: string }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`OpenRouter image conversion attempt ${attempt}/${maxRetries}`);

        // Read the image file
        const imageBuffer = await fs.readFile(imagePath);
        const imageBase64 = imageBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${imageBase64}`;

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

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]
            }
          ],
          temperature: 0.1,
        });

        const text = response.choices[0]?.message?.content || '';

        // Parse the JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Failed to parse OpenRouter response - no JSON found in output');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
          diagram: parsed.mermaidDiagram || '',
          description: parsed.description || 'Diagram converted from image'
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`OpenRouter attempt ${attempt} failed:`, lastError.message);

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Progressive delay: 1s, 2s
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to convert image to diagram after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }
}
