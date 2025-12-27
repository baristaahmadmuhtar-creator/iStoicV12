
import React, { memo, useState, useMemo, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
    Flame, Brain, ExternalLink, Sparkles, Cpu, Zap, Box, Globe, 
    Copy, Check, ChevronDown, Wind, CircuitBoard, ArrowRight,
    Terminal, Clock, Image as ImageIcon, RefreshCw, Search, MessagesSquare, Download, Maximize2, Network
} from 'lucide-react';
import { type ChatMessage } from '../../../types';
import { generateImage } from '../../../services/geminiService';

interface ChatWindowProps {
  messages: ChatMessage[];
  personaMode: 'hanisah' | 'stoic';
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onUpdateMessage?: (messageId: string, newText: string) => void;
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

const SystemStatusBubble = ({ status }: { status: string }) => (
    <div className="flex items-center gap-2.5 my-2 px-4 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-500 w-fit animate-slide-up">
        <div className="relative">
            <Network size={14} className="relative z-10" />
            <div className="absolute inset-0 bg-amber-500 blur-md opacity-20 animate-pulse"></div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            {status}
            <RefreshCw size={10} className="animate-spin" />
        </span>
    </div>
);

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
                className="w-full flex items-center justify-between px-4 py-3 transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.99]"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'bg-black/5 dark:bg-white/10 text-neutral-500'}`}>
                        <CircuitBoard size={14} />
                    </div>
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`}>
                            {isActive ? 'NEURAL_PROCESSING' : 'LOGIC_TRACE'}
                        </span>
                        {isActive && <span className="text-[8px] text-indigo-400/70 font-mono">Computing inference...</span>}
                    </div>
                </div>
                <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-indigo-500/10 text-indigo-500' : 'text-neutral-400 hover:text-black dark:hover:text-white'}`}>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="relative border-t border-black/5 dark:border-white/5 bg-zinc-100/50 dark:bg-[#08080a]">
                    <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500 to-transparent"></div>
                    <div className="p-4 pl-5 overflow-x-auto custom-scroll">
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
            <div className="flex items-center gap-2 mb-2.5">
                <div className="p-1 rounded bg-accent/10 text-accent"><Search size={10} /></div>
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">VERIFIED_SOURCES</span>
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
                            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5 hover:border-accent/30 hover:bg-accent/5 transition-all group max-w-full sm:max-w-[240px] active:scale-95"
                        >
                            <span className="text-[9px] font-bold text-neutral-400 group-hover:text-accent transition-colors">#{idx + 1}</span>
                            <span className="text-[9px] font-medium text-neutral-600 dark:text-neutral-300 truncate group-hover:text-accent transition-colors flex-1">
                                {title}
                            </span>
                            <ExternalLink size={8} className="text-neutral-400 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

