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
        // Process CSV
        try {
          const text = buffer.toString('utf-8');
          const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true
          });
          
          processedContent = `CSV 데이터:\n`;
          processedContent += `총 ${result.data.length}개의 행\n`;
          
          // Include first 10 rows
          const preview = result.data.slice(0, 10);
          processedContent += JSON.stringify(preview, null, 2);
          
          if (result.data.length > 10) {
            processedContent += `\n... 그 외 ${result.data.length - 10}개 행 더 있음`;
          }
        } catch (error) {
          console.error('CSV processing error:', error);
          processedContent = 'CSV 파일을 처리할 수 없습니다.';
        }
        break;

      case 'txt':
        // Process text file
        try {
          processedContent = buffer.toString('utf-8');
          // Limit to first 5000 characters
          if (processedContent.length > 5000) {
            processedContent = processedContent.substring(0, 5000) + '...(truncated)';
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
    const session = await auth();
    if (!session?.user) {
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