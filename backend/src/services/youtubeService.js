/**
 * YouTube Service — Validates URLs and extracts video metadata
 */

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function fetchVideoMetadata(videoId) {
  try {
    // Use YouTube oEmbed API (no API key required)
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video metadata');
    }

    const data = await response.json();

    return {
      title: data.title || 'Untitled Video',
      channel: data.author_name || 'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      // Duration is not available via oEmbed; would need YouTube Data API
      duration: null,
    };
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return {
      title: 'Untitled Video',
      channel: 'Unknown Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration: null,
    };
  }
}

module.exports = { extractVideoId, fetchVideoMetadata };
