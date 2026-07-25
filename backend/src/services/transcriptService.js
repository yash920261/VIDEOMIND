/**
 * Transcript Service — Fetches YouTube video transcripts
 * 
 * Uses YouTube's InnerTube API (same API used by YouTube's own apps)
 * which works reliably from cloud server IPs unlike web scraping.
 * Falls back to the youtube-transcript library as a secondary option.
 */
const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Fetch transcript using YouTube's InnerTube API
 * This mimics the Android YouTube client to avoid cloud IP blocks
 */
async function fetchTranscriptViaInnertube(videoId) {
  // Step 1: Get video page to extract caption tracks
  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.02.39',
            androidSdkVersion: 34,
            hl: 'en',
            gl: 'US',
          },
        },
      }),
    }
  );

  if (!playerResponse.ok) {
    throw new Error(`InnerTube player request failed: ${playerResponse.status}`);
  }

  const playerData = await playerResponse.json();

  // Extract caption tracks
  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error('No captions available for this video');
  }

  // Prefer English, fall back to first available track
  const track =
    captions.find(t => t.languageCode === 'en') ||
    captions.find(t => t.languageCode?.startsWith('en')) ||
    captions[0];

  // Step 2: Fetch the actual transcript using the caption track URL
  // Append fmt=json3 to get JSON format
  const captionUrl = `${track.baseUrl}&fmt=json3`;
  const captionResponse = await fetch(captionUrl, {
    headers: {
      'User-Agent': 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip',
    },
  });

  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch caption track: ${captionResponse.status}`);
  }

  const captionData = await captionResponse.json();

  if (!captionData.events || captionData.events.length === 0) {
    throw new Error('Caption track is empty');
  }

  // Parse the json3 format into segments
  const segments = captionData.events
    .filter(event => event.segs && event.segs.length > 0)
    .map(event => ({
      text: event.segs.map(seg => seg.utf8 || '').join('').replace(/\n/g, ' ').trim(),
      start: (event.tStartMs || 0) / 1000,
      duration: (event.dDurationMs || 0) / 1000,
    }))
    .filter(s => s.text.length > 0);

  return segments;
}

/**
 * Main transcript fetcher with fallback chain:
 * 1. InnerTube API (works from cloud IPs)
 * 2. youtube-transcript library (web scraping fallback)
 */
async function fetchTranscript(videoId) {
  // Try InnerTube first (most reliable from cloud servers)
  try {
    console.log(`  → Trying InnerTube API...`);
    const segments = await fetchTranscriptViaInnertube(videoId);
    if (segments && segments.length > 0) {
      console.log(`  ✅ InnerTube: Got ${segments.length} segments`);
      return segments;
    }
  } catch (innertubeError) {
    console.warn(`  ⚠️ InnerTube failed: ${innertubeError.message}`);
  }

  // Fallback to youtube-transcript library
  try {
    console.log(`  → Trying youtube-transcript library...`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      throw new Error('No transcript available');
    }

    const segments = transcript.map(segment => ({
      text: segment.text?.replace(/\n/g, ' ').trim() || '',
      start: segment.offset / 1000 || 0,
      duration: segment.duration / 1000 || 0,
    })).filter(s => s.text.length > 0);

    console.log(`  ✅ youtube-transcript: Got ${segments.length} segments`);
    return segments;
  } catch (fallbackError) {
    console.error(`  ❌ All methods failed. Last error: ${fallbackError.message}`);
    throw new Error(
      `Failed to extract transcript. This video may not have captions available. ` +
      `(InnerTube and web scraping both failed)`
    );
  }
}

function mergeTranscriptSegments(segments) {
  return segments.map(s => s.text).join(' ');
}

module.exports = { fetchTranscript, mergeTranscriptSegments };
