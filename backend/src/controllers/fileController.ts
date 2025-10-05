import { Request, Response } from 'express';
import { convertFileToMarkdown, ExcelConversionOptions } from '../utils/fileConverters.js';
import { GeminiService } from '../services/geminiService.js';
import { OpenRouterService } from '../services/openRouterService.js';
import { ImageToMermaidService } from '../services/imageToMermaidService.js';
import { createLogger } from '../utils/logger.js';
import fs from 'fs/promises';

const logger = createLogger('FileController');

export class FileController {
  private imageService: ImageToMermaidService | null = null;
  private speechService: GeminiService | null = null;

  constructor(config?: {
    imageService?: 'gemini' | 'openrouter';
    speechService?: 'gemini';
    geminiApiKey?: string;
    openRouterApiKey?: string;
    openRouterModel?: string;
  }) {
    // Initialize the appropriate image service based on configuration
    if (config?.imageService === 'openrouter' && config.openRouterApiKey) {
      this.imageService = new OpenRouterService(
        config.openRouterApiKey,
        config.openRouterModel || 'meta-llama/llama-4-scout:free'
      );
    } else if (config?.imageService === 'gemini' && config.geminiApiKey) {
      this.imageService = new GeminiService(config.geminiApiKey);
    } else if (config?.geminiApiKey) {
      // Fallback to Gemini if only geminiApiKey is provided (backward compatibility)
      this.imageService = new GeminiService(config.geminiApiKey);
    }

    // Initialize speech service separately
    if (config?.speechService === 'gemini' && config.geminiApiKey) {
      this.speechService = new GeminiService(config.geminiApiKey);
    }
  }

  async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();

      // Handle images
      if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension)) {
        if (!this.imageService) {
          return res.status(500).json({ error: 'Image service not configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY in environment variables.' });
        }

        try {
          const result = await this.imageService.convertImageToDiagram(file.path, file.mimetype);

          // Clean up the uploaded file
          await fs.unlink(file.path);

          return res.json({
            type: 'image',
            diagram: result.diagram,
            description: result.description
          });
        } catch (error) {
          // Clean up the uploaded file
          await fs.unlink(file.path);
          throw error;
        }
      }

      // Handle Excel files - check if sheet selection is needed
      if (['.xlsx', '.xls'].includes(extension)) {
        const sheetIndex = req.body.sheetIndex ? parseInt(req.body.sheetIndex) : undefined;
        const sheetName = req.body.sheetName;

        const options: ExcelConversionOptions = {};
        if (sheetName) {
          options.sheetName = sheetName;
        } else if (sheetIndex !== undefined) {
          options.sheetIndex = sheetIndex;
        }

        const result = await convertFileToMarkdown(file.path, file.originalname, options);

        // Clean up the uploaded file
        await fs.unlink(file.path);

        // If sheet selection is required, return the list of sheets
        if (result.metadata?.requiresSheetSelection) {
          return res.json({
            type: 'excel',
            requiresSheetSelection: true,
            sheets: result.metadata.sheets,
            filePath: file.originalname
          });
        }

        return res.json({
          type: 'document',
          markdown: result.markdown,
          metadata: result.metadata
        });
      }

      // Handle other document types (Word, CSV)
      if (['.docx', '.csv'].includes(extension)) {
        const result = await convertFileToMarkdown(file.path, file.originalname);

        // Clean up the uploaded file
        await fs.unlink(file.path);

        return res.json({
          type: 'document',
          markdown: result.markdown,
          metadata: result.metadata
        });
      }

      // Unsupported file type
      await fs.unlink(file.path);
      return res.status(400).json({ error: `Unsupported file type: ${extension}` });

    } catch (error) {
      logger.error('File upload error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to process file'
      });
    }
  }

  async selectExcelSheet(req: Request, res: Response) {
    try {
      const { filePath, sheetIndex, sheetName } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      // This would need to be implemented with session storage or file caching
      // For now, we'll require the file to be re-uploaded with the sheet selection
      return res.status(400).json({
        error: 'Please re-upload the file with sheet selection'
      });

    } catch (error) {
      logger.error('Sheet selection error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to select sheet'
      });
    }
  }

  async transcribeAudio(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
      }

      const file = req.file;

      // Check if speech service is available
      if (!this.speechService) {
        return res.status(500).json({ error: 'Speech service not configured. Please set SPEECH_SERVICE=gemini and GEMINI_API_KEY in environment variables.' });
      }

      try {
        const text = await this.speechService.transcribeAudio(file.path, file.mimetype);

        // Clean up the uploaded file
        await fs.unlink(file.path);

        return res.json({ text });
      } catch (error) {
        // Clean up the uploaded file
        await fs.unlink(file.path);
        throw error;
      }
    } catch (error) {
      logger.error('Audio transcription error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to transcribe audio'
      });
    }
  }
}
