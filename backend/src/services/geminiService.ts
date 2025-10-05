import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import { ImageToMermaidService } from './imageToMermaidService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GeminiService');

export class GeminiService implements ImageToMermaidService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Convert an image to a Mermaid diagram with retry logic
   */
  async convertImageToDiagram(imagePath: string, mimeType: string): Promise<{ diagram: string; description: string }> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Gemini image conversion attempt ${attempt}/${maxRetries}`);

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
        logger.debug(`Gemini raw response (attempt ${attempt}): ${text.substring(0, 500)}`);

        // Parse the JSON response - try multiple extraction methods
        let parsed: any = null;

        // Method 1: Try to find properly balanced JSON object
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          let braceCount = 0;
          let jsonEnd = jsonStart;

          for (let i = jsonStart; i < text.length; i++) {
            if (text[i] === '{') braceCount++;
            if (text[i] === '}') braceCount--;
            if (braceCount === 0) {
              jsonEnd = i + 1;
              break;
            }
          }

          if (jsonEnd > jsonStart) {
            try {
              const jsonStr = text.substring(jsonStart, jsonEnd);
              parsed = JSON.parse(jsonStr);
            } catch (e) {
              logger.error('Method 1 failed (balanced braces):', e);
            }
          }
        }

        // Method 2: If Method 1 failed, try extracting with code blocks
        if (!parsed) {
          const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            try {
              parsed = JSON.parse(codeBlockMatch[1]);
            } catch (e) {
              logger.error('Method 2 failed (code block):', e);
            }
          }
        }

        // Method 3: Last resort - original greedy regex but with better error handling
        if (!parsed) {
          const jsonMatch = text.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
              logger.error('Method 3 failed (greedy regex):', e);
            }
          }
        }

        if (!parsed) {
          throw new Error('Failed to parse Gemini response - no valid JSON found in output');
        }

        return {
          diagram: parsed.mermaidDiagram || '',
          description: parsed.description || 'Diagram converted from image'
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.error(`Gemini attempt ${attempt} failed: ${lastError.message}`);

        // If this isn't the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Progressive delay: 1s, 2s
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to convert image to diagram after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Transcribe audio to text using Gemini
   */
  async transcribeAudio(audioPath: string, mimeType: string): Promise<string> {
    try {
      logger.info('Gemini audio transcription started');

      // Read the audio file
      const audioBuffer = await fs.readFile(audioPath);
      const audioBase64 = audioBuffer.toString('base64');

      const prompt = `Transcribe the following audio to text. Return only the transcribed text without any additional formatting or explanation.`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType
          }
        }
      ]);

      const response = await result.response;
      const text = response.text().trim();
      logger.info('Gemini transcription result: ' + text);

      return text;
    } catch (error) {
      logger.error('Gemini transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
