import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Antigravity from '../components/particles/Antigravity';
import {
  MessageSquare, FileText, BookOpen, BrainCircuit,
  Search, GitCompare, ArrowRight, Play, Zap, Sparkles
} from 'lucide-react';

/* ============================================
   Framer Motion Variants
   ============================================ */
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const slideInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ============================================
   Data
   ============================================ */
const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat',
    text: 'Ask natural language questions about any video. Get instant, context-aware answers with timestamp citations.',
  },
  {
    icon: FileText,
    title: 'Smart Summary',
    text: 'Generate concise summaries in multiple formats — short, detailed, or bullet points. Understand hours in seconds.',
  },
  {
    icon: BookOpen,
    title: 'Notes Generator',
    text: 'Auto-generate structured study notes with headings, key concepts, and organized sections ready for revision.',
  },
  {
    icon: BrainCircuit,
    title: 'Quiz Builder',
    text: 'Create MCQ quizzes from video content to test your understanding. Get instant scoring and explanations.',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    text: 'Search across your video library using natural language. Find concepts buried in hours of content.',
  },
  {
    icon: GitCompare,
    title: 'Multi-Video Compare',
    text: 'Compare concepts across multiple videos. Build a cross-video knowledge base from playlists.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Paste a YouTube URL',
    text: 'Submit any YouTube video link. We extract the transcript and process it automatically.',
  },
  {
    number: '02',
    title: 'AI Builds Knowledge Base',
    text: 'Transcripts are chunked, embedded, and stored as searchable vectors using Gemini AI.',
  },
  {
    number: '03',
    title: 'Ask Anything',
    text: 'Chat with your video, generate notes, create quizzes, or search across your entire library.',
  },
];

/* ============================================
   Component
   ============================================ */
export default function Landing() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    navigate(`/dashboard?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div>
      {/* ============ Hero Section — 50/50 split ============ */}
      <section className="landing-hero">
        <Antigravity count={180} />
        <div className="container">
          {/* Left: Text block */}
          <motion.div
            className="landing-hero-content"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.p
              className="text-eyebrow landing-hero-eyebrow"
              variants={fadeInUp}
            >
              Stop Watching. Start Understanding.
            </motion.p>

            <motion.h1
              className="text-hero landing-hero-headline"
              variants={fadeInUp}
            >
              Unlock Video<br />Intelligence.
            </motion.h1>

            <motion.p
              className="text-body landing-hero-body"
              variants={fadeInUp}
            >
              Transform any YouTube video into an interactive AI knowledge base.
              Ask questions, generate notes, create quizzes — all powered by
              RAG and semantic search.
            </motion.p>

            <motion.div className="landing-hero-actions" variants={fadeInUp}>
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={() => document.getElementById('url-input')?.focus()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Play size={16} />
                Get Started Free
              </motion.button>
              <motion.button
                className="btn btn-secondary btn-lg"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ borderColor: 'rgba(255,255,255,0.25)' }}
                transition={{ duration: 0.2 }}
              >
                How It Works
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          </motion.div>


        </div>
      </section>

      {/* ============ URL Input Section ============ */}
      <section className="url-input-section section" id="try-it">
        <div className="container">
          <motion.div
            className="url-input-container"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={scaleIn}
          >
            <h2 className="text-heading url-input-title">Try It Now</h2>
            <p className="text-body url-input-subtitle">
              Paste a YouTube URL and watch the magic happen
            </p>
            <form onSubmit={handleSubmit} className="url-input-wrapper">
              <input
                id="url-input"
                type="url"
                className="input input-lg"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ paddingRight: '140px' }}
              />
              <motion.button
                type="submit"
                className="btn btn-primary input-btn"
                disabled={loading || !url.trim()}
                style={{ position: 'absolute', right: '6px', top: '50%', translateY: '-50%' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Zap size={14} />
                    Analyze
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ============ How It Works ============ */}
      <section className="how-it-works section" id="how-it-works">
        <div className="container">
          <motion.div
            className="features-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.p className="text-eyebrow" variants={fadeInUp}>Simple & Powerful</motion.p>
            <motion.h2 className="text-heading" variants={fadeInUp}>How It Works</motion.h2>
            <motion.p className="text-body" variants={fadeInUp}>Three steps from URL to AI-powered insights</motion.p>
          </motion.div>

          <motion.div
            className="steps-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                className="step-item"
                variants={fadeInUp}
                custom={idx}
              >
                <motion.div
                  className="step-number"
                  whileHover={{ borderColor: 'rgba(128, 82, 255, 0.4)' }}
                  transition={{ duration: 0.3 }}
                >
                  {step.number}
                </motion.div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-text">{step.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ Features Grid ============ */}
      <section className="features-section section" id="features">
        <div className="container">
          <motion.div
            className="features-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.p className="text-eyebrow" variants={fadeInUp}>Packed with Features</motion.p>
            <motion.h2 className="text-heading" variants={fadeInUp}>Everything You Need</motion.h2>
            <motion.p className="text-body" variants={fadeInUp}>
              From Q&A to quizzes, VideoMind transforms how you consume video content
            </motion.p>
          </motion.div>

          <motion.div
            className="features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                className="feature-card"
                variants={fadeInUp}
                custom={idx}
                whileHover={{
                  borderColor: 'rgba(255,255,255,0.15)',
                  backgroundColor: '#161616',
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="feature-card-icon">
                  <feature.icon size={22} />
                </div>
                <h3 className="feature-card-title">{feature.title}</h3>
                <p className="feature-card-text">{feature.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ CTA Section ============ */}
      <section className="cta-section section">
        <div className="container">
          <motion.div
            className="cta-content"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
          >
            <motion.p className="text-eyebrow" variants={fadeInUp}>
              Ready to Transform Your Learning?
            </motion.p>
            <motion.h2 className="text-display" variants={fadeInUp}>
              Your videos have the answers.<br />
              Ask VideoMind to find them.
            </motion.h2>
            <motion.p className="text-body" variants={fadeInUp}>
              Join thousands of students, developers, and researchers who use
              VideoMind AI to unlock knowledge from YouTube.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/dashboard')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Sparkles size={16} />
                Start For Free
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="stats-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
          >
            {[
              { value: '< 5s', label: 'Response Time' },
              { value: '90%+', label: 'Accuracy' },
              { value: '1000+', label: 'Videos Supported' },
              { value: '∞', label: 'Questions' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                className="stat-item"
                variants={fadeInUp}
                custom={idx}
              >
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
