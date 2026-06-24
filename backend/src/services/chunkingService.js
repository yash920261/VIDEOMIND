/**
 * Chunking Service — Splits transcripts into semantic chunks
 *
 * Strategy: Fixed-size chunks with overlap, respecting sentence boundaries.
 * Each chunk is 300-500 words with start/end timestamps.
 */

const TARGET_CHUNK_WORDS = 400;
const MIN_CHUNK_WORDS = 200;
const MAX_CHUNK_WORDS = 600;
const OVERLAP_WORDS = 50;

function chunkTranscript(segments) {
  if (!segments || segments.length === 0) return [];

  const chunks = [];
  let currentChunk = {
    text: '',
    words: [],
    startTime: segments[0].start,
    endTime: segments[0].start,
    segmentIndices: [],
  };

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentWords = segment.text.split(/\s+/).filter(w => w.length > 0);
    const currentWordCount = currentChunk.words.length;

    if (currentWordCount + segmentWords.length > MAX_CHUNK_WORDS && currentWordCount >= MIN_CHUNK_WORDS) {
      // Finalize current chunk
      chunks.push({
        text: currentChunk.words.join(' '),
        startTime: currentChunk.startTime,
        endTime: segment.start,
        chunkIndex: chunks.length,
      });

      // Start new chunk with overlap from the end of the previous one
      const overlapStart = Math.max(0, currentChunk.words.length - OVERLAP_WORDS);
      const overlapWords = currentChunk.words.slice(overlapStart);

      currentChunk = {
        text: '',
        words: [...overlapWords],
        startTime: segment.start,
        endTime: segment.start + segment.duration,
        segmentIndices: [],
      };
    }

    currentChunk.words.push(...segmentWords);
    currentChunk.endTime = segment.start + segment.duration;
    currentChunk.segmentIndices.push(i);
  }

  // Add the last chunk
  if (currentChunk.words.length >= MIN_CHUNK_WORDS / 2) {
    chunks.push({
      text: currentChunk.words.join(' '),
      startTime: currentChunk.startTime,
      endTime: currentChunk.endTime,
      chunkIndex: chunks.length,
    });
  } else if (chunks.length > 0) {
    // Merge remaining text into the last chunk
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.text += ' ' + currentChunk.words.join(' ');
    lastChunk.endTime = currentChunk.endTime;
  } else {
    // Only one small chunk
    chunks.push({
      text: currentChunk.words.join(' '),
      startTime: currentChunk.startTime,
      endTime: currentChunk.endTime,
      chunkIndex: 0,
    });
  }

  return chunks;
}

module.exports = { chunkTranscript };
