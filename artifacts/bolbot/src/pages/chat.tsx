import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'wouter';
import { Flame, Star, Trophy, Settings, MoreVertical, Menu } from 'lucide-react';
import { useSendMessage } from '@workspace/api-client-react';
import { ChatBubble, type Message } from '@/components/chat-bubble';
import { ChatInput } from '@/components/chat-input';
import { WelcomeModal } from '@/components/welcome-modal';
import { BadgeToast } from '@/components/badge-toast';
import { formatNumber } from '@/lib/utils';

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [currentBadge, setCurrentBadge] = useState<{ id: string, name: string, description: string } | null>(null);
  const [requestVoice, setRequestVoice] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    // Initialize session
    let sid = localStorage.getItem('bolbot_session_id');
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem('bolbot_session_id', sid);
      setShowWelcome(true);
    }
    setSessionId(sid);
    
    // Load local state
    const savedPoints = localStorage.getItem('bolbot_points');
    const savedStreak = localStorage.getItem('bolbot_streak');
    if (savedPoints) setPoints(parseInt(savedPoints, 10));
    if (savedStreak) setStreak(parseInt(savedStreak, 10));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async ({ text, audioBase64, imageBase64, mimeType }: { text?: string, audioBase64?: string, imageBase64?: string, mimeType?: string }) => {
    // Add optimistic user message
    const userMsgId = uuidv4();
    const newUserMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text || '',
      imageUrl: imageBase64 ? `data:${mimeType};base64,${imageBase64}` : undefined,
    };
    
    setMessages(prev => [...prev, newUserMsg]);

    try {
      const response = await sendMessageMutation.mutateAsync({
        data: {
          sessionId,
          message: text,
          audioData: audioBase64,
          imageData: imageBase64,
          imageMimeType: mimeType,
          requestVoiceResponse: requestVoice
        }
      });

      // Update state from response
      const botMsgId = uuidv4();
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'bot',
        content: response.text,
        audioBase64: response.audioBase64
      }]);

      setPoints(response.totalPoints);
      setStreak(response.streakCount);
      localStorage.setItem('bolbot_points', response.totalPoints.toString());
      localStorage.setItem('bolbot_streak', response.streakCount.toString());

      if (response.newBadges && response.newBadges.length > 0) {
        setCurrentBadge(response.newBadges[0]);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      // Optional: Add an error message bubble
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'bot',
        content: 'Oops! Something went wrong. Please try again.'
      }]);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      <BadgeToast badge={currentBadge} onClose={() => setCurrentBadge(null)} />

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-background border-b border-border z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 p-0.5 shadow-md shadow-primary/10">
            <img src={`${import.meta.env.BASE_URL}images/bolbot-avatar.png`} alt="Logo" className="w-full h-full rounded-[10px] object-cover bg-black" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none">BolBot</h1>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Flame size={16} className="text-orange-500 fill-orange-500" />
            <span className="font-bold text-sm">{streak}</span>
          </div>
          <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-sm">{formatNumber(points)}</span>
          </div>
          
          <Link href="/leaderboard" className="ml-1 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
            <Trophy size={20} />
          </Link>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 relative">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none mix-blend-screen"
        />
        
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto relative z-10">
            <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-white/5">
              <span className="text-4xl">👋</span>
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Ask me anything!</h2>
            <p className="text-muted-foreground mb-8">
              Send a voice note, upload a photo of your homework, or just say hi in Hindi.
            </p>
            
            <div className="flex items-center gap-2 mb-8">
              <input 
                type="checkbox" 
                id="voice-toggle" 
                checked={requestVoice} 
                onChange={(e) => setRequestVoice(e.target.checked)}
                className="rounded text-primary focus:ring-primary bg-secondary border-white/10"
              />
              <label htmlFor="voice-toggle" className="text-sm text-gray-300 select-none cursor-pointer">
                BolBot should reply with voice
              </label>
            </div>
          </div>
        ) : (
          <div className="relative z-10 max-w-4xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <ChatBubble key={msg.id} message={msg} isLatest={idx === messages.length - 1} />
            ))}
            <div ref={messagesEndRef} />
            {sendMessageMutation.isPending && (
              <div className="flex justify-start mb-6 max-w-4xl mx-auto w-full">
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-5 py-4 border border-white/5 flex items-center gap-2 w-24">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={sendMessageMutation.isPending} />
    </div>
  );
}
