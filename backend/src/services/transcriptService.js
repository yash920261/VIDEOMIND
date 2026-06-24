/**
 * Transcript Service — Fetches YouTube video transcripts
 */
const { YoutubeTranscript } = require('youtube-transcript');

async function fetchTranscript(videoId) {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available for this video');
    }

    // Normalize transcript segments
    const segments = transcript.map(segment => ({
      text: segment.text?.replace(/\n/g, ' ').trim() || '',
      start: segment.offset / 1000 || 0, // Convert ms to seconds
      duration: segment.duration / 1000 || 0,
    })).filter(s => s.text.length > 0);

    return segments;
  } catch (error) {
    console.error('Transcript extraction error:', error);
    throw new Error(`Failed to extract transcript: ${error.message}`);
  }
}

function mergeTranscriptSegments(segments) {
  return segments.map(s => s.text).join(' ');
}

module.exports = { fetchTranscript, mergeTranscriptSegments };
