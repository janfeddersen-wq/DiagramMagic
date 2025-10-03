import axios from 'axios';
import { ChatMessage, DiagramResponse } from '../types';
import { FileProcessedData } from '../components/FileUpload';

const API_BASE_URL = '/api';

export async function generateDiagram(
  prompt: string,
  chatHistory: ChatMessage[],
  currentDiagram?: string,
  projectId?: number,
  diagramId?: number
): Promise<DiagramResponse> {
  const token = localStorage.getItem('auth_token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await axios.post<DiagramResponse>(
    `${API_BASE_URL}/generate`,
    {
      prompt,
      chatHistory: chatHistory.slice(-5), // Send only last 5 messages
      currentDiagram,
      projectId,
      diagramId
    },
    { headers }
  );

  return response.data;
}

export async function uploadFile(
  file: File,
  sheetIndex?: number
): Promise<FileProcessedData> {
  const formData = new FormData();
  formData.append('file', file);

  if (sheetIndex !== undefined) {
    formData.append('sheetIndex', sheetIndex.toString());
  }

  const response = await axios.post<FileProcessedData>(`${API_BASE_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}
