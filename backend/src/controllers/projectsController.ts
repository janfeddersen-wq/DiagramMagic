import { Request, Response } from 'express';
import { db } from '../database/connection.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProjectsController');

export class ProjectsController {
  async list(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projects = await db
        .selectFrom('projects')
        .selectAll()
        .where('user_id', '=', req.user.userId)
        .orderBy('updated_at', 'desc')
        .execute();

      return res.json({ projects });
    } catch (error) {
      logger.error('List projects error:', error);
      return res.status(500).json({ error: 'Failed to list projects' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      const project = await db
        .insertInto('projects')
        .values({
          user_id: req.user.userId,
          name,
          description: description || null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return res.status(201).json({ project });
    } catch (error) {
      logger.error('Create project error:', error);
      return res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async get(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.id);

      const project = await db
        .selectFrom('projects')
        .selectAll()
        .where('id', '=', projectId)
        .where('user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({ project });
    } catch (error) {
      logger.error('Get project error:', error);
      return res.status(500).json({ error: 'Failed to get project' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.id);
      const { name, description } = req.body;

      const project = await db
        .updateTable('projects')
        .set({
          name,
          description: description || null,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', projectId)
        .where('user_id', '=', req.user.userId)
        .returningAll()
        .executeTakeFirst();

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({ project });
    } catch (error) {
      logger.error('Update project error:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.id);

      const result = await db
        .deleteFrom('projects')
        .where('id', '=', projectId)
        .where('user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({ success: true });
    } catch (error) {
      logger.error('Delete project error:', error);
      return res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  async getChatHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.id);

      // Verify project ownership
      const project = await db
        .selectFrom('projects')
        .select('id')
        .where('id', '=', projectId)
        .where('user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const messages = await db
        .selectFrom('chat_messages')
        .selectAll()
        .where('project_id', '=', projectId)
        .orderBy('created_at', 'asc')
        .execute();

      return res.json({ messages });
    } catch (error) {
      logger.error('Get chat history error:', error);
      return res.status(500).json({ error: 'Failed to get chat history' });
    }
  }
}
