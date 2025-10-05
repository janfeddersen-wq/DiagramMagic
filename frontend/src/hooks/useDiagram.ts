import { useState } from 'react';
import { Diagram, DiagramVersion, createDiagramVersion, getDiagram } from '../services/projectsApi';
import { createLogger } from '../utils/logger';

const logger = createLogger('useDiagram');

export function useDiagram() {
  const [currentDiagram, setCurrentDiagram] = useState<string>('');
  const [currentDiagramObj, setCurrentDiagramObj] = useState<Diagram | null>(null);
  const [currentVersion, setCurrentVersion] = useState<DiagramVersion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [versionRefreshTrigger, setVersionRefreshTrigger] = useState<number>(0);

  const updateDiagram = async (mermaidCode: string, isScratchMode: boolean) => {
    setCurrentDiagram(mermaidCode);

    // If in project mode, save as new version
    if (!isScratchMode && currentDiagramObj) {
      try {
        const version = await createDiagramVersion(currentDiagramObj.id, mermaidCode);
        setCurrentVersion(version);
        // Trigger version history refresh
        setVersionRefreshTrigger(prev => prev + 1);
      } catch (error) {
        logger.error('Failed to save diagram version:', error);
      }
    }
  };

  const selectDiagram = async (diagram: Diagram | null) => {
    if (!diagram) {
      setCurrentDiagramObj(null);
      setCurrentVersion(null);
      setCurrentDiagram('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCurrentDiagramObj(diagram);

    // Load full diagram with versions
    try {
      const fullDiagram = await getDiagram(diagram.id);
      if (fullDiagram.latestVersion) {
        setCurrentVersion(fullDiagram.latestVersion);
        setCurrentDiagram(fullDiagram.latestVersion.mermaid_code);
      }
    } catch (error) {
      logger.error('Failed to load diagram:', error);
      // Reset state on error
      setCurrentDiagramObj(null);
      setCurrentVersion(null);
      setCurrentDiagram('');
    } finally {
      setIsLoading(false);
    }
  };

  const selectVersion = async (version: DiagramVersion) => {
    setCurrentVersion(version);
    setCurrentDiagram(version.mermaid_code);
  };

  const clearDiagram = () => {
    setCurrentDiagram('');
    setCurrentDiagramObj(null);
    setCurrentVersion(null);
  };

  const setDiagramState = (diagram: Diagram, version: DiagramVersion, code: string) => {
    setCurrentDiagramObj(diagram);
    setCurrentVersion(version);
    setCurrentDiagram(code);
  };

  const loadDiagram = async (diagramId: number) => {
    setIsLoading(true);
    try {
      const fullDiagram = await getDiagram(diagramId);
      if (fullDiagram.latestVersion) {
        setCurrentDiagramObj(fullDiagram.diagram);
        setCurrentVersion(fullDiagram.latestVersion);
        setCurrentDiagram(fullDiagram.latestVersion.mermaid_code);
      }
    } catch (error) {
      logger.error('Failed to load diagram:', error);
      // Reset state on error
      setCurrentDiagramObj(null);
      setCurrentVersion(null);
      setCurrentDiagram('');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentDiagram,
    currentDiagramObj,
    currentVersion,
    isLoading,
    versionRefreshTrigger,
    updateDiagram,
    selectDiagram,
    selectVersion,
    clearDiagram,
    setDiagramState,
    loadDiagram,
  };
}
