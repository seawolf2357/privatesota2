import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { put } from '@vercel/blob';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
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
        // Process PDF
        try {
          const uint8Array = new Uint8Array(buffer);
          const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
          const pdf = await loadingTask.promise;
          
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textContent += content.items
              .map((item: any) => item.str)
              .join(' ') + '\n';
          }
          processedContent = textContent;
        } catch (error) {
          console.error('PDF processing error:', error);
          processedContent = 'PDF 파일을 처리할 수 없습니다.';
        }
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

      default:
        return NextResponse.json(
          { error: '지원하지 않는 파일 형식입니다.' },
          { status: 400 }
        );
    }

    // Store file metadata and processed content in blob storage
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