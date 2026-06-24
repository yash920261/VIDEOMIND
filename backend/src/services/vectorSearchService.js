/**
 * Vector Search Service — Performs semantic search using MongoDB Atlas Vector Search
 *
 * Requires a vector search index named "vector_index" on the chunks collection:
 * {
 *   "type": "vectorSearch",
 *   "fields": [{
 *     "type": "vector",
 *     "path": "embedding",
 *     "numDimensions": 768,
 *     "similarity": "cosine"
 *   }, {
 *     "type": "filter",
 *     "path": "videoId"
 *   }]
 * }
 *
 * If Atlas Vector Search is not available, falls back to cosine similarity in-memory.
 */
const Chunk = require('../models/Chunk');
const { generateEmbedding } = require('./embeddingService');

const TOP_K = 5;

async function searchSimilarChunks(queryText, videoId, topK = TOP_K) {
  const queryEmbedding = await generateEmbedding(queryText);

  try {
    // Try MongoDB Atlas Vector Search first
    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          filter: { videoId: videoId },
        },
      },
      {
        $project: {
          text: 1,
          startTime: 1,
          endTime: 1,
          chunkIndex: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    if (results.length > 0) {
      return results;
    }
  } catch (error) {
    console.warn('Atlas Vector Search not available, falling back to in-memory search:', error.message);
  }

  // Fallback: In-memory cosine similarity search
  return await fallbackSearch(queryEmbedding, videoId, topK);
}

async function fallbackSearch(queryEmbedding, videoId, topK) {
  const chunks = await Chunk.find({ videoId }).lean();

  if (chunks.length === 0) return [];

  const scored = chunks.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ text, startTime, endTime, chunkIndex, score }) => ({
    text,
    startTime,
    endTime,
    chunkIndex,
    score,
  }));
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

async function searchAcrossVideos(queryText, videoIds, topK = TOP_K) {
  const queryEmbedding = await generateEmbedding(queryText);
  const allResults = [];

  for (const videoId of videoIds) {
    const results = await fallbackSearch(queryEmbedding, videoId, topK);
    allResults.push(...results.map(r => ({ ...r, videoId })));
  }

  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, topK);
}

module.exports = { searchSimilarChunks, searchAcrossVideos };
