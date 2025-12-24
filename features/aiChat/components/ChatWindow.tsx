
import React, { useEffect, useRef, useState, memo } from 'react';
import Markdown from 'react-markdown';
import { User, Flame, Brain, ExternalLink, ArrowDown, Sparkles, Activity } from 'lucide-react';
import { type ChatMessage } from '../../../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'melsa' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// Optimization: Memoize individual message bubbles to avoid re-rendering the whole list
const MessageBubble = memo(({ msg, personaMode, isLoading }: { msg: ChatMessage, personaMode: 'melsa' | 'stoic', isLoading: boolean }) => {
    const isModel = msg.role === 'model';
    const hasText = msg.text.trim().length > 0;
    const isWaitingFirstChunk = isLoading && isModel && !hasText;

    if (isModel && !hasText && !isLoading) return null;

    return (
        <div className={`flex gap-4 md:gap-6 ${!isModel ? 'flex-row-reverse' : ''} animate-fade-in`}>
            {/* Avatar Unit */}
            <div className={`shrink-0 flex flex-col items-center gap-3`}>
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${
                    isModel 
                    ? (personaMode === 'melsa' ? 'bg-orange-600 shadow-orange-600/20' : 'bg-blue-600 shadow-blue-600/20') 
                    : 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                }`}>
                    {isModel 
                    ? (personaMode === 'melsa' ? <Flame size={20} /> : <Brain size={20} />) 
                    : <User size={20} />
                    }
                </div>
            </div>
            
            <div className={`flex flex-col gap-2 flex-1 min-w-0 ${!isModel ? 'items-end text-right' : 'items-start'}`}>
                {/* Meta Header */}
                <div className="flex items-center gap-3 px-1 opacity-60">
                    <span className="text-[8px] tech-mono font-black uppercase tracking-[0.2em] text-neutral-500">
                        {isModel ? (personaMode === 'melsa' ? 'MELSA_NODE' : 'STOIC_LOGIC') : 'OPERATOR'}
                    </span>
                    <span className="text-[8px] tech-mono text-neutral-400">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Bubble/Card Design */}
                {(hasText || isWaitingFirstChunk) && (
                  <div className={`w-full max-w-[95%] p-5 md:p-7 rounded-[28px] text-sm md:text-[15px] leading-relaxed transition-all relative overflow-hidden ${
                    isModel 
                    ? 'bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-tl-none' 
                    : 'bg-zinc-100 dark:bg-white/10 text-black dark:text-white rounded-tr-none'
                  }`}>
                    {hasText ? (
                      <div className="prose dark:prose-invert prose-sm max-w-none break-words selection:bg-accent/30 selection:text-black font-medium">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 py-1">
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"></span>
                        </div>
                        <span className="text-[9px] tech-mono font-black uppercase tracking-[0.3em] text-neutral-400 animate-pulse">THINKING...</span>
                      </div>
                    )}

                    {isModel && hasText && msg.metadata?.groundingChunks && msg.metadata.groundingChunks.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap gap-2">
                        {msg.metadata.groundingChunks.map((chunk, cIdx) => {
                          const url = chunk.web?.uri || chunk.maps?.uri;
                          const title = chunk.web?.title || chunk.maps?.title || "Resource";
                          if (!url) return null;
                          return (
                            <a 
                              key={cIdx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-black/20 rounded-lg text-[8px] tech-mono font-bold uppercase tracking-wider text-neutral-500 hover:text-accent hover:bg-accent/5 transition-all border border-black/5 dark:border-white/5"
                            >
                              <ExternalLink size={10} /> {title}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    // Only re-render if text or loading state changes essentially
    return prev.msg.text === next.msg.text && prev.isLoading === next.isLoading;
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({
  messages,
  personaMode,
  isLoading,
  messagesEndRef
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAutoScrolling = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 200;
    isAutoScrolling.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  useEffect(() => {
    if (isAutoScrolling.current) {
      requestAnimationFrame(() => scrollToBottom(isLoading ? 'auto' : 'smooth'));
    }
  }, [messages, isLoading]);

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto custom-scroll px-4 md:px-12 lg:px-20 pt-8 pb-48 md:pb-48 lg:pb-52 scroll-smooth overscroll-contain relative"
    >
      <div className="max-w-4xl mx-auto space-y-8 md:space-y-10">
        {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                msg={msg} 
                personaMode={personaMode} 
                isLoading={isLoading && msg.role === 'model' && msg === messages[messages.length - 1]} 
            />
        ))}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {showScrollButton && (
        <button 
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-32 right-6 w-10 h-10 rounded-full bg-white dark:bg-white/10 text-black dark:text-white shadow-lg border border-black/5 flex items-center justify-center animate-bounce z-40 hover:bg-accent hover:text-on-accent transition-colors"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
});
