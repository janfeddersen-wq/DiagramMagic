import { Request, Response } from 'express';
import { ReactAgent } from '../services/reactAgent.js';
import { DiagramRequest } from '../types/index.js';
import { Server } from 'socket.io';
import { db } from '../database/connection.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('DiagramController');

export class DiagramController {
  private agent: ReactAgent;

  constructor(apiKey: string, model?: string, io?: Server) {
    this.agent = new ReactAgent(apiKey, model, io);
  }

  setupSocketListeners(socket: any) {
    this.agent.setupSocketListeners(socket);
  }

  async generateDiagram(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, chatHistory, currentDiagram, projectId, diagramId }: DiagramRequest & { projectId?: number; diagramId?: number } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const result = await this.agent.generateDiagram(
        prompt,
        chatHistory || [],
        currentDiagram
      );

      // If projectId and diagramId are provided and user is authenticated, save chat messages
      if (projectId && diagramId && req.user) {
        try {
          // Save user message
          await db
            .insertInto('chat_messages')
            .values({
              project_id: projectId,
              diagram_id: diagramId,
              role: 'user',
              content: prompt,
            })
            .execute();

          // Save assistant message
          await db
            .insertInto('chat_messages')
            .values({
              project_id: projectId,
              diagram_id: diagramId,
              role: 'assistant',
              content: result.chatAnswer,
            })
            .execute();
        } catch (dbError) {
          logger.error('Failed to save chat messages:', dbError);
          // Don't fail the request if database save fails
        }
      }

      res.json(result);
    } catch (error) {
      logger.error('Error generating diagram:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
