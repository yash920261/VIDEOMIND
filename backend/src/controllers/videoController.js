const Video = require('../models/Video');
const Chunk = require('../models/Chunk');
const { extractVideoId, fetchVideoMetadata } = require('../services/youtubeService');
const { fetchTranscript, mergeTranscriptSegments } = require('../services/transcriptService');
const { chunkTranscript } = require('../services/chunkingService');
const { generateEmbeddings } = require('../services/embeddingService');
const { generateSummary, generateNotes, generateQuiz } = require('../services/aiService');

/**
 * POST /api/videos — Add and process a YouTube video
 */
exports.addVideo = async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }

    // Check if video already exists
    let video = await Video.findOne({ videoId });
    if (video) {
      return res.json({ video, message: 'Video already processed' });
    }

    // Fetch metadata
    const metadata = await fetchVideoMetadata(videoId);

    // Create video record
    video = await Video.create({
      videoId,
      title: metadata.title,
      channel: metadata.channel,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      transcriptStatus: 'processing',
    });

    // Process transcript in background
    processVideo(video).catch(err => {
      console.error(`Background processing failed for ${videoId}:`, err);
    });

    res.status(201).json({ video, message: 'Video is being processed' });
  } catch (error) {
    next(error);
  }
};

/**
 * Background processing pipeline
 */
async function processVideo(video) {
  try {
    // Step 1: Extract transcript
    console.log(`📝 Extracting transcript for: ${video.title}`);
    const segments = await fetchTranscript(video.videoId);

    // Step 2: Chunk transcript
    console.log(`✂️ Chunking transcript into segments...`);
    const chunks = chunkTranscript(segments);
    console.log(`   Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings
    console.log(`🧠 Generating embeddings...`);
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Step 4: Store chunks with embeddings
    console.log(`💾 Storing chunks in database...`);
    const chunkDocs = chunks.map((chunk, i) => ({
      videoId: video._id,
      text: chunk.text,
      embedding: embeddings[i],
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      chunkIndex: chunk.chunkIndex,
    }));

    await Chunk.insertMany(chunkDocs);

    // Step 5: Update video status
    video.transcriptStatus = 'completed';
    video.totalChunks = chunks.length;
    await video.save();

    console.log(`✅ Video processed successfully: ${video.title}`);
  } catch (error) {
    console.error(`❌ Processing failed for ${video.videoId}:`, error);
    require('fs').writeFileSync('process_error.log', error.stack || error.toString());
    video.transcriptStatus = 'failed';
    await video.save();
  }
}

/**
 * GET /api/videos — Get all videos
 */
exports.getVideos = async (req, res, next) => {
  try {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .select('-summary -notes -quiz')
      .lean();

    res.json({ videos });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id — Get single video
 */
exports.getVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).lean();
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.json({ video });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/videos/:id — Delete a video and its chunks
 */
exports.deleteVideo = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Delete all associated chunks
    await Chunk.deleteMany({ videoId: video._id });

    // Delete the video
    await Video.deleteOne({ _id: video._id });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
};
