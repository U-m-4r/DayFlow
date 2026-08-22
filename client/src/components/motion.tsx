/**
 * Reusable accessible motion primitives — §8.2 Motion System.
 * AnimatedPage, Stagger, SharedElement, Presence + MotionConfig with reduced-motion.
 */
import React from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion as useFMReducedMotion,
} from 'framer-motion';

// ── MotionProvider — wraps the entire app with reduced-motion config ─────────
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduce = useFMReducedMotion();
  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  );
}

// ── AnimatedPage — route transition wrapper ─────────────────────────────────
export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.main>
  );
}

// ── Stagger container + items ───────────────────────────────────────────────
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

// ── Presence wrapper ────────────────────────────────────────────────────────
export const Presence = AnimatePresence;

// ── Re-export motion for layout animations ──────────────────────────────────
export { motion };
