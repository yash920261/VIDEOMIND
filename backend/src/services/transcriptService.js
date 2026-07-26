/**
 * Transcript Service — Fetches YouTube video transcripts via Supadata API
 *
 * Replaces the previous InnerTube / scraping / youtube-transcript approach
 * with a single, reliable third-party API call that works from any server IP.
 *
 * API: GET https://api.supadata.ai/v1/youtube/transcript?videoId=<id>
 * Auth: x-api-key header
 *
 * Output format (unchanged for downstream RAG pipeline):
 *   [{ text: String, start: Number (seconds), duration: Number (seconds) }]
 *
 * @module transcriptService
 */

const axios = require('axios');

// ─── Configuration ──────────────────────────────────────────────────────────────

const SUPADATA_BASE_URL = 'https://api.supadata.ai/v1/youtube/transcript';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 1;
const isDev = process.env.NODE_ENV === 'development';

// ─── Custom Errors ──────────────────────────────────────────────────────────────

/**
 * Base error class for transcript-related failures.
 * All custom errors extend this so callers can catch the family with a single check.
 */
class TranscriptError extends Error {
  /**
   * @param {string} message  — Human-readable description
   * @param {string} code     — Machine-readable error code
   * @param {number} [status] — Upstream HTTP status (if applicable)
   */
  constructor(message, code, status) {
    super(message);
    this.name = 'TranscriptError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

class InvalidVideoIdError extends TranscriptError {
  constructor(videoId) {
    super(
      `Invalid or missing YouTube video ID: "${videoId}"`,
      'INVALID_VIDEO_ID',
    );
    this.name = 'InvalidVideoIdError';
  }
}

class TranscriptUnavailableError extends TranscriptError {
  constructor(videoId) {
    super(
      `No transcript available for video "${videoId}". The video may not have captions.`,
      'TRANSCRIPT_UNAVAILABLE',
    );
    this.name = 'TranscriptUnavailableError';
  }
}

class ApiQuotaExceededError extends TranscriptError {
  constructor() {
    super(
      'Supadata API quota exceeded. Please try again later or upgrade your plan.',
      'QUOTA_EXCEEDED',
      429,
    );
    this.name = 'ApiQuotaExceededError';
  }
}

class ApiRateLimitError extends TranscriptError {
  constructor() {
    super(
      'Rate limited by Supadata API. Please wait before retrying.',
      'RATE_LIMITED',
      429,
    );
    this.name = 'ApiRateLimitError';
  }
}

class ApiUnauthorizedError extends TranscriptError {
  constructor() {
    super(
      'Supadata API key is invalid or missing. Check your SUPADATA_API_KEY environment variable.',
      'UNAUTHORIZED',
      401,
    );
    this.name = 'ApiUnauthorizedError';
  }
}

class NetworkTimeoutError extends TranscriptError {
  constructor() {
    super(
      'Request to Supadata API timed out after 15 seconds.',
      'NETWORK_TIMEOUT',
    );
    this.name = 'NetworkTimeoutError';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Validates that a video ID looks like a standard YouTube ID.
 * YouTube video IDs are 11 characters: [A-Za-z0-9_-]
 *
 * @param {string} videoId
 * @returns {boolean}
 */
function isValidVideoId(videoId) {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId);
}

/**
 * Determines whether an axios error represents a transient network failure
 * that is safe to retry (connection reset, DNS failure, socket timeout, etc.).
 *
 * @param {import('axios').AxiosError} error
 * @returns {boolean}
 */
function isTransientNetworkError(error) {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') return true;
  if (!error.response) return true; // No response at all ⇒ network-level failure
  return false;
}

/**
 * Logs a message only in development to avoid leaking sensitive info in production.
 *
 * @param  {...any} args
 */
function devLog(...args) {
  if (isDev) {
    console.log('[TranscriptService]', ...args);
  }
}

/**
 * Converts a single Supadata segment into the pipeline format.
 *
 * Supadata returns:
 *   { text: string, offset: number (ms), duration: number (ms), lang: string }
 *
 * Pipeline expects:
 *   { text: string, start: number (seconds), duration: number (seconds) }
 *
 * @param {object} segment — Raw Supadata segment
 * @returns {object}       — Normalised segment
 */
function normaliseSegment(segment) {
  return {
    text: (segment.text || '').replace(/\n/g, ' ').trim(),
    start: (segment.offset || 0) / 1000,
    duration: (segment.duration || 0) / 1000,
  };
}

// ─── Core API Call ──────────────────────────────────────────────────────────────

/**
 * Performs a single request to the Supadata transcript API.
 *
 * @param {string} videoId — YouTube video ID
 * @param {string} apiKey  — Supadata API key
 * @returns {Promise<object>} Raw API response data
 * @throws {TranscriptError} On any API or network failure
 */
async function callSupadataApi(videoId, apiKey) {
  try {
    const response = await axios.get(SUPADATA_BASE_URL, {
      params: { videoId },
      headers: { 'x-api-key': apiKey },
      timeout: REQUEST_TIMEOUT_MS,
    });

    return response.data;
  } catch (error) {
    // Timeout
    if (error.code === 'ECONNABORTED') {
      throw new NetworkTimeoutError();
    }

    // No response at all — pure network failure
    if (!error.response) {
      throw new TranscriptError(
        `Network error while contacting Supadata API: ${error.message}`,
        'NETWORK_ERROR',
      );
    }

    const { status, data } = error.response;
    const detail = data?.message || data?.error || JSON.stringify(data);

    switch (status) {
      case 401:
      case 403:
        throw new ApiUnauthorizedError();

      case 404:
        throw new TranscriptUnavailableError(videoId);

      case 429:
        // Distinguish quota exhaustion from simple rate limiting via response body
        if (detail && /quota/i.test(detail)) {
          throw new ApiQuotaExceededError();
        }
        throw new ApiRateLimitError();

      default:
        throw new TranscriptError(
          `Supadata API returned HTTP ${status}: ${detail}`,
          'API_ERROR',
          status,
        );
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetches a YouTube video's transcript via the Supadata API and returns it in
 * the normalised segment format expected by the downstream RAG pipeline.
 *
 * Retries once on transient network failures before giving up.
 *
 * @param {string} videoId — 11-character YouTube video ID
 * @returns {Promise<Array<{text: string, start: number, duration: number}>>}
 * @throws {InvalidVideoIdError}        — videoId is malformed or missing
 * @throws {TranscriptUnavailableError} — video has no captions
 * @throws {ApiQuotaExceededError}      — Supadata monthly quota exhausted
 * @throws {ApiRateLimitError}          — Too many requests in short window
 * @throws {ApiUnauthorizedError}       — API key invalid or missing
 * @throws {NetworkTimeoutError}        — Request exceeded 15 s
 * @throws {TranscriptError}            — Any other transcript-related failure
 */
async function fetchTranscript(videoId) {
  // ── Validate input ────────────────────────────────────────────────────────
  if (!isValidVideoId(videoId)) {
    throw new InvalidVideoIdError(videoId);
  }

  // ── Validate API key ─────────────────────────────────────────────────────
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new ApiUnauthorizedError();
  }

  devLog(`Fetching transcript for video: ${videoId}`);

  // ── Request with single retry on transient network failures ───────────────
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        devLog(`Retry attempt ${attempt} for video: ${videoId}`);
      }

      const data = await callSupadataApi(videoId, apiKey);

      // ── Validate response structure ───────────────────────────────────────
      const rawSegments = data?.content;

      if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
        throw new TranscriptUnavailableError(videoId);
      }

      // ── Convert from Supadata format to pipeline format ───────────────────
      const segments = rawSegments
        .map(normaliseSegment)
        .filter((s) => s.text.length > 0);

      if (segments.length === 0) {
        throw new TranscriptUnavailableError(videoId);
      }

      devLog(
        `✅ Got ${segments.length} segments for video: ${videoId}`,
        `(lang: ${data.lang || 'unknown'})`,
      );

      return segments;
    } catch (error) {
      lastError = error;

      // Only retry on transient network issues — not on auth/quota/404 errors
      const isAxiosError = error.isAxiosError || error.code === 'ECONNABORTED';
      if (attempt < MAX_RETRIES && isAxiosError && isTransientNetworkError(error)) {
        devLog(`Transient error, will retry: ${error.message}`);
        continue;
      }

      // Re-throw known TranscriptError subtypes as-is
      if (error instanceof TranscriptError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new TranscriptError(
        `Unexpected error fetching transcript for "${videoId}": ${error.message}`,
        'UNKNOWN_ERROR',
      );
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}

/**
 * Merges an array of transcript segments into a single plain-text string.
 * Used by the RAG pipeline to produce a full-text representation.
 *
 * @param {Array<{text: string}>} segments
 * @returns {string}
 */
function mergeTranscriptSegments(segments) {
  return segments.map((s) => s.text).join(' ');
}

// ─── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  fetchTranscript,
  mergeTranscriptSegments,

  // Export error classes so consumers can instanceof-check specific failures
  TranscriptError,
  InvalidVideoIdError,
  TranscriptUnavailableError,
  ApiQuotaExceededError,
  ApiRateLimitError,
  ApiUnauthorizedError,
  NetworkTimeoutError,
};
