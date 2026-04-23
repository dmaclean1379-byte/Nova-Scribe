import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  Trash2,
  Undo2,
  ChevronRight,
  Lightbulb,
  MapPin,
  Users,
  Loader2,
  MessageSquare,
  Wand2,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChatMessage, LLMConfig, StoryBibleEntry, StoryState } from '../types';
import { streamLLM, generateImage } from '../services/llmService';

interface WorldBuilderProps {
  story: StoryState;
  llmConfig: LLMConfig;
  onUpdate: (updates: Partial<StoryState>) => void;
  onComplete: () => void;
}

export default function WorldBuilder({ story, llmConfig, onUpdate, onComplete }: WorldBuilderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(story.chatHistory || [
    { 
      role: 'assistant', 
      content: `Welcome to the Genesis Chamber. I'm your creative partner. 

What kind of story are we breathing life into today? Tell me your rawest ideas—a genre, a single image, a theme, or even just a mood—and we'll build this world together.`,
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentResponse]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsGenerating(true);
    setCurrentResponse('');

    const fullPrompt = newMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n\n');
    const systemPrompt = `You are a visionary world-builder and creative consultant. Your goal is to help the user brainstorm and refine their story ideas. 
Be highly collaborative, proactive, and structured. 

When you identify potential characters, locations, or key lore items, highlight them or suggest they be added to the project bible.
Always keep the tone inspiring but grounded in narrative logic.

If the user seems stuck, offer three distinct paths or "spark ideas" to keep the momentum going.`;

    try {
      let fullText = '';
      const stream = streamLLM(fullPrompt, llmConfig, story.id, systemPrompt);
      
      for await (const token of stream) {
        fullText += token;
        setCurrentResponse(fullText);
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: fullText, timestamp: Date.now() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      onUpdate({ chatHistory: finalMessages });
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Forgive me, the creative link was severed. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsGenerating(false);
      setCurrentResponse('');
    }
  };

  const handleVisualize = async () => {
    if (isVisualizing) return;
    setIsVisualizing(true);

    try {
      // Create a summary prompt from history
      const historySummary = messages.slice(-4).map(m => m.content).join(' ');
      const prompt = `Based on this brainstorming session: "${historySummary}". Generate a cinematic, epic fantasy concept art illustration of the most prominent subject mentioned. High detail, 4k digital art.`;

      const imageUrl = await generateImage(prompt, llmConfig);
      
      const assistantMsg: ChatMessage = { 
        role: 'assistant', 
        content: `I've manifested a vision based on our discussion:\n\n![Visual](${imageUrl})`, 
        timestamp: Date.now() 
      };
      
      const finalMessages = [...messages, assistantMsg];
      setMessages(finalMessages);
      onUpdate({ chatHistory: finalMessages });
    } catch (error) {
      console.error("Chat visualization failed:", error);
    } finally {
      setIsVisualizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Suggest a unique magic system",
    "Describe the main antagonist's lair",
    "Brainstorm 3 main characters",
    "Describe the starting city",
    "Generate a plot twist for act two"
  ];

  return (
    <div className="h-full flex flex-col bg-paper relative overflow-hidden min-h-0">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-accent/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-accent/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full p-2 md:p-6 lg:p-8 gap-4 md:gap-8 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-2">
          <div className="space-y-0.5">
            <h2 className="text-xl md:text-3xl font-serif font-bold tracking-tight text-ink flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-xl bg-accent/10 text-accent">
                <Sparkles size={20} className="md:w-6 md:h-6" />
              </div>
              Genesis Chamber
            </h2>
            <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-widest font-bold">Brainstorming & World Building</p>
          </div>
          <Button 
            onClick={onComplete}
            className="bg-accent hover:bg-accent/90 text-white gap-2 font-bold uppercase tracking-wider text-[10px] md:text-xs px-4 md:px-6 h-9 md:h-11"
          >
            Start Writing
            <ArrowRight size={14} className="md:w-4 md:h-4" />
          </Button>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden bg-paper/50 backdrop-blur-sm border-border/50 shadow-2xl rounded-xl md:rounded-2xl">
          <div 
            className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8" 
            ref={scrollRef}
          >
            {messages.map((message, i) => (
                <div 
                  key={i} 
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] md:max-w-[70%] space-y-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-1 justify-inherit">
                      {message.role === 'assistant' && <Badge variant="secondary" className="bg-accent/10 text-accent text-[9px] px-1.5 uppercase tracking-widest">Architect</Badge>}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'user' && <Badge variant="outline" className="text-[9px] px-1.5 uppercase tracking-widest">Author</Badge>}
                    </div>
                    <div className={`
                      p-4 md:p-6 rounded-2xl text-sm md:text-base leading-relaxed whitespace-pre-wrap font-serif
                      ${message.role === 'user' 
                        ? 'bg-accent text-white shadow-lg' 
                        : 'bg-secondary text-ink border border-border/50'}
                    `}>
                      {message.content.includes('![Visual](') ? (
                        <div className="space-y-4">
                          <p>{message.content.split('![Visual](')[0]}</p>
                          <div className="relative aspect-square md:aspect-video rounded-xl overflow-hidden border border-border/50 shadow-inner">
                            <img 
                              src={message.content.match(/!\[Visual\]\((.*?)\)/)?.[1]} 
                              alt="Visual concept" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      ) : message.content}
                    </div>
                  </div>
                </div>
              ))}
              
              {(isGenerating || isVisualizing) && (
                <div className="flex gap-4 justify-start">
                  <div className="max-w-[85%] md:max-w-[70%] space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="bg-accent/10 text-accent text-[9px] px-1.5 uppercase tracking-widest flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" />
                        {isVisualizing ? "Architect is manifesting a vision..." : "Architect is thinking..."}
                      </Badge>
                    </div>
                    <div className="p-4 md:p-6 rounded-2xl text-sm md:text-base leading-relaxed whitespace-pre-wrap font-serif bg-secondary text-ink border border-border/50 italic opacity-70">
                      {isVisualizing ? "Consulting the creative ether for a visual representation..." : currentResponse || "Processing your vision..."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 md:p-6 border-t border-border/40 bg-secondary/30">
            {!isGenerating && !isVisualizing && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVisualize}
                  className="h-8 rounded-full border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 py-0 px-3"
                >
                  <Sparkles size={12} />
                  Visualize Discussion
                </Button>
                {messages.length < 5 && suggestions.map(s => (
                  <button 
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="px-3 py-1.5 rounded-full bg-paper border border-border/50 text-[11px] text-muted-foreground hover:border-accent hover:text-accent transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Lightbulb size={12} className="text-accent" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="relative group">
              <textarea 
                placeholder="Speak your vision into the chamber..." 
                className="w-full bg-paper border-border/50 focus:border-accent focus:ring-1 focus:ring-accent/20 rounded-xl p-4 pr-16 min-h-[60px] max-h-[150px] text-sm md:text-base font-serif shadow-inner resize-none transition-all outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button 
                size="icon"
                disabled={!input.trim() || isGenerating}
                onClick={handleSend}
                className={`absolute right-3 bottom-3 h-10 w-10 rounded-lg transition-all ${input.trim() ? 'bg-accent shadow-lg text-white' : 'bg-muted text-muted-foreground'}`}
              >
                {isGenerating ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              </Button>
            </div>
            <p className="mt-3 text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium opacity-50">
              {isGenerating ? "Manifesting ideas..." : "Press Enter to send. Use Shift+Enter for new lines."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
