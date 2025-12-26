
import React, { memo, useState, useMemo, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Flame, Brain, ExternalLink, Sparkles, Cpu, Zap, Box, Globe, Timer, Copy, Check, TerminalSquare, ChevronDown, Wind, CornerDownLeft, Bot, Terminal, MoreHorizontal, Activity, CircuitBoard, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { type ChatMessage } from '../../../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'hanisah' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// --- REAL-TIME EXECUTION TIMER ---
const ExecutionTimer = () => {
    const [ms, setMs] = useState(0);
    useEffect(() => {
        const start = Date.now();
        const timer = setInterval(() => setMs(Date.now() - start), 100);
        return () => clearInterval(timer);
    }, []);
    return (
        <span className="font-mono text-[10px] text-accent opacity-80 tabular-nums">
            {(ms / 1000).toFixed(1)}s
        </span>
    );
};

// Helper: Provider Icon
const ProviderIcon = ({ provider }: { provider?: string }) => {
    const p = provider?.toUpperCase() || 'UNKNOWN';
    if (p.includes('GEMINI')) return <Sparkles size={10} className="text-blue-500" />;
    if (p.includes('GROQ')) return <Zap size={10} className="text-orange-500" />;
    if (p.includes('OPENAI')) return <Cpu size={10} className="text-green-500" />;
    if (p.includes('DEEPSEEK')) return <Brain size={10} className="text-purple-500" />;
    if (p.includes('OPENROUTER')) return <Globe size={10} className="text-pink-500" />;
    if (p.includes('MISTRAL')) return <Wind size={10} className="text-yellow-500" />;
    return <Box size={10} className="text-neutral-400" />;
};

// Reasoning Block Component - High Tech Terminal Style
const ThoughtBlock = ({ content, isActive }: { content: string, isActive?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(isActive);
    const [userToggled, setUserToggled] = useState(false); // Track manual interaction
    const lines = content.split('\n');
    
    // Auto-expand if active (streaming thought), but ONLY if user hasn't toggled it manually
    useEffect(() => {
        if (isActive && !userToggled) setIsExpanded(true);
    }, [isActive, userToggled]);

    const handleToggle = () => {
        setIsExpanded(prev => !prev);
        setUserToggled(true);
    };
    
    return (
        <div className={`my-3 rounded-lg overflow-hidden border transition-all duration-300 w-full max-w-full group/thought ${isActive ? 'border-purple-500/30 bg-purple-500/5 ring-1 ring-purple-500/10' : 'border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]'}`}>
            <button 
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-3 py-2 transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            >
                <div className="flex items-center gap-2.5">
                    <div className={`p-1 rounded-md ${isActive ? 'bg-purple-500/10 text-purple-400 animate-pulse' : 'bg-black/5 dark:bg-white/10 text-neutral-500'}`}>
                        <CircuitBoard size={12} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none ${isActive ? 'text-purple-400' : 'text-neutral-500'}`}>
                            {isActive ? 'PROCESSING_LOGIC' : 'COGNITIVE_TRACE'}
                        </span>
                        {isActive && (
                            <span className="text-[7px] text-purple-400/70 font-mono mt-0.5 animate-pulse">
                                Deep Reasoning Active...
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[8px] font-mono text-neutral-400 hidden sm:block opacity-0 group-hover/thought:opacity-100 transition-opacity">
                        {lines.length} LINES
                    </span>
                    <ChevronDown size={14} className={`text-neutral-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            
            {isExpanded && (
                <div className="relative border-t border-black/5 dark:border-white/5 bg-zinc-100/50 dark:bg-black/20 animate-slide-down">
                    <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-purple-500/20 to-transparent"></div>
                    <div className="p-3 overflow-x-auto custom-scroll">
                        <pre className="text-[10px] font-mono leading-[1.6] text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap font-medium">
                            {content}
                            {isActive && <span className="inline-block w-1.5 h-3 ml-1 bg-purple-500 animate-pulse align-middle"></span>}
                        </pre>
                    </div>
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
            const text = String(children).replace(/\n$/, '');
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="relative group/code my-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#09090b] shadow-sm ring-1 ring-white/5">
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 ml-2">
                        {language || 'PLAINTEXT'}
                    </span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all text-neutral-500 hover:text-white hover:bg-white/10"
                >
                    {copied ? <Check size={10} className="text-emerald-500"/> : <Copy size={10}/>}
                    {copied ? 'COPIED' : 'COPY'}
                </button>
            </div>
            
            <div className="p-3 md:p-4 overflow-x-auto custom-scroll w-full bg-[#050505]">
                <code className={`language-${language} block text-[11px] md:text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre min-w-max`}>
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
    
    // Parse Thinking Tags <think>...</think>
    const { thought, content } = useMemo(() => {
        if (!msg.text) return { thought: null, content: '' };
        
        // Handle Gemini 2.0 / DeepSeek R1 Thinking Tags
        if (msg.text.includes('<think>')) {
            const parts = msg.text.split('</think>');
            if (parts.length > 1) {
                return { 
                    thought: parts[0].replace('<think>', '').trim(), 
                    content: parts[1].trim() 
                };
            } else {
                // If only think tag exists (streaming partially)
                return { 
                    thought: msg.text.replace('<think>', '').trim(), 
                    content: '' 
                };
            }
        }
        return { thought: null, content: msg.text };
    }, [msg.text]);

    // Don't render empty bubbles if there is no thought and no text and it's not loading
    if (isModel && !hasText && !isLoading && !thought) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'} animate-fade-in group px-1`}>
            
            {/* Avatar for AI */}
            {isModel && (
                <div className="hidden sm:flex flex-col items-center gap-2 mr-3 shrink-0 mt-1">
                    <div className={`
                        w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border border-black/5 dark:border-white/10
                        ${personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'}
                    `}>
                        {personaMode === 'hanisah' ? <Flame size={14} fill="currentColor" /> : <Brain size={14} fill="currentColor" />}
                    </div>
                </div>
            )}

            <div className={`relative max-w-[95%] sm:max-w-[85%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                
                {/* Meta Info (Model Name & Latency) */}
                {isModel && (
                    <div className="flex items-center gap-2 mb-1.5 px-1 opacity-70">
                        {/* Mobile Avatar Replacement */}
                        <div className={`
                            sm:hidden w-4 h-4 rounded-md flex items-center justify-center
                            ${personaMode === 'hanisah' ? 'bg-orange-500/10 text-orange-500' : 'bg-cyan-500/10 text-cyan-500'}
                        `}>
                            {personaMode === 'hanisah' ? <Flame size={8} fill="currentColor" /> : <Brain size={8} fill="currentColor" />}
                        </div>

                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">
                            {personaMode === 'hanisah' ? 'HANISAH_OS' : 'STOIC_KERNEL'}
                        </span>
                        {msg.metadata?.model && (
                            <>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <div className="flex items-center gap-1">
                                    <ProviderIcon provider={msg.metadata?.provider} />
                                    <span className="text-[8px] font-bold text-neutral-500 uppercase truncate max-w-[80px]">{msg.metadata.model}</span>
                                </div>
                            </>
                        )}
                        {msg.metadata?.latency && (
                            <>
                                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                                <span className="text-[8px] font-mono text-neutral-500">{Math.round(msg.metadata.latency)}ms</span>
                            </>
                        )}
                    </div>
                )}

                {/* Bubble Container */}
                <div className={`
                    relative px-4 py-3 md:px-5 md:py-3.5 shadow-sm transition-all overflow-hidden
                    ${isModel 
                        ? 'bg-white dark:bg-[#121214] text-black dark:text-neutral-200 border border-black/5 dark:border-white/10 rounded-[20px] rounded-tl-sm' 
                        : 'bg-black dark:bg-white text-white dark:text-black rounded-[20px] rounded-tr-sm shadow-md'
                    }
                `}>
                    {(hasText || isLoading || thought) && (
                        <>
                            {/* Render Thinking Block FIRST if exists */}
                            {thought && <ThoughtBlock content={thought} isActive={isLoading && !content} />}

                            {content ? (
                                <div className={`prose dark:prose-invert prose-sm max-w-none break-words leading-7 min-w-0 font-sans text-[13px] md:text-[14px]
                                    ${isModel 
                                        ? 'prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-black dark:prose-headings:text-white prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-strong:text-black dark:prose-strong:text-white' 
                                        : 'prose-p:text-white/95 dark:prose-p:text-black/95 prose-strong:text-white dark:prose-strong:text-black prose-code:text-white dark:prose-code:text-black prose-ul:text-white/90 dark:prose-ul:text-black/90'
                                    }
                                    prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                                    prose-table:border-collapse prose-table:min-w-full prose-table:my-4 prose-table:text-xs prose-table:rounded-lg prose-table:overflow-hidden
                                    prose-th:bg-black/5 dark:prose-th:bg-white/5 prose-th:p-2.5 prose-th:text-left prose-th:font-bold prose-th:uppercase prose-th:tracking-wider prose-th:border-b prose-th:border-black/10 dark:prose-th:border-white/10
                                    prose-td:p-2.5 prose-td:border-b prose-td:border-black/5 dark:prose-td:border-white/5
                                    prose-tr:even:bg-black/[0.02] dark:prose-tr:even:bg-white/[0.02]
                                `}>
                                    <Markdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code({node, inline, className, children, ...props}: any) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const lang = match ? match[1] : 'text';
                                                return !inline ? (
                                                    <CodeBlock language={lang} children={children} />
                                                ) : (
                                                    <code className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${isModel ? 'bg-black/5 dark:bg-white/10 border-black/5 dark:border-white/10 text-pink-600 dark:text-pink-400' : 'bg-white/20 border-white/10 text-white dark:text-black'}`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            },
                                            ul: ({children}) => <ul className="list-disc pl-4 space-y-1 my-2 marker:text-current opacity-90">{children}</ul>,
                                            ol: ({children}) => <ol className="list-decimal pl-4 space-y-1 my-2 marker:text-current opacity-90">{children}</ol>,
                                            blockquote: ({children}) => <blockquote className="border-l-2 border-accent pl-4 italic opacity-80 my-3 py-1 bg-black/5 dark:bg-white/5 rounded-r-lg">{children}</blockquote>,
                                            a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold inline-flex items-center gap-1">{children} <ArrowRight size={10} className="-rotate-45"/></a>
                                        }}
                                    >
                                        {content}
                                    </Markdown>
                                </div>
                            ) : isLoading && !thought && (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1s_infinite_-0.3s] opacity-50"></div>
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1s_infinite_-0.15s] opacity-50"></div>
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-[bounce_1s_infinite] opacity-50"></div>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 animate-pulse flex items-center gap-2">
                                        SYNTHESIZING <ExecutionTimer />
                                    </span>
                                </div>
                            )}

                            {/* Action Footer (AI Only) - Hover to show */}
                            {isModel && content && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button 
                                        onClick={handleCopy}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                        title="Copy"
                                    >
                                        {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Grounding Chips */}
                {isModel && hasText && msg.metadata?.groundingChunks && msg.metadata.groundingChunks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 w-full animate-slide-up px-1">
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
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#1a1a1c] rounded-lg border border-black/5 dark:border-white/5 text-[8px] font-black uppercase tracking-wider text-neutral-500 hover:text-accent hover:border-accent/30 transition-all shadow-sm max-w-full truncate hover:scale-[1.02]"
                                >
                                    <ExternalLink size={10} className="shrink-0" /> 
                                    <span className="truncate">{title}</span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    // Strict memoization to prevent partial re-renders during high-frequency token streaming
    return prev.msg.text === next.msg.text && 
           prev.isLoading === next.isLoading && 
           prev.msg.metadata?.model === next.msg.metadata?.model;
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({
  messages,
  personaMode,
  isLoading,
  messagesEndRef
}) => {
  return (
    <div className="w-full py-4 pb-8">
        {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                msg={msg} 
                personaMode={personaMode} 
                isLoading={isLoading && msg.role === 'model' && msg === messages[messages.length - 1]} 
            />
        ))}
        
        {/* Connection Indicator - Only shows if strictly loading and NO partial response yet */}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start mb-6 pl-2 sm:pl-12 animate-fade-in">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                        ESTABLISHING_UPLINK <ExecutionTimer />
                    </span>
                </div>
            </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
    </div>
  );
});
