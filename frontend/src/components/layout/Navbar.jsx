import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, Play, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  const linkVariants = {
    initial: { opacity: 0, y: -8 },
    animate: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] },
    }),
  };

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="navbar-inner">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">
              <svg className="navbar-logo-mark" viewBox="0 0 32 32" fill="none">
                <polygon points="6,4 26,16 6,28" fill="#8052ff" opacity="0.8"/>
                <polygon points="10,8 22,16 10,24" fill="#ffffff" opacity="0.6"/>
                <circle cx="16" cy="16" r="2" fill="#ffb829"/>
              </svg>
            </div>
            VideoMind
          </Link>
        </motion.div>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          {(user
            ? [
                { path: '/', label: 'Home' },
                { path: '/dashboard', label: 'Dashboard' },
              ]
            : [{ path: '/', label: 'Home' }]
          ).map((link, i) => (
            <motion.div
              key={link.path}
              custom={i}
              variants={linkVariants}
              initial="initial"
              animate="animate"
            >
              <Link
                to={link.path}
                className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="navbar-actions"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          {user ? (
            <>
              <span
                style={{
                  fontSize: 'var(--text-body-sm)',
                  color: 'var(--color-smoke)',
                  marginRight: 'var(--spacing-18)',
                  userSelect: 'none',
                }}
              >
                {user.name}
              </span>
              <motion.button
                className="btn btn-secondary btn-sm"
                onClick={logout}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LogOut size={14} />
                Logout
              </motion.button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="navbar-link"
                style={{ marginRight: 'var(--spacing-18)' }}
              >
                Sign In
              </Link>
              <Link to="/signup">
                <motion.button
                  className="btn btn-primary btn-sm"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Play size={14} />
                  Get Started
                </motion.button>
              </Link>
            </>
          )}
          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </motion.div>
      </div>
    </motion.nav>
  );
}
