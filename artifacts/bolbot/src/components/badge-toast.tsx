import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Badge {
  id: string;
  name: string;
  description: string;
}

interface BadgeToastProps {
  badge: Badge | null;
  onClose: () => void;
}

export function BadgeToast({ badge, onClose }: BadgeToastProps) {
  useEffect(() => {
    if (!badge) return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF6B35', '#FFA630', '#FFFFFF']
    });

    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [badge, onClose]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
        >
          <div className="glass-panel rounded-2xl p-1 pr-6 flex items-center gap-4 bg-gradient-to-r from-card to-card border-primary/20">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-primary flex items-center justify-center shadow-inner">
              <Trophy size={24} className="text-white drop-shadow-md" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">New Badge Unlocked!</p>
              <p className="text-sm font-semibold text-white">{badge.name}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
