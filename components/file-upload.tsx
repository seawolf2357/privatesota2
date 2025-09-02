'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, FileSpreadsheet, File, Image } from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  fileId: string;
  filename: string;
  fileType: string;
  processedContent?: string;
}

interface FileUploadProps {
  sessionId: string;
  uploadedFiles?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
}

export function FileUpload({ sessionId, uploadedFiles = [], onFilesChange }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDemoMode = sessionId === 'demo' || sessionId?.startsWith('demo-');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-demo-mode': 'true', // Enable demo mode for upload
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        newFiles.push(data);
        toast.success(`${file.name} 업로드 완료`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`${file.name} 업로드 실패`);
      }
    }

    const updatedFiles = [...uploadedFiles, ...newFiles];
    onFilesChange?.(updatedFiles);
    setIsUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/upload?fileId=${fileId}`, {
        method: 'DELETE',
        headers: {
          'x-demo-mode': isDemoMode ? 'true' : 'false',
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const updatedFiles = uploadedFiles.filter(f => f.fileId !== fileId);
      onFilesChange?.(updatedFiles);
      toast.success('파일 삭제 완료');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('파일 삭제 실패');
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'bmp':
      case 'svg':
        return <Image className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full"
        >
          <Paperclip className="mr-2 h-4 w-4" />
          {isUploading ? '업로드 중...' : '파일 선택'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">업로드된 파일:</div>
          {uploadedFiles.map((file) => (
            <div
              key={file.fileId}
              className="flex items-center justify-between p-2 bg-muted rounded-md"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getFileIcon(file.fileType)}
                <span className="text-sm truncate">{file.filename}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleFileDelete(file.fileId)}
                className="ml-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}