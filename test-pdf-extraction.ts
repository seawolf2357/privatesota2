// Test PDF text extraction with various methods
import fs from 'fs';
import path from 'path';

// Method 1: Using pdf.js-dist (more reliable)
async function extractWithPdfJs(pdfPath: string) {
  console.log('\n📚 Method 1: Testing with pdf.js-dist...');
  try {
    // Dynamic import to avoid bundler issues
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Set worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
    
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    
    console.log(`✅ PDF loaded: ${pdf.numPages} pages`);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
      
      if (i === 1) {
        console.log(`📄 Page 1 preview: ${pageText.substring(0, 200)}...`);
      }
    }
    
    return fullText;
  } catch (error) {
    console.error('❌ pdf.js-dist error:', error.message);
    return null;
  }
}

// Method 2: Using pdf-parse with workaround
async function extractWithPdfParse(pdfPath: string) {
  console.log('\n📚 Method 2: Testing with pdf-parse (with workaround)...');
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Create a minimal mock for the test file pdf-parse looks for
    const testDataDir = path.join(process.cwd(), 'test', 'data');
    const testFile = path.join(testDataDir, '05-versions-space.pdf');
    
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    if (!fs.existsSync(testFile)) {
      // Create a minimal valid PDF
      const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 203 %%EOF');
      fs.writeFileSync(testFile, minimalPDF);
    }
    
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(pdfBuffer, {
      max: 0, // Disable worker threads
      // Provide custom render function to avoid test file issue
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
    
    console.log(`✅ PDF parsed successfully`);
    console.log(`📊 Stats: ${data.numpages} pages, ${data.text.length} characters`);
    
    if (data.info) {
      console.log(`📋 Metadata:`, {
        Title: data.info.Title || 'N/A',
        Author: data.info.Author || 'N/A',
        Creator: data.info.Creator || 'N/A',
        Producer: data.info.Producer || 'N/A'
      });
    }
    
    console.log(`📄 Text preview: ${data.text.substring(0, 200)}...`);
    
    return data.text;
  } catch (error) {
    console.error('❌ pdf-parse error:', error.message);
    return null;
  }
}

// Method 3: Alternative using pdf2json
async function extractWithPdf2Json(pdfPath: string) {
  console.log('\n📚 Method 3: Testing with pdf2json...');
  try {
    const PDFParser = (await import('pdf2json')).default;
    const pdfParser = new PDFParser();
    
    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('❌ pdf2json error:', errData.parserError);
        resolve(null);
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let text = '';
          pdfData.Pages.forEach((page: any, pageIndex: number) => {
            text += `\n--- Page ${pageIndex + 1} ---\n`;
            page.Texts.forEach((textItem: any) => {
              textItem.R.forEach((r: any) => {
                text += decodeURIComponent(r.T) + ' ';
              });
            });
          });
          
          console.log(`✅ PDF parsed: ${pdfData.Pages.length} pages`);
          console.log(`📄 Text preview: ${text.substring(0, 200)}...`);
          resolve(text);
        } catch (error) {
          console.error('❌ Processing error:', error);
          resolve(null);
        }
      });
      
      pdfParser.loadPDF(pdfPath);
    });
  } catch (error) {
    console.error('❌ pdf2json error:', error.message);
    return null;
  }
}

// Test with Yuri API
async function sendToYuriAPI(text: string) {
  console.log('\n🤖 Sending extracted text to Yuri API...');
  
  const FRIENDLI_API_KEY = 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
  const FRIENDLI_URL = 'https://api.friendli.ai/dedicated/v1/chat/completions';
  const FRIENDLI_MODEL = 'dep86pjolcjjnv8';
  
  try {
    // Truncate text if too long (keep first 10000 chars)
    const truncatedText = text.length > 10000 
      ? text.substring(0, 10000) + '\n...[문서가 길어서 일부만 표시]'
      : text;
    
    const request = {
      model: FRIENDLI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are jetXA, an AI assistant. Analyze the provided document text and give a comprehensive summary.'
        },
        {
          role: 'user',
          content: `Please analyze this PDF document content and provide:
1. Main topic/subject
2. Key points
3. Document type
4. Any notable insights

Document content:
${truncatedText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    };
    
    const response = await fetch(FRIENDLI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    const result = await response.json();
    if (result.choices?.[0]?.message?.content) {
      console.log('\n✅ Yuri Analysis:');
      console.log(result.choices[0].message.content);
    } else {
      console.log('❌ No response from Yuri:', result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ API error:', error);
  }
}

// Main test function
async function testPDFExtraction() {
  console.log('🚀 Testing PDF Text Extraction Methods\n');
  console.log('='*50);
  
  const pdfPath = path.join(process.cwd(), '..', 'VIDraft K-AI.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF file not found:', pdfPath);
    return;
  }
  
  console.log(`📄 Testing with: ${pdfPath}`);
  console.log(`📊 File size: ${(fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // Try Method 2 first (pdf-parse with workaround)
  const text2 = await extractWithPdfParse(pdfPath);
  
  if (text2 && text2.trim()) {
    console.log('\n✅ Successfully extracted text with pdf-parse!');
    console.log(`📊 Extracted ${text2.length} characters`);
    
    // Send to Yuri API
    await sendToYuriAPI(text2);
  } else {
    console.log('\n⚠️ pdf-parse failed, trying alternative methods...');
    
    // Try Method 3 (pdf2json)
    const text3 = await extractWithPdf2Json(pdfPath);
    
    if (text3 && text3.trim()) {
      console.log('\n✅ Successfully extracted text with pdf2json!');
      await sendToYuriAPI(text3);
    } else {
      console.log('\n⚠️ All extraction methods failed.');
      console.log('📝 This PDF might be:');
      console.log('   - Scanned image PDF (needs OCR)');
      console.log('   - Encrypted or protected');
      console.log('   - Using unsupported encoding');
    }
  }
  
  // Clean up test files
  const testFile = path.join(process.cwd(), 'test', 'data', '05-versions-space.pdf');
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
    console.log('\n🧹 Cleaned up test files');
  }
}

// Run the test
testPDFExtraction().catch(console.error);