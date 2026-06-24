/**
 * Embedding Service — Generates vector embeddings using Gemini
 */
const { ai } = require('../config/gemini');

async function generateEmbedding(text) {
  try {
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
    });
    return result.embeddings[0].values;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

async function generateEmbeddings(texts) {
  // Process in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  const embeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    embeddings.push(...batchResults);

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return embeddings;
}

module.exports = { generateEmbedding, generateEmbeddings };