const ImageGenerationCard = ({ 
    prompt, 
    messageId, 
    originalText, 
    onUpdateMessage 
}: { 
    prompt: string, 
    messageId?: string, 
    originalText?: string, 
    onUpdateMessage?: (id: string, text: string) => void 
}) => {
    const [status, setStatus] = useState<'IDLE'|'GENERATING'|'DONE'|'ERROR'>('IDLE');
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    // Auto-trigger generation if we can update the message
    useEffect(() => {
        if (status === 'IDLE' && onUpdateMessage && messageId && originalText) {
            handleGenerate();
        }
    }, []);

    const handleGenerate = async () => {
        setStatus('GENERATING');
        try {
            const result = await generateImage(prompt);
            if (result) {
                if (onUpdateMessage && messageId && originalText) {
                    // Replace the !!IMG tag with markdown image syntax to display directly
                    const newContent = originalText.replace(/!!IMG:\[.*?\]!!/, `\n![Generated Visual](${result})\n\n_Visual Generated: ${prompt.slice(0, 50)}..._`);
                    onUpdateMessage(messageId, newContent);
                } else {
                    setImageUrl(result);
                    setStatus('DONE');
                }
            } else {
                setStatus('ERROR');
            }
        } catch (e) {
            setStatus('ERROR');
        }
    };

    return (
        <div className="my-4 rounded-2xl overflow-hidden border border-accent/20 bg-accent/5 max-w-sm shadow-[0_0_30px_-10px_rgba(var(--accent-rgb),0.1)] ring-1 ring-accent/10">
            <div className="p-3 border-b border-accent/10 flex items-center justify-between bg-accent/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                    <ImageIcon size={12}/> GENERATIVE_PROMPT
                </span>
                {status === 'IDLE' && <Sparkles size={12} className="text-accent animate-pulse"/>}
            </div>
            
            <div className="p-4">
                <p className="text-[10px] md:text-xs font-mono text-neutral-500 mb-4 line-clamp-3 italic leading-relaxed">"{prompt}"</p>
                
                {status === 'DONE' && imageUrl ? (
                    <div className="relative group animate-slide-up">
                        <img src={imageUrl} alt="Generated" className="w-full rounded-xl shadow-lg border border-white/10" />
                        <a href={imageUrl} download="melsa_gen.png" className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur hover:bg-black active:scale-95">
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
                {status === 'ERROR' && <p className="text-[9px] text-red-400 mt-2 text-center font-bold uppercase tracking-wider">GENERATION FAILED</p>}
            </div>
        </div>
    );
};

// Render Images within Markdown (for Tool Outputs)
const MarkdownImage = ({ src, alt }: { src?: string, alt?: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (!src) return null;

    return (
        <div className="my-4 relative group/img">
            <div 
                className={`relative overflow-hidden rounded-2xl border border-white/10 shadow-lg transition-all cursor-pointer bg-black/20 ${isExpanded ? 'fixed inset-4 z-[9999] m-0 bg-black/90 object-contain animate-fade-in' : 'max-w-md hover:border-accent/30 active:scale-[0.98]'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <img 
                    src={src} 
                    alt={alt || "Generated Image"} 
                    className={`w-full h-auto ${isExpanded ? 'h-full object-contain' : 'max-h-[400px] object-cover'}`} 
                />
                
                {!isExpanded && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button 
                            className="p-1.5 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-accent hover:text-black transition-colors active:scale-90"
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                        >
                            <Maximize2 size={14} />
                        </button>
                        <a 
                            href={src} 
                            download={`generated_image_${Date.now()}.png`}
                            className="p-1.5 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-emerald-500 transition-colors active:scale-90"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download size={14} />
                        </a>
                    </div>
                )}
                
                {isExpanded && (
                    <button 
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur active:scale-90 transition-transform"
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    >
                        <ArrowRight size={24} className="rotate-45" /> 
                    </button>
                )}
            </div>
            {alt && <p className="text-[9px] text-neutral-500 mt-2 font-mono ml-2 uppercase tracking-wide">{alt}</p>}
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
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 ml-2">
                        {language || 'TEXT'}
                    </span>
                </div>
                <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-all border border-white/5 hover:border-white/10 active:scale-95"
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

const MessageBubble = memo(({ 
    msg, 
    personaMode, 
    isLoading, 
    onUpdateMessage 
}: { 
    msg: ChatMessage, 
    personaMode: 'hanisah' | 'stoic', 
    isLoading: boolean, 
    onUpdateMessage?: (id: string, text: string) => void 
}) => {
    const [copied, setCopied] = useState(false);
    const isModel = msg.role === 'model';
    const isError = msg.metadata?.status === 'error';
    const isRerouting = msg.metadata?.isRerouting; // Check for Reroute flag
    
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

    if (isModel && !content && !isLoading && !thought && !isError && !isRerouting) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const accentColor = personaMode === 'hanisah' ? 'text-orange-500' : 'text-cyan-500';
    const accentBg = personaMode === 'hanisah' ? 'bg-orange-500' : 'bg-cyan-500';
    
    // Updated Bubble Styles for Platinum Look
    const userBubbleClass = "bg-zinc-100 dark:bg-white/5 text-black dark:text-white rounded-[24px] rounded-tr-sm border border-black/5 dark:border-white/5 shadow-sm";
    const modelBubbleClass = "bg-white dark:bg-[#0a0a0b] text-black dark:text-neutral-200 rounded-[24px] rounded-tl-sm border border-black/5 dark:border-white/10 shadow-sm";

    return (
        <div className={`flex w-full mb-6 md:mb-8 ${isModel ? 'justify-start' : 'justify-end'} animate-slide-up px-1 group/msg`}>
            
            {/* AI Avatar */}
            {isModel && (
                <div className="flex flex-col gap-2 mr-3 shrink-0 mt-1">
                    <div className={`
                        w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border border-white/10 transition-all duration-500 relative overflow-hidden group-hover/msg:scale-110
                        ${isError ? 'bg-red-500/10 text-red-500 border-red-500/20' : `bg-white dark:bg-[#121214] ${accentColor}`}
                    `}>
                        <div className={`absolute inset-0 opacity-10 ${isError ? 'bg-red-500' : accentBg} blur-md`}></div>
                        {isError ? <Terminal size={16} /> : (personaMode === 'hanisah' ? <Flame size={16} fill="currentColor" className="relative z-10"/> : <Brain size={16} fill="currentColor" className="relative z-10"/>)}
                    </div>
                </div>
            )}

            <div className={`relative max-w-[88%] sm:max-w-[80%] lg:max-w-[75%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                
                {/* Meta Header for Model */}
                {isModel && (
                    <div className="flex items-center gap-3 mb-1.5 px-2 select-none opacity-0 group-hover/msg:opacity-70 transition-opacity duration-300">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isError ? 'text-red-500' : accentColor}`}>
                            {isError ? 'SYSTEM_FAILURE' : (personaMode === 'hanisah' ? 'HANISAH' : 'STOIC')}
                        </span>
                        
                        {!isError && <div className="h-2 w-[1px] bg-black/10 dark:bg-white/10"></div>}

                        {msg.metadata?.model && !isError && (
                            <div className="flex items-center gap-1.5">
                                <ProviderIcon provider={msg.metadata?.provider} />
                                <span className="text-[7px] font-bold text-neutral-500 uppercase tracking-wider truncate max-w-[120px]">
                                    {msg.metadata.model}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Bubble Container */}
                <div className={`
                    relative px-5 py-4 md:px-7 md:py-5 overflow-hidden text-sm md:text-[15px] leading-7 font-sans tracking-wide
                    ${isModel ? modelBubbleClass : userBubbleClass}
                    ${isError ? 'border-red-500/20 bg-red-500/5' : ''}
                `}>
                    {(content || isLoading || thought || isRerouting) && (
                        <>
                            {/* Rerouting Indicator (Bubble Process) */}
                            {isRerouting && msg.metadata?.systemStatus && !content && (
                                <SystemStatusBubble status={msg.metadata.systemStatus} />
                            )}

                            {thought && <ThinkingAccordion content={thought} isActive={isLoading && !content} />}

                            {content ? (
                                <div className={`prose dark:prose-invert prose-sm max-w-none break-words min-w-0
                                    ${isModel 
                                        ? 'prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-neutral-800 dark:prose-p:text-neutral-300 prose-strong:text-black dark:prose-strong:text-white prose-li:marker:text-neutral-400' 
                                        : 'prose-p:text-black dark:prose-p:text-white'
                                    }
                                    prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-lg prose-code:before:content-none prose-code:after:content-none
                                    prose-blockquote:border-l-2 prose-blockquote:border-accent prose-blockquote:bg-black/5 dark:prose-blockquote:bg-white/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                                `}>
                                    <Markdown
                                        remarkPlugins={[remarkGfm]}
                                        urlTransform={(url) => url} // Enable Data URIs
                                        components={{
                                            code({node, inline, className, children, ...props}: any) {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const lang = match ? match[1] : 'text';
                                                return !inline ? (
                                                    <CodeBlock language={lang} children={children} />
                                                ) : (
                                                    <code className={`text-[12px] font-mono font-bold px-1.5 py-0.5 rounded border ${isModel ? 'bg-black/5 dark:bg-white/10 border-black/5 dark:border-white/10 text-pink-600 dark:text-pink-400' : 'bg-black/10 dark:bg-white/20 border-black/10 dark:border-white/10 text-black dark:text-white'}`} {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            },
                                            a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-bold inline-flex items-center gap-1 bg-accent/5 px-1.5 rounded transition-colors hover:bg-accent/10 border border-accent/10 hover:border-accent/30">{children} <ArrowRight size={10} className="-rotate-45"/></a>,
                                            img: ({src, alt}) => <MarkdownImage src={src} alt={alt} />,
                                        }}
                                    >
                                        {content}
                                    </Markdown>
                                    
                                    {isLoading && isModel && (
                                        <span className="inline-block w-2 h-4 bg-accent align-middle ml-1 animate-[pulse_0.8s_ease-in-out_infinite]"></span>
                                    )}
                                </div>
                            ) : isLoading && !thought && !imgPrompt && !isRerouting && (
                                <div className="flex items-center gap-2 py-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 animate-pulse">Computing</span>
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1 h-1 bg-accent rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}

                            {imgPrompt && (
                                <ImageGenerationCard 
                                    prompt={imgPrompt} 
                                    messageId={msg.id}
                                    originalText={msg.text}
                                    onUpdateMessage={onUpdateMessage}
                                />
                            )}
                            
                            {/* Grounding Sources */}
                            {isModel && msg.metadata?.groundingChunks && (
                                <GroundingSources chunks={msg.metadata.groundingChunks} />
                            )}
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                {isModel && content && (
                    <div className="flex items-center gap-3 mt-2 px-2 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300">
                        <button 
                            onClick={handleCopy}
                            className="text-neutral-400 hover:text-black dark:hover:text-white transition-colors active:scale-90"
                            title="Copy Response"
                        >
                            {copied ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                        </button>
                        {msg.metadata?.latency && (
                            <span className="text-[8px] font-mono text-neutral-500 flex items-center gap-1">
                                <Clock size={10} /> {Math.round(msg.metadata.latency)}ms
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
           prev.msg.metadata?.model === next.msg.metadata?.model &&
           prev.msg.metadata?.isRerouting === next.msg.metadata?.isRerouting; // Check reroute flag
});

export const ChatWindow: React.FC<ChatWindowProps> = memo(({
  messages,
  personaMode,
  isLoading,
  messagesEndRef,
  onUpdateMessage
}) => {
  return (
    <div className="w-full py-4 pb-12">
        {messages.map((msg) => (
            <MessageBubble 
                key={msg.id} 
                msg={msg} 
                personaMode={personaMode} 
                isLoading={isLoading && msg.role === 'model' && msg === messages[messages.length - 1]} 
                onUpdateMessage={onUpdateMessage}
            />
        ))}
        
        {/* Placeholder for Thinking State if no message created yet but loading */}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'model' && (
             <div className="flex justify-start mb-10 pl-0 md:pl-12 animate-fade-in">
                <div className="flex items-center gap-4 px-6 py-4 rounded-2xl border border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-sm">
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

        <div ref={messagesEndRef} className="h-12 md:h-6" />
    </div>
  );
});
