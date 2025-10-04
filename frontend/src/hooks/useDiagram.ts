import { useState } from 'react';
import { Diagram, DiagramVersion, createDiagramVersion, getDiagram } from '../services/projectsApi';

export function useDiagram() {
  const [currentDiagram, setCurrentDiagram] = useState<string>('');
  const [currentDiagramObj, setCurrentDiagramObj] = useState<Diagram | null>(null);
  const [currentVersion, setCurrentVersion] = useState<DiagramVersion | null>(null);

  const updateDiagram = async (mermaidCode: string, isScratchMode: boolean) => {
    setCurrentDiagram(mermaidCode);

    // If in project mode, save as new version
    if (!isScratchMode && currentDiagramObj) {
      try {
        const version = await createDiagramVersion(currentDiagramObj.id, mermaidCode);
        setCurrentVersion(version);
      } catch (error) {
        console.error('Failed to save diagram version:', error);
      }
    }
  };

  const selectDiagram = async (diagram: Diagram | null) => {
    if (!diagram) {
      setCurrentDiagramObj(null);
      setCurrentVersion(null);
      setCurrentDiagram('');
      return;
    }

    setCurrentDiagramObj(diagram);

    // Load full diagram with versions
    const fullDiagram = await getDiagram(diagram.id);
    if (fullDiagram.latestVersion) {
      setCurrentVersion(fullDiagram.latestVersion);
      setCurrentDiagram(fullDiagram.latestVersion.mermaid_code);
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
    const fullDiagram = await getDiagram(diagramId);
    if (fullDiagram.latestVersion) {
      setCurrentDiagramObj(fullDiagram.diagram);
      setCurrentVersion(fullDiagram.latestVersion);
      setCurrentDiagram(fullDiagram.latestVersion.mermaid_code);
    }
  };

  return {
    currentDiagram,
    currentDiagramObj,
    currentVersion,
    updateDiagram,
    selectDiagram,
    selectVersion,
    clearDiagram,
    setDiagramState,
    loadDiagram,
  };
}
