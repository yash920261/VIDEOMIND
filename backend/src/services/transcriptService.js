/**
 * Transcript Service — Fetches YouTube video transcripts
 * 
 * Uses multiple strategies to reliably fetch transcripts from cloud servers:
 * 1. InnerTube API with consent cookies
 * 2. Watch page scrape with consent cookies
 * 3. youtube-transcript library (original fallback)
 */
const { YoutubeTranscript } = require('youtube-transcript');

// Consent cookie to bypass YouTube's cookie consent wall (common on server IPs)
const CONSENT_COOKIE = 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AxGgJlbiACGgYIgJnOqQY; CONSENT=PENDING+987';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Fetch transcript using YouTube's InnerTube API with WEB client
 */
async function fetchTranscriptViaInnertube(videoId) {
  const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

  const playerResponse = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': BROWSER_UA,
        'Origin': 'https://www.youtube.com',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`,
        'Cookie': CONSENT_COOKIE,
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20250721.00.00",
            hl: "en",
            gl: "US",
          },
        },
      }),
    }
  );

  const responseText = await playerResponse.text();

  console.log("Status:", playerResponse.status);
  console.log(responseText);


  if (!playerResponse.ok) {
    throw new Error(`InnerTube player request failed: ${playerResponse.status}`);
  }

  const playerData = await playerResponse.json();

  console.log("========== PLAYER DATA ==========");
  console.log("Playability:", playerData.playabilityStatus);
  console.log("Captions:", JSON.stringify(playerData.captions, null, 2));
  console.log("Video Details:", playerData.videoDetails?.title);
  console.log("Streaming:", !!playerData.streamingData);
  console.log("=================================");

  // Check for playability errors
  if (playerData?.playabilityStatus?.status === 'ERROR') {
    throw new Error(`Video error: ${playerData.playabilityStatus.reason}`);
  }

  return extractCaptionsFromPlayerData(playerData);
}

/**
 * Fetch transcript via the watch page HTML (extracts embedded player response)
 */
async function fetchTranscriptViaWatchPage(videoId) {
  const watchResponse = await fetch(
    `https://www.youtube.com/watch?v=${videoId}&hl=en&has_verified=1`,
    {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': CONSENT_COOKIE,
        'Accept': 'text/html,application/xhtml+xml',
      },
    }
  );

  if (!watchResponse.ok) {
    throw new Error(`Watch page request failed: ${watchResponse.status}`);
  }

  const html = await watchResponse.text();
  console.log(html.substring(0, 1500));

  // Try multiple patterns to extract the player response
  const patterns = [
    /var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var|<\/script)/s,
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s,
    /"playerResponse":"(.*?)(?:","|"})/s,
  ];

  let playerData = null;
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        let jsonStr = match[1];
        // Handle escaped JSON (from playerResponse field)
        if (jsonStr.includes('\\"')) {
          jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        playerData = JSON.parse(jsonStr);
        break;
      } catch (e) {
        continue;
      }
    }
  }

  if (!playerData) {
    throw new Error('Could not extract player response from watch page');
  }

  return extractCaptionsFromPlayerData(playerData);
}

/**
 * Fetch transcript via the embed page (less restricted by YouTube)
 */
async function fetchTranscriptViaEmbed(videoId) {
  const embedResponse = await fetch(
    `https://www.youtube.com/embed/${videoId}`,
    {
      headers: {
        'User-Agent': BROWSER_UA,
        'Cookie': CONSENT_COOKIE,
      },
    }
  );

  if (!embedResponse.ok) {
    throw new Error(`Embed page request failed: ${embedResponse.status}`);
  }

  const html = await embedResponse.text();

  // Extract player config from embed page
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s)
    || html.match(/"captions":\s*(\{.+?\})\s*,\s*"videoDetails"/s);

  if (!match) {
    throw new Error('Could not extract player response from embed page');
  }

  try {
    const playerData = JSON.parse(match[1]);
    return extractCaptionsFromPlayerData(playerData);
  } catch (e) {
    throw new Error('Failed to parse embed player response');
  }
}

/**
 * Extract caption segments from a YouTube player response object
 */
async function extractCaptionsFromPlayerData(playerData) {
  const captions = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!captions || captions.length === 0) {
    throw new Error('No captions available for this video');
  }

  // Prefer manual English > auto-generated English > any English > first track
  const track =
    captions.find(t => t.languageCode === 'en' && t.kind !== 'asr') ||
    captions.find(t => t.languageCode === 'en') ||
    captions.find(t => t.languageCode?.startsWith('en')) ||
    captions[0];

  console.log(`  📝 Using caption track: ${track.name?.simpleText || track.languageCode} (${track.kind || 'manual'})`);

  // Fetch the actual transcript in JSON format
  const separator = track.baseUrl.includes('?') ? '&' : '?';
  const captionUrl = `${track.baseUrl}${separator}fmt=json3`;
  const captionResponse = await fetch(captionUrl, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Cookie': CONSENT_COOKIE,
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

  if (segments.length === 0) {
    throw new Error('Parsed transcript has no valid segments');
  }

  return segments;
}

/**
 * Main transcript fetcher with fallback chain:
 * 1. InnerTube API with consent cookies
 * 2. Watch page scrape
 * 3. Embed page scrape  
 * 4. youtube-transcript library
 */
async function fetchTranscript(videoId) {
  const methods = [
    { name: 'InnerTube API', fn: () => fetchTranscriptViaInnertube(videoId) },
    { name: 'Watch page', fn: () => fetchTranscriptViaWatchPage(videoId) },
    { name: 'Embed page', fn: () => fetchTranscriptViaEmbed(videoId) },
    {
      name: 'youtube-transcript lib',
      fn: async () => {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        if (!transcript || transcript.length === 0) throw new Error('No transcript');
        return transcript.map(seg => ({
          text: seg.text?.replace(/\n/g, ' ').trim() || '',
          start: seg.offset / 1000 || 0,
          duration: seg.duration / 1000 || 0,
        })).filter(s => s.text.length > 0);
      },
    },
  ];

  let lastError;
  for (const method of methods) {
    try {
      console.log(`  → Trying ${method.name}...`);
      const segments = await method.fn();
      if (segments && segments.length > 0) {
        console.log(`  ✅ ${method.name}: Got ${segments.length} segments`);
        return segments;
      }
    } catch (err) {
      console.warn(`  ⚠️ ${method.name} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(
    `Failed to extract transcript after trying all methods. ` +
    `This video may not have captions available. Last error: ${lastError?.message}`
  );
}

function mergeTranscriptSegments(segments) {
  return segments.map(s => s.text).join(' ');
}

module.exports = { fetchTranscript, mergeTranscriptSegments };
