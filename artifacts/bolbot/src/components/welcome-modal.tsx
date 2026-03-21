import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-card w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 overflow-hidden relative"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-orange-400 p-1 mb-6 shadow-xl shadow-primary/20 relative">
                  <img 
                    src={`${import.meta.env.BASE_URL}images/bolbot-avatar.png`} 
                    alt="BolBot" 
                    className="w-full h-full object-cover rounded-full bg-black"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-white text-black p-1.5 rounded-full shadow-lg">
                    <Sparkles size={16} className="text-yellow-500" />
                  </div>
                </div>

                <h2 className="text-3xl font-display font-bold text-white mb-2">Namaste! 👋</h2>
                <p className="text-lg font-medium text-primary mb-4">Meet BolBot, your AI Tutor</p>
                
                <div className="space-y-3 text-muted-foreground mb-8 text-left w-full bg-secondary/50 p-4 rounded-2xl border border-white/5">
                  <p className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">🎤</span> 
                    <span>Send voice notes in Hindi or English</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">📸</span> 
                    <span>Upload photos for step-by-step explanations</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">🔥</span> 
                    <span>Maintain your daily streak and earn badges</span>
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25"
                >
                  Start Learning <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
