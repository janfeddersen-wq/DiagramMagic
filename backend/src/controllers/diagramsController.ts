import { Request, Response } from 'express';
import { db } from '../database/connection.js';

export class DiagramsController {
  async listByProject(req: Request, res: Response) {
    try {
      if (!req.user) {
        console.error('[DiagramsController] List diagrams - Not authenticated');
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.projectId);
      console.log(`[DiagramsController] Listing diagrams for project ${projectId}, user ${req.user.userId}`);

      // Verify project ownership
      const project = await db
        .selectFrom('projects')
        .select('id')
        .where('id', '=', projectId)
        .where('user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!project) {
        console.error(`[DiagramsController] Project ${projectId} not found or not owned by user ${req.user.userId}`);
        return res.status(404).json({ error: 'Project not found' });
      }

      const diagrams = await db
        .selectFrom('diagrams')
        .selectAll()
        .where('project_id', '=', projectId)
        .orderBy('updated_at', 'desc')
        .execute();

      console.log(`[DiagramsController] Found ${diagrams.length} diagrams for project ${projectId}`);
      return res.json({ diagrams });
    } catch (error) {
      console.error('[DiagramsController] List diagrams error:', error);
      return res.status(500).json({ error: 'Failed to list diagrams' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.projectId);
      const { name, description, mermaidCode } = req.body;

      if (!name || !mermaidCode) {
        return res.status(400).json({ error: 'Name and mermaid code are required' });
      }

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

      // Create diagram
      const diagram = await db
        .insertInto('diagrams')
        .values({
          project_id: projectId,
          name,
          description: description || null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Create initial version
      const version = await db
        .insertInto('diagram_versions')
        .values({
          diagram_id: diagram.id,
          version: 1,
          mermaid_code: mermaidCode,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return res.status(201).json({ diagram, version });
    } catch (error) {
      console.error('Create diagram error:', error);
      return res.status(500).json({ error: 'Failed to create diagram' });
    }
  }

  async get(req: Request, res: Response) {
    try {
      if (!req.user) {
        console.error('[DiagramsController] Get diagram - Not authenticated');
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const diagramId = parseInt(req.params.id);
      console.log(`[DiagramsController] Getting diagram ${diagramId} for user ${req.user.userId}`);

      // Get diagram with project ownership verification
      const diagram = await db
        .selectFrom('diagrams')
        .innerJoin('projects', 'projects.id', 'diagrams.project_id')
        .selectAll('diagrams')
        .where('diagrams.id', '=', diagramId)
        .where('projects.user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!diagram) {
        console.error(`[DiagramsController] Diagram ${diagramId} not found or not owned by user ${req.user.userId}`);
        return res.status(404).json({ error: 'Diagram not found' });
      }

      // Get latest version
      const latestVersion = await db
        .selectFrom('diagram_versions')
        .selectAll()
        .where('diagram_id', '=', diagramId)
        .orderBy('version', 'desc')
        .limit(1)
        .executeTakeFirst();

      console.log(`[DiagramsController] Found diagram ${diagramId} with version ${latestVersion?.version || 'none'}`);
      return res.json({ diagram, latestVersion });
    } catch (error) {
      console.error('[DiagramsController] Get diagram error:', error);
      return res.status(500).json({ error: 'Failed to get diagram' });
    }
  }

  async getChatHistory(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const diagramId = parseInt(req.params.id);

      // Verify diagram ownership through project
      const diagram = await db
        .selectFrom('diagrams')
        .innerJoin('projects', 'projects.id', 'diagrams.project_id')
        .select('diagrams.id')
        .where('diagrams.id', '=', diagramId)
        .where('projects.user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!diagram) {
        return res.status(404).json({ error: 'Diagram not found' });
      }

      // Get chat messages for this diagram
      const messages = await db
        .selectFrom('chat_messages')
        .selectAll()
        .where('diagram_id', '=', diagramId)
        .orderBy('created_at', 'asc')
        .execute();

      return res.json({ messages });
    } catch (error) {
      console.error('Get diagram chat history error:', error);
      return res.status(500).json({ error: 'Failed to get chat history' });
    }
  }

  async createVersion(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const diagramId = parseInt(req.params.id);
      const { mermaidCode } = req.body;

      if (!mermaidCode) {
        return res.status(400).json({ error: 'Mermaid code is required' });
      }

      // Verify diagram ownership
      const diagram = await db
        .selectFrom('diagrams')
        .innerJoin('projects', 'projects.id', 'diagrams.project_id')
        .select('diagrams.id')
        .where('diagrams.id', '=', diagramId)
        .where('projects.user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!diagram) {
        return res.status(404).json({ error: 'Diagram not found' });
      }

      // Get latest version number
      const latestVersion = await db
        .selectFrom('diagram_versions')
        .select('version')
        .where('diagram_id', '=', diagramId)
        .orderBy('version', 'desc')
        .limit(1)
        .executeTakeFirst();

      const newVersionNumber = (latestVersion?.version || 0) + 1;

      // Create new version
      const version = await db
        .insertInto('diagram_versions')
        .values({
          diagram_id: diagramId,
          version: newVersionNumber,
          mermaid_code: mermaidCode,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Update diagram's updated_at
      await db
        .updateTable('diagrams')
        .set({ updated_at: new Date().toISOString() })
        .where('id', '=', diagramId)
        .execute();

      return res.status(201).json({ version });
    } catch (error) {
      console.error('Create version error:', error);
      return res.status(500).json({ error: 'Failed to create version' });
    }
  }

  async listVersions(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const diagramId = parseInt(req.params.id);

      // Verify diagram ownership
      const diagram = await db
        .selectFrom('diagrams')
        .innerJoin('projects', 'projects.id', 'diagrams.project_id')
        .select('diagrams.id')
        .where('diagrams.id', '=', diagramId)
        .where('projects.user_id', '=', req.user.userId)
        .executeTakeFirst();

      if (!diagram) {
        return res.status(404).json({ error: 'Diagram not found' });
      }

      const versions = await db
        .selectFrom('diagram_versions')
        .selectAll()
        .where('diagram_id', '=', diagramId)
        .orderBy('version', 'desc')
        .execute();

      return res.json({ versions });
    } catch (error) {
      console.error('List versions error:', error);
      return res.status(500).json({ error: 'Failed to list versions' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const diagramId = parseInt(req.params.id);

      // Verify diagram ownership and delete
      const result = await db
        .deleteFrom('diagrams')
        .where('id', '=', diagramId)
        .where('project_id', 'in', (eb) =>
          eb
            .selectFrom('projects')
            .select('id')
            .where('user_id', '=', req.user!.userId)
        )
        .executeTakeFirst();

      if (result.numDeletedRows === 0n) {
        return res.status(404).json({ error: 'Diagram not found' });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('Delete diagram error:', error);
      return res.status(500).json({ error: 'Failed to delete diagram' });
    }
  }
}
