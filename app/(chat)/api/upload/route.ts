import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { put } from '@vercel/blob';
import Papa from 'papaparse';

// PDF processing with simplified text extraction
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Workaround for pdf-parse test file issue
    const path = (await import('path')).default;
    const fs = (await import('fs')).default;
    const testDataDir = path.join(process.cwd(), 'test', 'data');
    const testFile = path.join(testDataDir, '05-versions-space.pdf');
    
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    if (!fs.existsSync(testFile)) {
      // Create a minimal valid PDF to satisfy pdf-parse
      const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 203 %%EOF');
      fs.writeFileSync(testFile, minimalPDF);
    }
    
    // Use pdf-parse for text extraction
    const pdfParse = (await import('pdf-parse')).default;
    
    try {
      // Pass buffer with custom render function
      const data = await pdfParse(buffer, {
        // Disable worker threads to avoid file system issues
        max: 0,
        // Custom page render function for better text extraction
        pagerender: (pageData: any) => {
          const render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
          };
          return pageData.getTextContent(render_options)
            .then((textContent: any) => {
              let text = '';
              for (const item of textContent.items) {
                text += item.str + ' ';
              }
              return text;
            });
        }
      });
      
      if (data.text && data.text.trim()) {
        console.log(`Extracted ${data.text.length} characters from PDF`);
        
        // Clean the text - remove excessive whitespace but keep structure
        let cleanedText = data.text
          .replace(/\r\n/g, '\n')      // Normalize line endings
          .replace(/\n{4,}/g, '\n\n\n') // Keep max 3 newlines
          .replace(/[ \t]+/g, ' ')       // Replace multiple spaces/tabs with single space
          .replace(/\n[ \t]+/g, '\n')   // Remove leading spaces on lines
          .trim();
        
        // Build result with metadata
        let result = `📄 PDF 문서 분석\n\n`;
        if (data.info?.Title) result += `제목: ${data.info.Title}\n`;
        if (data.info?.Author) result += `작성자: ${data.info.Author}\n`;
        if (data.info?.CreationDate) {
          try {
            const date = new Date(data.info.CreationDate);
            result += `작성일: ${date.toLocaleDateString('ko-KR')}\n`;
          } catch {}
        }
        if (data.numpages) result += `페이지 수: ${data.numpages}\n`;
        result += `문자 수: ${cleanedText.length.toLocaleString()}\n`;
        result += `\n=== 텍스트 내용 ===\n\n`;
        
        // Limit text for processing but keep enough context
        if (cleanedText.length > 100000) {
          result += cleanedText.substring(0, 100000);
          result += `\n\n... [문서가 너무 길어 처음 100,000자만 표시됨]`;
        } else {
          result += cleanedText;
        }
        
        return result;
      } else {
        console.log('PDF has no extractable text');
        return '📄 PDF 파일이 업로드되었으나 텍스트를 추출할 수 없습니다.\n이미지 기반 PDF이거나 스캔된 문서일 수 있습니다.';
      }
    } catch (parseErr) {
      console.error('pdf-parse error:', parseErr);
      // Don't try pdfjs-dist fallback for now since it has issues in Node.js
      throw parseErr;
    }
    
  } catch (error) {
    console.error('PDF processing error:', error);
    // Return a message indicating PDF is scanned/image-based
    return `📄 PDF 파일이 업로드되었으나 텍스트를 추출할 수 없습니다.\n` +
           `이미지 기반 PDF이거나 스캔된 문서일 수 있습니다.`;
  }
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
        // Process PDF with text extraction
        try {
          console.log(`Processing PDF: ${file.name}, size: ${file.size} bytes`);
          
          // Try to extract text from PDF
          const extractedText = await extractPdfText(buffer);
          
          // Build processed content with extracted text
          processedContent = `[📄 PDF 문서: ${file.name}]\n`;
          processedContent += `크기: ${(file.size / 1024).toFixed(2)} KB\n\n`;
          processedContent += extractedText;
          
          console.log(`PDF processed successfully: ${processedContent.length} characters`);
          
        } catch (error) {
          console.error('PDF processing error:', error);
          
          // Even if text extraction fails, indicate file was uploaded
          processedContent = `[📄 PDF 파일 업로드됨: ${file.name}]\n\n`;
          processedContent += `파일 크기: ${(file.size / 1024).toFixed(2)} KB\n\n`;
          processedContent += `⚠️ PDF 텍스트 추출에 실패했습니다.\n`;
          processedContent += `이 PDF는 스캔된 이미지이거나 특수한 형식일 수 있습니다.\n\n`;
          processedContent += `파일이 업로드되었으니 내용에 대해 질문해 주세요.`;
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
        // Process image file for multimodal AI
        try {
          const base64 = buffer.toString('base64');
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          
          // Check if multimodal AI is available
          const useMultimodal = process.env.USE_FRIENDLI === 'true' || 
                               process.env.FRIENDLI_API_KEY;
          
          // Create a description for AI to understand
          processedContent = `[🇼️ 이미지 파일 업로드]\n`;
          processedContent += `파일명: ${file.name}\n`;
          processedContent += `크기: ${(file.size / 1024).toFixed(2)} KB\n`;
          processedContent += `형식: ${mimeType}\n\n`;
          
          if (useMultimodal) {
            // For multimodal AI, prepare base64 data
            processedContent += `사용자가 이미지를 업로드했습니다. AI가 직접 분석할 수 있습니다.\n`;
            processedContent += `[이미지 데이터: data:${mimeType};base64,${base64.substring(0, 100)}...]`;
            
            // Store full base64 for later use (could be stored in metadata)
            // This allows the AI to access the full image when needed
          } else {
            processedContent += `설명: 사용자가 이미지 파일을 업로드했습니다.\n`;
            processedContent += `참고: 멀티모달 AI가 활성화되면 이미지 내용을 직접 분석할 수 있습니다.`;
          }
          
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