import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (data: { text?: string; audioBase64?: string; imageBase64?: string; mimeType?: string }) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = file.type;
      setImagePreview({ url: result, base64, mimeType });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if ((!text.trim() && !imagePreview) || isLoading) return;
    
    onSendMessage({
      text: text.trim(),
      imageBase64: imagePreview?.base64,
      mimeType: imagePreview?.mimeType,
    });
    
    setText('');
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMicRelease = async () => {
    if (!isRecording) return;
    const audioBase64 = await stopRecording();
    if (audioBase64) {
      onSendMessage({ audioBase64 });
    }
  };

  const handleMicDragOut = () => {
    if (isRecording) {
      cancelRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-background border-t border-border p-3 sm:p-4 pb-safe">
      <div className="max-w-4xl mx-auto">
        <AnimatePresence>
          {imagePreview && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 80, marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="relative w-20 rounded-lg overflow-hidden border border-white/10 shadow-lg"
            >
              <img src={imagePreview.url} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 relative">
          {isRecording ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex items-center justify-between bg-primary/10 border border-primary/20 rounded-3xl px-5 py-3 h-[52px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-primary font-medium tracking-tabular-nums">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground animate-pulse">Release to send, drag away to cancel</span>
            </motion.div>
          ) : (
            <div className="flex-1 bg-secondary rounded-3xl flex items-end min-h-[52px] border border-white/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all shadow-inner">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 text-muted-foreground hover:text-white transition-colors"
                type="button"
                disabled={isLoading}
              >
                <ImageIcon size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask BolBot in Hindi/English..."
                className="flex-1 max-h-32 bg-transparent border-0 focus:ring-0 resize-none py-3.5 px-0 text-white placeholder:text-muted-foreground text-base outline-none hide-scrollbar"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '52px' }}
              />
            </div>
          )}

          <div className="flex-shrink-0 flex items-center h-[52px]">
            {text.trim() || imagePreview ? (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className={cn(
                  "w-[52px] h-[52px] rounded-full flex items-center justify-center text-white transition-all shadow-lg",
                  isLoading 
                    ? "bg-primary/50 cursor-not-allowed" 
                    : "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/25"
                )}
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onMouseUp={handleMicRelease}
                onMouseLeave={handleMicDragOut}
                onTouchStart={startRecording}
                onTouchEnd={handleMicRelease}
                disabled={isLoading}
                className={cn(
                  "w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all",
                  isRecording 
                    ? "bg-red-500 text-white scale-125 shadow-xl shadow-red-500/30" 
                    : "bg-secondary border border-white/5 text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-50"
                )}
              >
                <Mic size={22} className={cn(isRecording && "animate-pulse")} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
