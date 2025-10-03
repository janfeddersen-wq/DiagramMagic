import axios from 'axios';

const API_BASE_URL = '/api';

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Diagram {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagramVersion {
  id: number;
  diagram_id: number;
  version: number;
  mermaid_code: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  project_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Projects API
export async function listProjects(): Promise<Project[]> {
  const response = await axios.get(`${API_BASE_URL}/projects`, {
    headers: getAuthHeaders(),
  });
  return response.data.projects;
}

export async function createProject(name: string, description?: string): Promise<Project> {
  const response = await axios.post(
    `${API_BASE_URL}/projects`,
    { name, description },
    { headers: getAuthHeaders() }
  );
  return response.data.project;
}

export async function getProject(id: number): Promise<Project> {
  const response = await axios.get(`${API_BASE_URL}/projects/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data.project;
}

export async function updateProject(id: number, name: string, description?: string): Promise<Project> {
  const response = await axios.put(
    `${API_BASE_URL}/projects/${id}`,
    { name, description },
    { headers: getAuthHeaders() }
  );
  return response.data.project;
}

export async function deleteProject(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/projects/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function getProjectChatHistory(projectId: number): Promise<ChatMessage[]> {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/chat`, {
    headers: getAuthHeaders(),
  });
  return response.data.messages;
}

export async function getDiagramChatHistory(diagramId: number): Promise<ChatMessage[]> {
  const response = await axios.get(`${API_BASE_URL}/diagrams/${diagramId}/chat`, {
    headers: getAuthHeaders(),
  });
  return response.data.messages;
}

// Diagrams API
export async function listDiagramsByProject(projectId: number): Promise<Diagram[]> {
  const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/diagrams`, {
    headers: getAuthHeaders(),
  });
  return response.data.diagrams;
}

export async function createDiagram(
  projectId: number,
  name: string,
  mermaidCode: string,
  description?: string
): Promise<{ diagram: Diagram; version: DiagramVersion }> {
  const response = await axios.post(
    `${API_BASE_URL}/projects/${projectId}/diagrams`,
    { name, mermaidCode, description },
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function getDiagram(id: number): Promise<{ diagram: Diagram; latestVersion: DiagramVersion }> {
  const response = await axios.get(`${API_BASE_URL}/diagrams/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteDiagram(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/diagrams/${id}`, {
    headers: getAuthHeaders(),
  });
}

export async function createDiagramVersion(diagramId: number, mermaidCode: string): Promise<DiagramVersion> {
  const response = await axios.post(
    `${API_BASE_URL}/diagrams/${diagramId}/versions`,
    { mermaidCode },
    { headers: getAuthHeaders() }
  );
  return response.data.version;
}

export async function listDiagramVersions(diagramId: number): Promise<DiagramVersion[]> {
  const response = await axios.get(`${API_BASE_URL}/diagrams/${diagramId}/versions`, {
    headers: getAuthHeaders(),
  });
  return response.data.versions;
}
