// Test Yuri (Friendli AI) API with PDF file
import fs from 'fs';
import path from 'path';

// Friendli AI configuration (corrected token)
const FRIENDLI_API_KEY = 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const FRIENDLI_URL = 'https://api.friendli.ai/dedicated/v1/chat/completions';
const FRIENDLI_MODEL = 'dep86pjolcjjnv8';

async function testPDFWithYuri() {
  console.log('🚀 Testing Yuri API with PDF file...\n');
  
  try {
    // Read the PDF file
    const pdfPath = path.join(process.cwd(), '..', 'VIDraft K-AI.pdf');
    console.log(`📄 Reading PDF from: ${pdfPath}`);
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found at:', pdfPath);
      return;
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString('base64');
    console.log(`✅ PDF loaded: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✅ Base64 encoded: ${pdfBase64.substring(0, 100)}...`);
    
    // Try text extraction first using pdf-parse
    console.log('\n📝 Attempting text extraction with pdf-parse...');
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(pdfBuffer, { max: 0 });
      
      if (pdfData.text && pdfData.text.trim()) {
        console.log(`✅ Text extracted: ${pdfData.text.length} characters`);
        console.log('Preview:', pdfData.text.substring(0, 500));
      } else {
        console.log('⚠️ No text could be extracted - might be scanned/image PDF');
      }
    } catch (error) {
      console.log('⚠️ PDF text extraction failed:', error.message);
    }
    
    // Test 1: Send PDF content as text description
    console.log('\n🔄 Test 1: Sending PDF info to Yuri API...');
    
    const request1 = {
      model: FRIENDLI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are jetXA (formerly Yuri), an advanced AI assistant. Analyze the provided document and give insights.'
        },
        {
          role: 'user',
          content: `I've uploaded a PDF document named "VIDraft K-AI.pdf" (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB). 
          This appears to be a document about AI systems. Please analyze what you can understand about this document.
          
          Note: The PDF might be in image format or contain complex layouts.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    };
    
    const response1 = await fetch(FRIENDLI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request1)
    });
    
    const result1 = await response1.json();
    console.log('\n📤 Yuri Response (Test 1):');
    console.log(result1.choices?.[0]?.message?.content || 'No response');
    
    // Test 2: Try multimodal approach (if supported)
    console.log('\n🔄 Test 2: Testing multimodal capabilities...');
    
    const request2 = {
      model: FRIENDLI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are jetXA, an AI with multimodal capabilities. Analyze documents and provide detailed insights.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this PDF document and tell me what it contains.'
            },
            {
              type: 'document_url',
              document_url: {
                url: `data:application/pdf;base64,${pdfBase64.substring(0, 1000)}...` // Truncated for test
              }
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    };
    
    const response2 = await fetch(FRIENDLI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request2)
    });
    
    const result2 = await response2.json();
    console.log('\n📤 Yuri Response (Test 2 - Multimodal):');
    if (result2.error) {
      console.log('⚠️ Error:', result2.error);
    } else {
      console.log(result2.choices?.[0]?.message?.content || 'No response');
    }
    
    // Test 3: Send with web search context
    console.log('\n🔄 Test 3: Testing with web search context...');
    
    const request3 = {
      model: FRIENDLI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are jetXA, an AI assistant with access to web search and document analysis.
          A user has uploaded a PDF document. Help them understand its contents.`
        },
        {
          role: 'user',
          content: `I have a PDF document "VIDraft K-AI.pdf" about AI systems and Korean AI development.
          The document appears to discuss AI strategies and implementations.
          Can you provide insights about what this document might contain based on the title and context?`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    };
    
    const response3 = await fetch(FRIENDLI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request3)
    });
    
    const result3 = await response3.json();
    console.log('\n📤 Yuri Response (Test 3 - Context):');
    console.log(result3.choices?.[0]?.message?.content || 'No response');
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testPDFWithYuri();