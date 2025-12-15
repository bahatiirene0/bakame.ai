/**
 * FilePreview Component
 *
 * Shows selected files before sending a message.
 * - Image thumbnail or document icon
 * - File name and size
 * - Remove button
 * - Upload progress indicator
 */

'use client'
/* eslint-disable */;

import { useMemo } from 'react';
import { formatFileSize } from '@/lib/files';

export interface PendingFile {
  id: string;
  file: File;
  preview?: string; // Object URL for images
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface FilePreviewProps {
  files: PendingFile[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export default function FilePreview({ files, onRemove, disabled = false }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 mb-2 rounded-xl bg-gray-50 dark:bg-white/5">
      {files.map((pendingFile) => (
        <FilePreviewItem
          key={pendingFile.id}
          pendingFile={pendingFile}
          onRemove={() => onRemove(pendingFile.id)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface FilePreviewItemProps {
  pendingFile: PendingFile;
  onRemove: () => void;
  disabled: boolean;
}

function FilePreviewItem({ pendingFile, onRemove, disabled }: FilePreviewItemProps) {
  const { file, preview, uploading, error } = pendingFile;

  const isImage = file.type.startsWith('image/');
  const fileSize = useMemo(() => formatFileSize(file.size), [file.size]);

  // Get file icon based on type
  const FileIcon = () => {
    if (file.type === 'application/pdf') {
      return (
        <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5zm2 0c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5zm2 0c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5z"/>
        </svg>
      );
    }
    if (file.type.includes('wordprocessingml')) {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9 17H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8-4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
        </svg>
      );
    }
    if (file.type.includes('spreadsheetml')) {
      return (
        <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2zm4 4h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
        </svg>
      );
    }
    // Generic file icon
    return (
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    );
  };

  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg
        bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10
        ${error ? 'border-red-300 dark:border-red-500/30' : ''}
        ${uploading ? 'opacity-70' : ''}`}
    >
      {/* Thumbnail or Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center">
        {isImage && preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileIcon />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">
          {file.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : uploading ? (
            <span className="text-blue-500">Uploading...</span>
          ) : (
            fileSize
          )}
        </p>
      </div>

      {/* Remove Button */}
      {!uploading && (
        <button
          onClick={onRemove}
          disabled={disabled}
          className="flex-shrink-0 p-1 rounded-full
            text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200"
          aria-label={`Remove ${file.name}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-lg">
          <svg className="w-5 h-5 animate-spin text-green-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
