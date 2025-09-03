import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { put } from '@vercel/blob';
import Papa from 'papaparse';

// PDF processing with multiple fallback strategies
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Strategy 1: Try pdfjs-dist (more reliable)
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker source for pdfjs-dist
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.log('pdfjs-dist failed, trying pdf-parse:', error instanceof Error ? error.message : 'Unknown error');
    
    // Strategy 2: Try pdf-parse as fallback
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(buffer);
      return data.text || '';
    } catch (parseError) {
      console.log('pdf-parse also failed, using basic extraction:', parseError instanceof Error ? parseError.message : 'Unknown error');
      
      // Strategy 3: Basic text extraction from PDF buffer
      try {
        const text = buffer.toString('utf8');
        // Extract readable text patterns from PDF
        const textMatches = text.match(/[\x20-\x7E\uAC00-\uD7A3]{10,}/g) || [];
        const extractedText = textMatches
          .filter(match => !match.includes('obj') && !match.includes('endobj'))
          .join(' ')
          .slice(0, 10000);
        
        if (extractedText.length > 100) {
          return extractedText;
        }
      } catch (e) {
        console.error('Basic text extraction failed:', e);
      }
    }
  }
  
  return '';
}

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
        // Enhanced PDF processing with fallback
        try {
          const extractedText = await extractPdfText(buffer);
          
          processedContent = `📄 PDF 파일 분석\n\n`;
          processedContent += `**파일 정보**:\n`;
          processedContent += `- 파일명: ${file.name}\n`;
          processedContent += `- 크기: ${(file.size / 1024).toFixed(2)} KB\n\n`;
          
          if (extractedText && extractedText.length > 0) {
            processedContent += `**텍스트 내용**:\n`;
            
            // Clean up text
            let cleanedText = extractedText.replace(/\s+/g, ' ').trim();
            
            // Limit text length for very large PDFs
            if (cleanedText.length > 10000) {
              processedContent += cleanedText.substring(0, 10000);
              processedContent += `\n\n... (전체 ${cleanedText.length}자 중 일부만 표시)\n`;
              processedContent += `\n**요약**: PDF 문서가 매우 크므로 처음 10,000자만 표시했습니다.`;
            } else {
              processedContent += cleanedText;
            }
          } else {
            processedContent += `⚠️ PDF 텍스트 추출 실패\n\n`;
            processedContent += `이 PDF 파일에서 텍스트를 추출할 수 없습니다.\n`;
            processedContent += `가능한 원인:\n`;
            processedContent += `- 스캔된 이미지 PDF\n`;
            processedContent += `- 암호화된 PDF\n`;
            processedContent += `- 특수 인코딩 사용\n\n`;
            processedContent += `텍스트 파일로 변환 후 다시 업로드해주세요.`;
          }
        } catch (error) {
          console.error('PDF processing error:', error);
          // Fallback to basic info if pdf-parse fails
          processedContent = `[PDF File: ${file.name}]\nSize: ${(file.size / 1024).toFixed(2)} KB\n`;
          processedContent += `PDF 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
        }
        break;

      case 'csv':
        // Enhanced CSV processing from AGI Space
        try {
          const text = buffer.toString('utf-8');
          const result: any = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true
          });
          
          processedContent = `CSV 데이터 분석:\n`;
          processedContent += `총 ${result.data?.length || 0}개의 행\n`;
          
          if (result.meta?.fields) {
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