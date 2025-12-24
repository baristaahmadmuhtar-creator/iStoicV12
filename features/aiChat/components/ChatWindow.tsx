
import React, { memo, useState } from 'react';
import Markdown from 'react-markdown';
import { User, Flame, Brain, ExternalLink, Sparkles, Cpu, Zap, Box, Globe, Timer, ShieldCheck, Copy, Check, Terminal } from 'lucide-react';
import { type ChatMessage } from '../../../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'melsa' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// Helper: Provider Icon
const ProviderIcon = ({ provider }: { provider?: string }) => {
    const p = provider?.toUpperCase();
    if (p?.includes('GEMINI')) return <Sparkles size={10} className="text-blue-400" />;
    if (p?.includes('GROQ')) return <Zap size={10} className="text-orange-400" />;
    if (p?.includes('OPENAI')) return <Cpu size={10} className="text-green-400" />;
    if (p?.includes('DEEPSEEK')) return <Brain size={10} className="text-purple-400" />;
    if (p?.includes('OPENROUTER')) return <Globe size={10} className="text-pink-400" />;
    if (p?.includes('MISTRAL')) return <Box size={10} className="text-yellow-400" />;
    return <Box size={10} className="text-neutral-400" />;
};

// Optimization: Memoize individual message bubbles
const MessageBubble = memo(({ msg, personaMode, isLoading }: { msg: ChatMessage, personaMode: 'melsa' | 'stoic', isLoading: boolean }) => {
    const [copied, setCopied] = useState(false);
    const isModel = msg.role === 'model';
    const hasText = msg.text && msg.text.trim().length > 0;
    const isWaitingFirstChunk = isLoading && isModel && !hasText;

    if (isModel && !hasText && !isLoading) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex gap-3 md:gap-5 ${!isModel ? 'flex-row-reverse' : ''} animate-fade-in group relative`}>
            {/* Avatar Unit */}
            <div className={`shrink-0 flex flex-col items-center gap-2`}>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm ${
                    isModel 
                    ? (personaMode === 'melsa' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' : 'bg-blue-600/10 text-blue-600 border border-blue-500/20') 
                    : 'bg-black/80 dark:bg-white/90 text-white dark:text-black border border-transparent'
                }`}>
                    {isModel 
                    ? (personaMode === 'melsa' ? <Flame size={16} /> : <Brain size={16} />) 
                    : <User size={16} />
                    }
                </div>
            </div>
            
            <div className={`flex flex-col gap-1 flex-1 min-w-0 max-w-[90%] md:max-w-[85%] ${!isModel ? 'items-end' : 'items-start'}`}>
                {/* Meta Header */}
                <div className={`flex items-center gap-2 px-1 transition-opacity ${!isModel ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 opacity-60 group-hover:opacity-100 transition-opacity">
                        {isModel ? (personaMode === 'melsa' ? 'MELSA' : 'STOIC') : 'YOU'}
                    </span>
                </div>

                {/* Bubble */}
                <div className={`relative w-fit rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden transition-all ${
                    isModel 
                    ? 'bg-white dark:bg-[#121214] border border-black/5 dark:border-white/5 rounded-tl-none hover:border-black/10 dark:hover:border-white/10' 
                    : 'bg-gradient-to-br from-neutral-900 to-black dark:from-white dark:to-neutral-200 text-white dark:text-black border border-transparent rounded-tr-none shadow-lg'
                }`}>
                    {(hasText || isWaitingFirstChunk) && (
                        <>
                            {hasText ? (
                                <div className={`prose dark:prose-invert prose-sm max-w-none break-words leading-relaxed
                                    ${isModel ? 'prose-headings:text-[13px] prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-p:text-[14px] prose-p:font-medium prose-pre:bg-black/5 dark:prose-pre:bg-white/5 prose-pre:border prose-pre:border-black/5 dark:prose-pre:border-white/10' : 'prose-p:text-white dark:prose-p:text-black prose-a:text-white dark:prose-a:text-black'}
                                `}>
                                    <Markdown>{msg.text}</Markdown>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 py-1">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 animate-pulse">
                                        {personaMode === 'melsa' ? 'SYNTHESIZING...' : 'REASONING...'}
                                    </span>
                                </div>
                            )}

                            {/* Copy Action (Model Only) */}
                            {isModel && hasText && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={handleCopy}
                                        className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-all"
                                        title="Copy Message"
                                    >
                                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Metadata (Model Only) */}
                {isModel && (hasText || isLoading) && (
                    <div className="flex flex-wrap items-center gap-2 mt-1 px-1">
                        {/* Provider Chip */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                            <ProviderIcon provider={msg.metadata?.provider} />
                            <span className="text-[8px] font-bold uppercase text-neutral-500 tracking-wide">
                                {msg.metadata?.provider || 'KERNEL'}
                            </span>
                        </div>

                        {/* Model Name */}
                        {msg.metadata?.model && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 opacity-60 hover:opacity-100 transition-opacity">
                                <ShieldCheck size={10} className="text-neutral-500"/>
                                <span className="text-[8px] font-bold uppercase text-neutral-500 tracking-wide">
                                    {msg.metadata.model}
                                </span>
                            </div>
                        )}

                        {/* Latency */}
                        {msg.metadata?.latency && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md opacity-40 hover:opacity-100 transition-opacity ml-auto md:ml-0">
                                <Timer size={10} className="text-neutral-500" />
                                <span className="text-[8px] font-mono text-neutral-500">
                                    {msg.metadata.latency}ms
                                </span>
                            </div>
                        )}
                        
                        {/* Copy Confirmation (Mobile/Backup location) */}
                        {copied && <span className="text-[9px] font-bold text-green-500 ml-2 animate-fade-in">COPIED</span>}
                    </div>
                )}

                {/* Grounding Chunks */}
                {isModel && hasText && msg.metadata?.groundingChunks && msg.metadata.groundingChunks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 w-full">
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
                                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121214] rounded-lg border border-black/5 dark:border-white/5 text-[9px] font-bold uppercase tracking-wider text-neutral-500 hover:text-accent hover:border-accent/30 transition-all shadow-sm max-w-full truncate"
                                >
                                    <ExternalLink size={10} className="shrink-0" /> <span className="truncate">{title}</span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    // Re-render optimization
    return prev.msg.text === next.msg.text && 
           prev.isLoading === next.isLoading && 
           prev.msg.metadata?.model === next.msg.metadata?.model &&
           prev.msg.metadata?.provider === next.msg.metadata?.provider &&
           prev.msg.metadata?.latency === next.msg.metadata?.latency;
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({
  messages,
  personaMode,
  isLoading,
  messagesEndRef
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 w-full py-4">
        {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                msg={msg} 
                personaMode={personaMode} 
                isLoading={isLoading && msg.role === 'model' && msg === messages[messages.length - 1]} 
            />
        ))}
        
        {/* Loading Indicator for Thread Start */}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start pl-2 md:pl-0 animate-fade-in">
                <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">INITIALIZING_RESPONSE...</span>
                </div>
            </div>
        )}

        <div ref={messagesEndRef} className="h-1" />
    </div>
  );
});
