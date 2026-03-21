import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Play, Pause, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  audioBase64?: string;
  imageUrl?: string;
}

export function ChatBubble({ message, isLatest }: { message: Message; isLatest?: boolean }) {
  const isUser = message.role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (message.audioBase64) {
      const audioUrl = `data:audio/mp3;base64,${message.audioBase64}`;
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [message.audioBase64]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <motion.div
      initial={isLatest ? { opacity: 0, y: 15, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-400 p-0.5 shadow-lg shadow-primary/20">
            <img 
              src={`${import.meta.env.BASE_URL}images/bolbot-avatar.png`} 
              alt="BolBot" 
              className="w-full h-full object-cover rounded-full bg-black"
            />
          </div>
        </div>
      )}

      <div className={cn(
        "max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-md",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-sm" 
          : "bg-secondary text-secondary-foreground border border-white/5 rounded-tl-sm"
      )}>
        {message.imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden bg-black/20">
            <img src={message.imageUrl} alt="Uploaded" className="max-h-48 w-auto object-cover" />
          </div>
        )}

        {message.content && (
          <div className={cn(
            "prose prose-sm max-w-none leading-relaxed",
            isUser ? "prose-invert prose-p:text-white prose-strong:text-white" : "prose-invert prose-p:text-gray-200 prose-strong:text-white"
          )}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.audioBase64 && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white hover:scale-105 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95"
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-black/20 rounded-full overflow-hidden relative">
                {isPlaying && (
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-primary w-full origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: audioRef.current?.duration || 2, ease: "linear" }}
                  />
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Voice Note</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
