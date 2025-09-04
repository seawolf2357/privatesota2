// PDF OCR processing for scanned documents
import Tesseract from 'tesseract.js';
import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export async function extractTextWithOCR(pdfBuffer: Buffer): Promise<string> {
  try {
    // First try regular text extraction
    const regularText = await extractRegularText(pdfBuffer);
    if (regularText && regularText.trim().length > 100) {
      return regularText;
    }

    // If no text or very little text, try OCR
    console.log('No text found in PDF, attempting OCR...');
    const ocrText = await performOCR(pdfBuffer);
    return ocrText;
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw error;
  }
}

async function extractRegularText(pdfBuffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(pdfBuffer, { max: 0 });
    return data.text;
  } catch (error) {
    console.error('Regular text extraction failed:', error);
    return '';
  }
}

async function performOCR(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert PDF to images
    const images = await pdfToImages(pdfBuffer);
    
    // Perform OCR on each image
    const ocrResults = await Promise.all(
      images.map(async (image, index) => {
        console.log(`Processing page ${index + 1}/${images.length} with OCR...`);
        
        const { data: { text } } = await Tesseract.recognize(
          image,
          'kor+eng', // Korean and English
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            }
          }
        );
        
        return `\n--- Page ${index + 1} ---\n${text}`;
      })
    );
    
    return ocrResults.join('\n');
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  }
}

async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  try {
    const pdf = await pdfjs.getDocument({ data: pdfBuffer }).promise;
    const numPages = pdf.numPages;
    const images: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Cannot create canvas context');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to base64 image
      const imageDataUrl = canvas.toDataURL('image/png');
      images.push(imageDataUrl);
    }
    
    return images;
  } catch (error) {
    console.error('PDF to image conversion failed:', error);
    throw error;
  }
}

// Server-side OCR using node-tesseract-ocr (alternative approach)
export async function serverSideOCR(pdfBuffer: Buffer): Promise<string> {
  try {
    // For server-side, we need to:
    // 1. Convert PDF to images using pdf2pic or similar
    // 2. Use node-tesseract-ocr for OCR
    
    // This is a placeholder for server-side implementation
    // You would need to install: pdf2pic, node-tesseract-ocr
    
    const pdf2pic = require('pdf2pic');
    const tesseract = require('node-tesseract-ocr');
    
    const converter = new pdf2pic.fromBuffer(pdfBuffer, {
      density: 300,
      savename: 'temp',
      savedir: './temp',
      format: 'png',
      width: 2480,
      height: 3508
    });
    
    // Convert all pages
    const pdfInfo = await converter.pdfInfo();
    const results = [];
    
    for (let i = 1; i <= pdfInfo.pages; i++) {
      const image = await converter(i);
      
      const config = {
        lang: 'kor+eng',
        oem: 1,
        psm: 3,
      };
      
      const text = await tesseract.recognize(image.path, config);
      results.push(text);
      
      // Clean up temp file
      const fs = require('fs');
      fs.unlinkSync(image.path);
    }
    
    return results.join('\n\n');
  } catch (error) {
    console.error('Server-side OCR failed:', error);
    return '';
  }
}