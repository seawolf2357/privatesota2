import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { put } from '@vercel/blob';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    // Skip auth for demo mode
    const session = await auth();
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    
    if (!isDemoMode && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    let processedContent = '';

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process based on file type
    switch (fileExt) {
      case 'pdf':
        // PDF processing disabled due to server-side limitations
        processedContent = `[PDF File: ${file.name}]\nSize: ${(file.size / 1024).toFixed(2)} KB\n`;
        processedContent += 'PDF 내용 분석은 현재 지원되지 않습니다. 텍스트 파일로 변환 후 업로드해주세요.';
        break;

      case 'csv':
        // Enhanced CSV processing from AGI Space
        try {
          const text = buffer.toString('utf-8');
          const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            encoding: 'utf-8'
          });
          
          processedContent = `CSV 데이터 분석:\n`;
          processedContent += `총 ${result.data.length}개의 행\n`;
          
          if (result.meta.fields) {
            processedContent += `헤더: ${result.meta.fields.join(', ')}\n\n`;
          }
          
          // Include first 10 rows with better formatting
          const preview = result.data.slice(0, 10);
          processedContent += `처음 10개 행 미리보기:\n`;
          preview.forEach((row: any, index: number) => {
            processedContent += `행 ${index + 1}: ${JSON.stringify(row)}\n`;
          });
          
          if (result.data.length > 10) {
            processedContent += `\n... 그 외 ${result.data.length - 10}개 행 더 있음\n`;
          }
          
          // Add data summary
          if (result.meta.fields && result.data.length > 0) {
            processedContent += `\n데이터 요약:\n`;
            processedContent += `- 총 열 수: ${result.meta.fields.length}\n`;
            processedContent += `- 총 행 수: ${result.data.length}\n`;
          }
        } catch (error) {
          console.error('CSV processing error:', error);
          processedContent = 'CSV 파일을 처리할 수 없습니다.';
        }
        break;

      case 'txt':
      case 'md':
      case 'log':
        // Enhanced text file processing with encoding detection
        try {
          // Try UTF-8 first, then fallback to other encodings
          let textContent = '';
          try {
            textContent = buffer.toString('utf-8');
          } catch {
            // Try other common encodings
            try {
              textContent = buffer.toString('utf-16le');
            } catch {
              textContent = buffer.toString('latin1');
            }
          }
          
          processedContent = textContent;
          
          // Add file statistics
          const lines = processedContent.split('\n');
          const words = processedContent.split(/\s+/).length;
          const chars = processedContent.length;
          
          // Limit to first 10000 characters for large files
          if (processedContent.length > 10000) {
            processedContent = processedContent.substring(0, 10000) + '\n\n...(내용이 잘림)';
            processedContent += `\n\n파일 통계:\n`;
            processedContent += `- 총 줄 수: ${lines.length}\n`;
            processedContent += `- 총 단어 수: ${words}\n`;
            processedContent += `- 총 문자 수: ${chars}\n`;
          }
        } catch (error) {
          console.error('Text processing error:', error);
          processedContent = '텍스트 파일을 처리할 수 없습니다.';
        }
        break;

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'bmp':
      case 'svg':
        // Process image file
        try {
          const base64 = buffer.toString('base64');
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          
          // Create a description for AI to understand
          processedContent = `[이미지 파일 업로드됨]
파일명: ${file.name}
크기: ${(file.size / 1024).toFixed(2)} KB
형식: ${mimeType}
설명: 사용자가 이미지 파일을 업로드했습니다. 이미지 내용에 대한 질문에 답변할 준비를 하세요.
참고: 이 이미지는 base64로 인코딩되어 있으며, 시각적 분석이 필요한 경우 해당 내용을 설명할 수 있습니다.`;
          
        } catch (error) {
          console.error('Image processing error:', error);
          processedContent = '이미지 파일을 처리할 수 없습니다.';
        }
        break;

      default:
        return NextResponse.json(
          { error: '지원하지 않는 파일 형식입니다. (지원 형식: PDF, CSV, TXT, JPG, PNG, GIF, WEBP, BMP, SVG)' },
          { status: 400 }
        );
    }

    // For demo mode, skip blob storage
    if (isDemoMode) {
      return NextResponse.json({
        fileId: `demo-${Date.now()}`,
        filename: file.name,
        fileType: fileExt,
        processedContent,
        url: '#', // No actual URL in demo mode
        status: 'success'
      });
    }

    // Store file metadata and processed content in blob storage (production only)
    const blob = await put(
      `uploads/${sessionId}/${file.name}`,
      buffer,
      { access: 'public' }
    );

    return NextResponse.json({
      fileId: blob.pathname,
      filename: file.name,
      fileType: fileExt,
      processedContent,
      url: blob.url,
      status: 'success'
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Skip auth for demo mode
    const session = await auth();
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    
    if (!isDemoMode && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // In production, implement actual blob deletion
    // For now, just return success
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('File deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}