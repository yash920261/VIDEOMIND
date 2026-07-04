import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

const GithubIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

const TwitterIcon = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Footer() {
  return (
    <motion.footer
      className="footer"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={containerVariants}
    >
      <div className="footer-inner">
        <motion.div className="footer-left" variants={itemVariants}>
          © {new Date().getFullYear()} VideoMind AI. All rights reserved.
        </motion.div>
        <motion.div className="footer-links" variants={itemVariants}>
          <a href="#features" className="footer-link">Features</a>
          <a href="#how-it-works" className="footer-link">How It Works</a>
          <a href="mailto:contact@videomind.ai" className="footer-link">Contact</a>
        </motion.div>
        <motion.div className="footer-socials" variants={containerVariants}>
          {[
            { href: 'https://github.com', icon: GithubIcon, label: 'GitHub' },
            { href: 'https://twitter.com', icon: TwitterIcon, label: 'Twitter' },
            { href: 'mailto:contact@videomind.ai', icon: Mail, label: 'Email' },
          ].map((social, idx) => (
            <motion.a
              key={idx}
              href={social.href}
              target={social.href.startsWith('mailto') ? undefined : '_blank'}
              rel={social.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
              className="footer-social"
              aria-label={social.label}
              variants={itemVariants}
              whileHover={{ color: '#8052ff' }}
              transition={{ duration: 0.2 }}
            >
              <social.icon size={18} />
            </motion.a>
          ))}
        </motion.div>
      </div>
    </motion.footer>
  );
}
