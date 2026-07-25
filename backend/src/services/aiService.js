/**
 * AI Service — RAG pipeline for question answering, summary, notes, and quiz generation
 */
const { ai } = require('../config/gemini');
const { searchSimilarChunks } = require('./vectorSearchService');

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * RAG-powered question answering
 */
async function answerQuestion(question, videoId) {
  // Step 1: Retrieve relevant chunks
  const relevantChunks = await searchSimilarChunks(question, videoId, 5);

  if (relevantChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in this video to answer your question.",
      sources: [],
    };
  }

  // Step 2: Build context from retrieved chunks
  const context = relevantChunks
    .map((chunk, i) => `[${formatTimestamp(chunk.startTime)} - ${formatTimestamp(chunk.endTime)}]\n${chunk.text}`)
    .join('\n\n');

  // Step 3: Generate answer with Gemini
  const prompt = `You are a helpful AI assistant that answers questions about YouTube video content. 
Answer the question based ONLY on the provided transcript context. 
If the answer is not found in the context, say so clearly.
Use markdown formatting for your answer.
Be concise but thorough.

CONTEXT FROM VIDEO TRANSCRIPT:
${context}

QUESTION: ${question}

ANSWER:`;

  const result = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt
  });
  const answer = result.text;

  // Step 4: Format sources
  const sources = relevantChunks.map(chunk => ({
    text: chunk.text.substring(0, 100) + '...',
    startTime: chunk.startTime,
    endTime: chunk.endTime,
  }));

  return { answer, sources };
}

/**
 * Generate video summary
 */
async function generateSummary(fullTranscript, videoTitle) {
  const prompt = `You are an AI assistant. Generate a comprehensive summary of this video transcript.

VIDEO TITLE: ${videoTitle}

TRANSCRIPT:
${fullTranscript.substring(0, 15000)}

Generate three formats:
1. SHORT SUMMARY: A concise overview of the video's main topic and key takeaway (100 words max).
2. DETAILED SUMMARY: A thorough summary covering all major points discussed in the video (500 words max).
3. BULLET POINTS: The 10 most important points from the video as bullet points.`;

  try {
    const result = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            short: { type: 'STRING' },
            detailed: { type: 'STRING' },
            bullets: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            }
          },
          required: ['short', 'detailed', 'bullets']
        }
      }
    });

    return JSON.parse(result.text);
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      short: 'Error generating summary.',
      detailed: 'Error generating summary. Please try again.',
      bullets: []
    };
  }
}

/**
 * Generate study notes
 */
async function generateNotes(fullTranscript, videoTitle) {
  const prompt = `You are an expert note-taker. Generate comprehensive, well-structured study notes from this video transcript.

VIDEO TITLE: ${videoTitle}

TRANSCRIPT:
${fullTranscript.substring(0, 15000)}

Create notes in Markdown format with:
- A clear title (# heading)
- Major topic sections (## headings)
- Sub-topics (### headings)
- Key definitions, explanations, and examples as bullet points
- Code snippets if any technical concepts are discussed
- Important terms in **bold**
- A "Key Takeaways" section at the end

Make the notes comprehensive enough to study from without watching the video.`;

  const result = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt
  });
  return result.text;
}

/**
 * Generate quiz (MCQs)
 */
async function generateQuiz(fullTranscript, videoTitle) {
  const prompt = `You are a quiz generator. Create exactly 10 multiple-choice questions from this video transcript.

VIDEO TITLE: ${videoTitle}

TRANSCRIPT:
${fullTranscript.substring(0, 15000)}

Generate 10 MCQs that test understanding of the video content. Each question must have exactly 4 options.`;

  try {
    const result = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING' },
              options: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              },
              correctAnswer: { type: 'INTEGER', description: '0-based index of the correct option' },
              explanation: { type: 'STRING' }
            },
            required: ['question', 'options', 'correctAnswer', 'explanation']
          }
        }
      }
    });

    return JSON.parse(result.text);
  } catch (error) {
    console.error('Failed to generate quiz:', error);
    return [];
  }
}

module.exports = { answerQuestion, generateSummary, generateNotes, generateQuiz };
