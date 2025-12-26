
import React, { memo, useState, useMemo, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Flame, Brain, ExternalLink, Sparkles, Cpu, Zap, Box, Globe, 
    Copy, Check, ChevronDown, Wind, CircuitBoard, ArrowRight,
    Terminal, Clock, Image as ImageIcon, RefreshCw, Search
} from 'lucide-react';
import { type ChatMessage } from '../../../types';
import { generateImage } from '../../../services/geminiService';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'hanisah' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// --- MICRO COMPONENTS ---

const ProviderIcon = ({ provider }: { provider?: string }) => {
    const p = provider?.toUpperCase() || 'UNKNOWN';
    if (p.includes('GEMINI')) return <Sparkles size={10} className="text-blue-400" />;
    if (p.includes('GROQ')) return <Zap size={10} className="text-orange-400" />;
    if (p.includes('OPENAI')) return <Cpu size={10} className="text-green-400" />;
    if (p.includes('DEEPSEEK')) return <Brain size={10} className="text-indigo-400" />;
    if (p.includes('OPENROUTER')) return <Globe size={10} className="text-purple-400" />;
    if (p.includes('MISTRAL')) return <Wind size={10} className="text-yellow-400" />;
    return <Box size={10} className="text-neutral-400" />;
};

const ThinkingAccordion = ({ content, isActive }: { content: string, isActive?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(isActive);
    
    useEffect(() => { if (isActive) setIsExpanded(true); }, [isActive]);

    return (
        <div className={`my-3 rounded-xl overflow-hidden border transition-all duration-500 w-full group/thought ${
            isActive 
            ? 'border-indigo-500/30 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
            : 'border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02]'
        }`}>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-black/5 dark:bg-white/10 text-neutral-500'}`}>
                        <CircuitBoard size={12} />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`}>
                            {isActive ? 'REASONING_ENGINE' : 'CHAIN_OF_THOUGHT'}
                        </span>
                        {isActive && <span className="text-[8px] text-indigo-400/70 font-mono mt-0.5 animate-pulse">Calculating logic paths...</span>}
                    </div>
                </div>
                <ChevronDown size={14} className={`text-neutral-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="relative border-t border-black/5 dark:border-white/5 bg-zinc-100/50 dark:bg-[#050505]">
                    <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/50 to-transparent"></div>
                    <div className="p-4 overflow-x-auto custom-scroll">
                        <pre className="text-[10px] font-mono leading-[1.6] text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap font-medium">
                            {content}
                            {isActive && <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-500 animate-pulse align-middle"></span>}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GroundingSources = ({ chunks }: { chunks: any[] }) => {
    if (!chunks || chunks.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 mb-2">
                <Search size={10} className="text-neutral-400" />
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">SOURCES_VERIFIED</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {chunks.map((chunk, idx) => {
                    const url = chunk.web?.uri || chunk.maps?.uri;
                    const title = chunk.web?.title || chunk.maps?.title || "Reference";
                    if (!url) return null;
                    
                    return (
                        <a 
                            key={idx} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group max-w-[200px]"
                        >
                            <div className="w-4 h-4 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-[8px] font-bold text-neutral-500 shrink-0">
                                {idx + 1}
                            </div>
                            <span className="text-[9px] font-medium text-neutral-600 dark:text-neutral-300 truncate group-hover:text-accent transition-colors">
                                {title}
                            </span>
                            <ExternalLink size={8} className="text-neutral-400 group-hover:text-accent ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

const ImageGenerationCard = ({ prompt }: { prompt: string }) => {
    const [status, setStatus] = useState<'IDLE'|'GENERATING'|'DONE'|'ERROR'>('IDLE');
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const handleGenerate = async () => {
        setStatus('GENERATING');
        try {
            const result = await generateImage(prompt);
            if (result) {
                setImageUrl(result);
                setStatus('DONE');
            } else {
                setStatus('ERROR');
            }
        } catch (e) {
            setStatus('ERROR');
        }
    };

    return (
        <div className="my-4 rounded-2xl overflow-hidden border border-accent/20 bg-accent/5 max-w-sm shadow-[0_0_20px_rgba(var(--accent-rgb),0.05)]">
            <div className="p-3 border-b border-accent/10 flex items-center justify-between bg-accent/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                    <ImageIcon size={12}/> GENERATIVE_PROMPT
                </span>
                {status === 'IDLE' && <Sparkles size={12} className="text-accent animate-pulse"/>}
            </div>
            
            <div className="p-4">
                <p className="text-xs font-mono text-neutral-400 mb-4 line-clamp-3 italic">"{prompt}"</p>
                
                {status === 'DONE' && imageUrl ? (
                    <div className="relative group animate-slide-up">
                        <img src={imageUrl} alt="Generated" className="w-full rounded-xl shadow-lg border border-white/10" />
                        <a href={imageUrl} download="melsa_gen.png" className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur hover:bg-black">
                            <ArrowRight size={14} className="-rotate-45" />
                        </a>
                    </div>
                ) : (
                    <button 
                        onClick={handleGenerate}
                        disabled={status === 'GENERATING'}
                        className="w-full py-3 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-accent/20"
                    >
                        {status === 'GENERATING' ? <RefreshCw size={14} className="animate-spin"/> : <Zap size={14}/>}
                        {status === 'GENERATING' ? 'RENDERING...' : 'VISUALIZE NOW'}
                    </button>
                )}
                {status === 'ERROR' && <p className="text-[9px] text-red-400 mt-2 text-center font-bold">GENERATION FAILED.</p>}
            </div>
        </div>
    );
};

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
        <div className="relative group/code my-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-[#0e0e10] shadow-md ring-1 ring-white/5">
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 ml-2">
                        {language || 'TEXT'}
                    </span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/5 hover:border-white/10"
                >
                    {copied ? <Check size={10} className="text-emerald-500"/> : <Copy size={10} className="text-neutral-400"/>}
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">{copied ? 'COPIED' : 'COPY'}</span>
                </button>
            </div>
            
            <div className="p-4 overflow-x-auto custom-scroll w-full bg-[#050505]">
                <code className={`language-${language} block text-[11px] md:text-[12px] font-mono text-neutral-300 leading-[1.6] whitespace-pre min-w-max`}>
                    {children}
                </code>
            </div>
        </div>
    );
};

const MessageBubble = memo(({ msg, personaMode, isLoading }: { msg: ChatMessage, personaMode: 'hanisah' | 'stoic', isLoading: boolean }) => {
    const [copied, setCopied] = useState(false);
    const isModel = msg.role === 'model';
    const isError = msg.metadata?.status === 'error';
    
    // Parse Thinking Tags & Image Tags
    const { thought, content, imgPrompt } = useMemo(() => {
        let text = msg.text || '';
        let thoughtContent = null;
        let imagePrompt = null;

        if (text.includes('<think>')) {
            const parts = text.split('</think>');
            thoughtContent = parts[0].replace('<think>', '').trim();
            text = parts[1]?.trim() || '';
        }

        const imgMatch = text.match(/!!IMG:\[(.*?)\]!!/);
        if (imgMatch) {
            imagePrompt = imgMatch[1];
            text = text.replace(imgMatch[0], ''); 
        }

        return { thought: thoughtContent, content: text, imgPrompt: imagePrompt };
    }, [msg.text]);

    if (isModel && !content && !isLoading && !thought && !isError) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const accentColor = personaMode === 'hanisah' ? 'text-orange-500' : 'text-cyan-500';
    const accentBg = personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500';
    const glowClass = personaMode === 'hanisah' ? 'shadow-orange-500/10' : 'shadow-cyan-500/10';

    return (
        <div className={`flex w-full mb-6 md:mb-8 ${isModel ? 'justify-start' : 'justify-end'} animate-slide-up px-1 group/msg`}>
            
            {/* AI Avatar */}
            {isModel && (
                <div className="hidden md:flex flex-col gap-2 mr-4 shrink-0 mt-1">
                    <div className={`
                        w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border border-white/10 transition-all duration-500 relative overflow-hidden
                        ${isError ? 'bg-red-500/10 text-red-500 border-red-500/20' : `bg-gradient-to-br from-${personaMode === 'hanisah' ? 'orange' : 'cyan'}-500/10 to-${personaMode === 'hanisah' ? 'pink' : 'blue'}-500/10 ${accentColor}`}
                    `}>
                        <div className={`absolute inset-0 opacity-20 ${isError ? 'bg-red-500' : accentBg} blur-md`}></div>
                        {isError ? <Terminal size={16} /> : (personaMode === 'hanisah' ? <Flame size={16} fill="currentColor" className="relative z-10"/> : <Brain size={16} fill="currentColor" className="relative z-10"/>)}
                    </div>
                </div>
            )}

            <div className={`relative max-w-[95%] md:max-w-[85%] lg:max-w-[80%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                
                {/* Meta Header */}
                {isModel && (
                    <div className="flex items-center gap-3 mb-1.5 px-2 select-none opacity-80">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isError ? 'text-red-500' : accentColor}`}>
                            {isError ? 'SYSTEM_FAILURE' : (personaMode === 'hanisah' ? 'HANISAH_CORE' : 'STOIC_LOGIC')}
                        </span>
                        
                        {!isError && <div className="h-2 w-[1px] bg-black/10 dark:bg-white/10"></div>}

                        {msg.metadata?.model && !isError && (
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                <ProviderIcon provider={msg.metadata?.provider} />
                                <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider truncate max-w-[150px]">
                                    {msg.metadata.model}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble Container */}
                <div className={`
                    relative px-5 py-4 md:px-6 md:py-5 shadow-sm overflow-hidden text-sm md:text-base leading-relaxed
                    ${isModel 
                        ? `bg-white/60 dark:bg-[#121214]/90 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[24px] rounded-tl-none ${glowClass} text-black dark:text-neutral-200` 
                        : 'bg-zinc-100 dark:bg-[#1a1a1c] text-black dark:text-white rounded-[24px] rounded-tr-sm border border-black/5 dark:border-white/5 shadow-md'
                    }
                    ${isError ? 'border-red-500/20 bg-red-500/5' : ''}
                `}>
                    {(content || isLoading || thought) && (
                        <>
                            {thought && <ThinkingAccordion content={thought} isActive={isLoading && !content} />}

                            {content ? (
                                <div className={`prose dark:prose-invert prose-sm max-w-none break-words min-w-0 font-sans tracking-wide
                                    ${isModel 
                                        ? 'prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-neutral-700 dark:prose-p:text-neutral-300 prose-strong:text-black dark:prose-strong:text-white' 
                                        : 'prose-p:text-black/95 dark:prose-p:text-white/95'
                                    }
                                    prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:before:content-none prose-code:after:content-none
                                    prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:bg-black/5 dark:prose-blockquote:bg-white/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
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
                                                    <code className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${isModel ? 'bg-black/5 dark:bg-white/10 border-black/5 dark:border-white/10 text-pink-600 dark:text-pink-400' : 'bg-black/10 dark:bg-white/20 border-black/10 dark:border-white/10 text-black dark:text-white'}`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            },
                                            a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold inline-flex items-center gap-1 bg-accent/5 px-1.5 rounded transition-colors hover:bg-accent/10 border border-accent/10 hover:border-accent/30">{children} <ArrowRight size={10} className="-rotate-45"/></a>,
                                        }}
                                    >
                                        {content}
                                    </Markdown>
                                    
                                    {isLoading && isModel && (
                                        <span className="inline-block w-2 h-4 bg-accent align-middle ml-1 animate-[pulse_0.8s_ease-in-out_infinite]"></span>
                                    )}
                                </div>
                            ) : isLoading && !thought && !imgPrompt && (
                                <div className="flex items-center gap-3 py-1">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}

                            {imgPrompt && <ImageGenerationCard prompt={imgPrompt} />}
                            
                            {/* Grounding Sources */}
                            {isModel && msg.metadata?.groundingChunks && (
                                <GroundingSources chunks={msg.metadata.groundingChunks} />
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                {isModel && content && (
                    <div className="flex items-center gap-2 mt-2 px-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300">
                        <button 
                            onClick={handleCopy}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Copy Response"
                        >
                            {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                        </button>
                        {msg.metadata?.latency && (
                            <span className="text-[7px] font-mono text-neutral-400 flex items-center gap-1 opacity-60 ml-2">
                                <Clock size={8} /> {Math.round(msg.metadata.latency)}ms
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
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
    <div className="w-full py-4 pb-12">
        {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                msg={msg} 
                personaMode={personaMode} 
                isLoading={isLoading && msg.role === 'model' && msg === messages[messages.length - 1]} 
            />
        ))}
        
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start mb-10 pl-0 md:pl-12 animate-fade-in">
                <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
                    <div className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent shadow-[0_0_15px_var(--accent-glow)]"></span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-2">
                        {personaMode === 'hanisah' ? 'HANISAH_SYNTHESIZING' : 'STOIC_ANALYZING'}
                    </span>
                </div>
            </div>
        )}

        <div ref={messagesEndRef} className="h-6" />
    </div>
  );
});
