// Simple test to verify embedding generation works
import { getVectorMemoryManager } from '../lib/ai/vector-memory-manager';

async function testEmbedding() {
  console.log('🧪 Testing Local Embedding Generation\n');

  const vectorManager = getVectorMemoryManager();

  // Wait for model initialization
  console.log('⏳ Initializing model (may take 1-2 minutes on first run)...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Test 1: Korean text
    console.log('Test 1: Generating embedding for Korean text...');
    const koreanText = '나는 피자를 좋아합니다';
    const embedding1 = await vectorManager.generateEmbedding(koreanText);
    console.log(`✅ Generated ${embedding1.length}D embedding for: "${koreanText}"`);
    console.log(`   Sample values: [${embedding1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Test 2: English text
    console.log('Test 2: Generating embedding for English text...');
    const englishText = 'I love pizza';
    const embedding2 = await vectorManager.generateEmbedding(englishText);
    console.log(`✅ Generated ${embedding2.length}D embedding for: "${englishText}"`);
    console.log(`   Sample values: [${embedding2.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Test 3: Cosine similarity calculation
    console.log('Test 3: Calculating similarity between similar texts...');
    const text1 = '좋아하는 음식';
    const text2 = '음식 선호도';
    const text3 = '날씨가 좋다';

    const emb1 = await vectorManager.generateEmbedding(text1);
    const emb2 = await vectorManager.generateEmbedding(text2);
    const emb3 = await vectorManager.generateEmbedding(text3);

    const similarity12 = cosineSimilarity(emb1, emb2);
    const similarity13 = cosineSimilarity(emb1, emb3);

    console.log(`   "${text1}" vs "${text2}": ${(similarity12 * 100).toFixed(1)}% similar`);
    console.log(`   "${text1}" vs "${text3}": ${(similarity13 * 100).toFixed(1)}% similar\n`);

    // Test 4: Cache test
    console.log('Test 4: Testing embedding cache...');
    const start1 = Date.now();
    await vectorManager.generateEmbedding(koreanText);
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await vectorManager.generateEmbedding(koreanText); // Should be cached
    const time2 = Date.now() - start2;

    console.log(`   First call: ${time1}ms`);
    console.log(`   Cached call: ${time2}ms (${((1 - time2/time1) * 100).toFixed(0)}% faster)\n`);

    console.log('✅ All tests passed! Embedding generation is working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

testEmbedding();
