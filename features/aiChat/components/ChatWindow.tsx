
import React, { memo, useState, useMemo } from 'react';
import Markdown from 'react-markdown';
import { User, Flame, Brain, ExternalLink, Sparkles, Cpu, Zap, Box, Globe, Timer, Copy, Check, TerminalSquare, ChevronDown, Wind, CornerDownLeft, Bot, Terminal } from 'lucide-react';
import { type ChatMessage } from '../../../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'hanisah' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// Helper: Provider Icon
const ProviderIcon = ({ provider }: { provider?: string }) => {
    const p = provider?.toUpperCase();
    if (p?.includes('GEMINI')) return <Sparkles size={12} className="text-blue-500" />;
    if (p?.includes('GROQ')) return <Zap size={12} className="text-orange-500" />;
    if (p?.includes('OPENAI')) return <Cpu size={12} className="text-green-500" />;
    if (p?.includes('DEEPSEEK')) return <Brain size={12} className="text-purple-500" />;
    if (p?.includes('OPENROUTER')) return <Globe size={12} className="text-pink-500" />;
    if (p?.includes('MISTRAL')) return <Wind size={12} className="text-yellow-500" />;
    return <Box size={12} className="text-neutral-400" />;
};

// Reasoning Block Component - Terminal Style
const ThoughtBlock = ({ content, isActive }: { content: string, isActive?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(isActive);
    const lines = content.split('\n').length;
    
    return (
        <div className={`mb-6 rounded-xl overflow-hidden border transition-colors duration-300 group w-full max-w-full shadow-sm ${isActive ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-[#0c0c0e]'}`}>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-100/50 dark:bg-white/[0.02] hover:bg-zinc-200/50 dark:hover:bg-white/[0.05] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <TerminalSquare size={14} className={isActive ? 'animate-pulse' : ''} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-indigo-400' : 'text-neutral-600 dark:text-neutral-400'}`}>
                            {isActive ? 'REASONING_ENGINE_ACTIVE...' : 'COGNITIVE_PROCESS'}
                        </span>
                        <span className="text-[8px] font-mono text-neutral-400">
                            {lines} lines of logic
                        </span>
                    </div>
                </div>
                <div className="text-neutral-400 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <ChevronDown size={14} />
                </div>
            </button>
            
            {isExpanded && (
                <div className="p-5 text-[11px] font-mono leading-relaxed text-neutral-600 dark:text-neutral-300 border-t border-black/5 dark:border-white/5 animate-slide-down bg-white/50 dark:bg-black/20 overflow-x-auto relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                    <div className="whitespace-pre-wrap min-w-0">{content}</div>
                    {isActive && <div className="mt-2 h-1.5 w-1.5 bg-indigo-500 rounded-full animate-pulse"></div>}
                </div>
            )}
        </div>
    );
};

// Custom Code Block Component
const CodeBlock = ({ language, children }: { language: string, children: React.ReactNode }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        if (typeof children === 'string' || Array.isArray(children)) {
            // Simplified copy for demo, usually children is string in markdown code block
            const text = String(children).replace(/\n$/, '');
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="relative group/code my-6 rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#09090b] shadow-lg">
            {/* Code Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 backdrop-blur-md z-20">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                    <Terminal size={12} /> {language || 'TEXT'}
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all text-[9px] font-bold uppercase tracking-wider"
                >
                    {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                    {copied ? 'COPIED' : 'COPY'}
                </button>
            </div>
            
            <div className="p-5 pt-12 overflow-x-auto relative z-10 custom-scroll w-full">
                <code className={`language-${language} block text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre min-w-max`}>
                    {children}
                </code>
            </div>
        </div>
    );
};

const MessageBubble = memo(({ msg, personaMode, isLoading }: { msg: ChatMessage, personaMode: 'hanisah' | 'stoic', isLoading: boolean }) => {
    const [copied, setCopied] = useState(false);
    const isModel = msg.role === 'model';
    const hasText = msg.text && msg.text.trim().length > 0;
    
    const { thought, content } = useMemo(() => {
        if (!hasText) return { thought: null, content: '' };
        
        // Handle unclosed <think> tag for streaming
        if (msg.text.includes('<think>')) {
            const parts = msg.text.split('</think>');
            if (parts.length > 1) {
                return { 
                    thought: parts[0].replace('<think>', '').trim(), 
                    content: parts[1].trim() 
                };
            } else {
                return { 
                    thought: msg.text.replace('<think>', '').trim(), 
                    content: '' 
                };
            }
        }
        return { thought: null, content: msg.text };
    }, [msg.text, hasText]);

    if (isModel && !hasText && !isLoading && !thought) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex w-full mb-8 ${isModel ? 'justify-start' : 'justify-end'} animate-fade-in group px-2 md:px-0`}>
            
            {/* Avatar for AI */}
            {isModel && (
                <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-4 mt-1 shadow-sm border border-black/5 dark:border-white/10
                    ${personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'}
                `}>
                    {personaMode === 'hanisah' ? <Flame size={18} fill="currentColor" /> : <Brain size={18} fill="currentColor" />}
                </div>
            )}

            <div className={`relative max-w-[95%] md:max-w-[85%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                
                {/* Meta Header (AI Only) */}
                {isModel && (
                    <div className="flex items-center gap-2 mb-2 px-1 opacity-60">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                            {personaMode === 'hanisah' ? 'HANISAH' : 'STOIC'} // SYSTEM
                        </span>
                        {msg.metadata?.model && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                <ProviderIcon provider={msg.metadata?.provider} />
                                <span className="text-[8px] font-bold text-neutral-500 uppercase">{msg.metadata.model}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble Body */}
                <div className={`
                    relative rounded-[28px] px-6 py-5 shadow-sm overflow-hidden transition-all max-w-full
                    ${isModel 
                        ? 'bg-white dark:bg-[#0f0f11] text-black dark:text-neutral-200 border border-black/5 dark:border-white/10 rounded-tl-none shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]' 
                        : 'bg-black dark:bg-white text-white dark:text-black rounded-tr-none shadow-[0_10px_30px_-10px_rgba(var(--accent-rgb),0.2)] border border-transparent'
                    }
                `}>
                    {(hasText || isLoading) && (
                        <>
                            {thought && <ThoughtBlock content={thought} isActive={isLoading && !content} />}

                            {content ? (
                                <div className={`prose dark:prose-invert prose-sm max-w-none break-words leading-7 min-w-0 font-sans
                                    ${isModel 
                                        ? 'prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-code:text-[13px] prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:border-none' 
                                        : 'prose-p:text-white/90 dark:prose-p:text-black/90 prose-strong:text-white dark:prose-strong:text-black prose-code:bg-white/20 prose-code:dark:bg-black/10'
                                    }
                                `}>
                                    <Markdown
                                        components={{
                                            code({node, inline, className, children, ...props}: any) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                return !inline ? (
                                                    <CodeBlock language={match ? match[1] : 'text'}>
                                                        {children}
                                                    </CodeBlock>
                                                ) : (
                                                    <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[12px] font-mono font-bold text-inherit break-all border border-black/5 dark:border-white/10" {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {content}
                                    </Markdown>
                                </div>
                            ) : isLoading && !thought && (
                                <div className="flex items-center gap-3 py-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-[bounce_1s_infinite_-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-[bounce_1s_infinite_-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-[bounce_1s_infinite]"></div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 animate-pulse">
                                        PROCESSING...
                                    </span>
                                </div>
                            )}

                            {/* Action Footer (AI Only) */}
                            {isModel && content && (
                                <div className="flex justify-end mt-6 pt-4 border-t border-black/5 dark:border-white/5 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-400 hover:text-black dark:hover:text-white transition-colors bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-lg"
                                        title="Copy Response"
                                    >
                                        {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                                        {copied ? 'COPIED' : 'COPY'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Grounding Chips (Bottom) */}
                {isModel && hasText && msg.metadata?.groundingChunks && msg.metadata.groundingChunks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 w-full animate-slide-up pl-1">
                        {msg.metadata.groundingChunks.map((chunk, cIdx) => {
                            const url = chunk.web?.uri || chunk.maps?.uri;
                            const title = chunk.web?.title || chunk.maps?.title || "Source Reference";
                            if (!url) return null;
                            return (
                                <a 
                                    key={cIdx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#1a1a1c] rounded-lg border border-black/5 dark:border-white/5 text-[9px] font-bold uppercase tracking-wider text-neutral-500 hover:text-accent hover:border-accent/30 transition-all shadow-sm max-w-[240px] truncate"
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
    return prev.msg.text === next.msg.text && 
           prev.isLoading === next.isLoading && 
           prev.msg.metadata?.model === next.msg.metadata?.model &&
           prev.msg.metadata?.latency === next.msg.metadata?.latency;
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({
  messages,
  personaMode,
  isLoading,
  messagesEndRef
}) => {
  return (
    <div className="w-full py-6 pb-12">
        {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                msg={msg} 
                personaMode={personaMode} 
                isLoading={isLoading && msg.role === 'model' && msg === messages[messages.length - 1]} 
            />
        ))}
        
        {/* Connection Indicator when start new generation */}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start mb-8 pl-14 animate-fade-in">
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-black/5 dark:border-white/5 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        ESTABLISHING_UPLINK...
                    </span>
                </div>
            </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
    </div>
  );
});
