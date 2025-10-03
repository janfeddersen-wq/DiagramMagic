import { Request, Response } from 'express';
import { ReactAgent } from '../services/reactAgent.js';
import { DiagramRequest } from '../types/index.js';
import { Server } from 'socket.io';

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
      const { prompt, chatHistory, currentDiagram }: DiagramRequest = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const result = await this.agent.generateDiagram(
        prompt,
        chatHistory || [],
        currentDiagram
      );

      res.json(result);
    } catch (error) {
      console.error('Error generating diagram:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
