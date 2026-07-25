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
 * Uses the WEB client context with the public API key
 */
async function fetchTranscriptViaInnertube(videoId) {
  // YouTube's public InnerTube API key (embedded in the web client, not secret)
  const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': 'https://www.youtube.com/',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240620.00.00',
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
  return extractCaptionsFromPlayerData(playerData);
}

/**
 * Fallback: Scrape the watch page to extract the embedded player response
 */
async function fetchTranscriptViaWatchPage(videoId) {
  const watchResponse = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }
  );

  if (!watchResponse.ok) {
    throw new Error(`Watch page request failed: ${watchResponse.status}`);
  }

  const html = await watchResponse.text();

  // Extract ytInitialPlayerResponse from the page
  const match = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!match) {
    throw new Error('Could not extract player response from watch page');
  }

  const playerData = JSON.parse(match[1]);
  return extractCaptionsFromPlayerData(playerData);
}

/**
 * Extract caption segments from a player response object
 */
async function extractCaptionsFromPlayerData(playerData) {
  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error('No captions available for this video');
  }

  // Prefer English, fall back to first available track
  const track =
    captions.find(t => t.languageCode === 'en') ||
    captions.find(t => t.languageCode?.startsWith('en')) ||
    captions[0];

  // Fetch the actual transcript in JSON format
  const captionUrl = `${track.baseUrl}&fmt=json3`;
  const captionResponse = await fetch(captionUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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
 * 1. InnerTube API (most reliable from cloud IPs)
 * 2. Watch page scrape (extracts embedded player response)
 * 3. youtube-transcript library (original web scraping)
 */
async function fetchTranscript(videoId) {
  // Try InnerTube API first
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

  // Try watch page scrape
  try {
    console.log(`  → Trying watch page scrape...`);
    const segments = await fetchTranscriptViaWatchPage(videoId);
    if (segments && segments.length > 0) {
      console.log(`  ✅ Watch page: Got ${segments.length} segments`);
      return segments;
    }
  } catch (watchError) {
    console.warn(`  ⚠️ Watch page failed: ${watchError.message}`);
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
      `Failed to extract transcript. This video may not have captions available.`
    );
  }
}

function mergeTranscriptSegments(segments) {
  return segments.map(s => s.text).join(' ');
}

module.exports = { fetchTranscript, mergeTranscriptSegments };

