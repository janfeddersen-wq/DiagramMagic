import { useState } from 'react';
import { Project, Diagram, DiagramVersion, getDiagram } from '../services/projectsApi';
import { createLogger } from '../utils/logger';

const logger = createLogger('useProject');

export function useProject() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isScratchMode, setIsScratchMode] = useState(true);

  const selectProject = async (
    project: Project | null,
    onDiagramLoaded?: (diagram: Diagram, version: DiagramVersion, code: string) => void,
    onClear?: () => void
  ) => {
    setCurrentProject(project);
    setIsScratchMode(!project);

    if (onClear) {
      onClear();
    }

    // Load the latest diagram for this project if available
    if (project) {
      try {
        const { listDiagramsByProject } = await import('../services/projectsApi');
        const diagrams = await listDiagramsByProject(project.id);

        if (diagrams.length > 0) {
          const latestDiagram = diagrams[0];
          const fullDiagram = await getDiagram(latestDiagram.id);

          if (fullDiagram.latestVersion && onDiagramLoaded) {
            onDiagramLoaded(
              fullDiagram.diagram,
              fullDiagram.latestVersion,
              fullDiagram.latestVersion.mermaid_code
            );
          }
        }
      } catch (error) {
        logger.error('Failed to load project diagrams:', error);
      }
    }
  };

  const enterScratchMode = (onClear?: () => void) => {
    setIsScratchMode(true);
    setCurrentProject(null);
    if (onClear) {
      onClear();
    }
  };

  return {
    currentProject,
    isScratchMode,
    selectProject,
    enterScratchMode,
  };
}
