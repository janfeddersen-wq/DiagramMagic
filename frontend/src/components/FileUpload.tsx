import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { uploadFile } from '../services/api';

interface FileUploadProps {
  onFileProcessed: (data: FileProcessedData) => void;
  onError: (error: string) => void;
}

export interface FileProcessedData {
  type: 'document' | 'image';
  markdown?: string;
  diagram?: string;
  description?: string;
  requiresSheetSelection?: boolean;
  sheets?: string[];
  fileName?: string;
}

export interface FileUploadHandle {
  triggerUpload: (file: File) => void;
}

export const FileUpload = forwardRef<FileUploadHandle, FileUploadProps>(({ onFileProcessed, onError }, ref) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSheetSelection, setShowSheetSelection] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File, sheetIndex?: number) => {
    setIsUploading(true);
    try {
      const result = await uploadFile(file, sheetIndex);

      if (result.requiresSheetSelection && result.sheets) {
        // Show sheet selection dialog for Excel files
        setAvailableSheets(result.sheets);
        setShowSheetSelection(true);
        setIsUploading(false);
        return;
      }

      onFileProcessed(result);
      setSelectedFile(null);
      setShowSheetSelection(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to upload file');
      setSelectedFile(null);
      setShowSheetSelection(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSheetSelection = () => {
    if (selectedFile && selectedSheet) {
      const sheetIndex = availableSheets.indexOf(selectedSheet);
      handleUpload(selectedFile, sheetIndex);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Expose triggerUpload method to parent component
  useImperativeHandle(ref, () => ({
    triggerUpload: (file: File) => {
      setSelectedFile(file);
      handleUpload(file);
    }
  }));

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Upload file (Word, Excel, CSV, or Image)"
      >
        {isUploading ? (
          <svg className="w-5 h-5 text-gray-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )}
      </button>

      {/* Sheet Selection Modal */}
      {showSheetSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Select Excel Sheet</h3>
            <p className="text-sm text-gray-600 mb-4">
              This Excel file contains multiple sheets. Please select which sheet you want to use:
            </p>

            <div className="space-y-2 mb-6">
              {availableSheets.map((sheet, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="sheet"
                    value={sheet}
                    checked={selectedSheet === sheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-800">{sheet}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSheetSelection(false);
                  setSelectedFile(null);
                  setSelectedSheet('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSheetSelection}
                disabled={!selectedSheet}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

FileUpload.displayName = 'FileUpload';
