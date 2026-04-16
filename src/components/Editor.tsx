import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Type, Wand2, Check, Loader2, X, Eraser, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LLMConfig } from '../types';
import { callLLM } from '../services/llmService';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  llmConfig: LLMConfig;
}

export default function Editor({ content, onChange, llmConfig }: EditorProps) {
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString() || "";
    if (selection.trim()) {
      e.preventDefault();
      // Adjust position to keep menu on screen
      const x = Math.min(e.clientX, window.innerWidth - 320);
      const y = Math.min(e.clientY, window.innerHeight - 450);
      setMenuPos({ x, y });
      setSelectedText(selection);
      setAiResult(null);
    }
  };

  const closeMenu = () => {
    if (!loading) {
      setMenuPos(null);
      setAiResult(null);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuPos && !(e.target as HTMLElement).closest('.ai-context-menu')) {
        // Only close if not dragging
        const isDragging = (e.target as HTMLElement).closest('.drag-handle');
        if (!isDragging) {
          closeMenu();
        }
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [menuPos, loading]);

  const handleAiAction = async (action: string) => {
    setLoading(true);
    setAiResult(null);
    try {
      let prompt = "";
      switch (action) {
        case 'rewrite':
          prompt = `You are a professional editor. Rewrite the following text to be more engaging, evocative, and literary while maintaining its original meaning: "${selectedText}". Provide only the rewritten text.`;
          break;
        case 'fix':
          prompt = `You are a professional proofreader. Correct any spelling, grammar, or punctuation errors in the following text: "${selectedText}". Provide only the corrected text.`;
          break;
        case 'expand':
          prompt = `You are a creative writer. Expand on the following idea or description, adding more sensory details and depth: "${selectedText}". Provide only the expanded text.`;
          break;
        case 'shorten':
          prompt = `You are a concise editor. Shorten the following text while keeping the core message intact: "${selectedText}". Provide only the shortened text.`;
          break;
      }
      const result = await callLLM(prompt, llmConfig);
      setAiResult(result);
    } catch (error: any) {
      setAiResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyChange = () => {
    if (!aiResult || !textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = content.substring(0, start) + aiResult + content.substring(end);
    onChange(newContent);
    setAiResult(null);
    setMenuPos(null);
  };

  return (
    <div className="h-full flex flex-col items-center bg-paper relative">
      <ScrollArea className="w-full max-w-3xl px-4 md:px-8 py-6 md:py-12 h-full touch-pan-y">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onContextMenu={handleContextMenu}
          placeholder="Start your story here..."
          className="w-full min-h-[calc(100vh-200px)] writing-editor bg-transparent border-none resize-none focus:ring-0 placeholder:text-gray-400 text-base md:text-lg touch-pan-y"
          spellCheck={false}
        />
      </ScrollArea>
      
      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 px-4 md:px-6 py-2 md:py-2.5 bg-secondary border border-border rounded-full shadow-xl flex items-center gap-3 md:gap-6 text-[9px] md:text-[10px] uppercase tracking-widest text-ink font-mono transition-all hover:shadow-2xl hover:border-accent/40 whitespace-nowrap z-10">
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-accent font-bold">{content.split(/\s+/).filter(Boolean).length}</span>
          <span className="hidden sm:inline">words</span>
          <span className="sm:hidden">w</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-muted/40" />
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-accent font-bold">{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)}</span>
          <span className="hidden sm:inline">min read</span>
          <span className="sm:hidden">min</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-muted/40" />
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-accent font-bold">{content.length}</span>
          <span className="hidden sm:inline">chars</span>
          <span className="sm:hidden">c</span>
        </div>
      </div>

      {/* AI Context Menu */}
      <AnimatePresence>
        {menuPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            drag
            dragMomentum={false}
            style={{ left: menuPos.x, top: menuPos.y }}
            className="fixed z-[100] w-72 md:w-80 bg-paper border border-border shadow-2xl rounded-xl overflow-hidden ai-context-menu flex flex-col"
          >
            {!aiResult && !loading ? (
              <div className="p-1.5 space-y-0.5 drag-handle cursor-move">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted border-b border-border/50 mb-1">
                  AI Writing Assistant
                </div>
                <button 
                  onClick={() => handleAiAction('rewrite')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-accent/10 hover:text-accent rounded-lg transition-colors group"
                >
                  <Sparkles size={16} className="text-accent group-hover:scale-110 transition-transform" />
                  <span>Rewrite Selection</span>
                </button>
                <button 
                  onClick={() => handleAiAction('fix')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-accent/10 hover:text-accent rounded-lg transition-colors group"
                >
                  <Type size={16} className="text-accent group-hover:scale-110 transition-transform" />
                  <span>Fix Grammar & Spelling</span>
                </button>
                <button 
                  onClick={() => handleAiAction('expand')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-accent/10 hover:text-accent rounded-lg transition-colors group"
                >
                  <Wand2 size={16} className="text-accent group-hover:scale-110 transition-transform" />
                  <span>Expand Description</span>
                </button>
                <button 
                  onClick={() => handleAiAction('shorten')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-accent/10 hover:text-accent rounded-lg transition-colors group"
                >
                  <Eraser size={16} className="text-accent group-hover:scale-110 transition-transform" />
                  <span>Make Concise</span>
                </button>
              </div>
            ) : loading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 drag-handle cursor-move">
                <Loader2 className="animate-spin text-accent" size={24} />
                <span className="text-xs font-medium text-muted animate-pulse">Consulting the muse...</span>
              </div>
            ) : (
              <div className="flex flex-col h-[400px] md:h-[500px]">
                <div className="px-3 py-2 bg-secondary border-b border-border flex items-center justify-between drag-handle cursor-move">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">AI Suggestion</span>
                  <button onClick={closeMenu} className="text-muted hover:text-ink p-1">
                    <X size={14} />
                  </button>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 touch-pan-y">
                    <p className="text-sm leading-relaxed font-serif italic text-ink">
                      {aiResult}
                    </p>
                  </div>
                </ScrollArea>
                <div className="p-2 bg-secondary border-t border-border flex gap-2">
                  <button 
                    onClick={applyChange}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-accent/90 transition-colors shadow-sm"
                  >
                    <Check size={14} />
                    Apply Change
                  </button>
                  <button 
                    onClick={() => setAiResult(null)}
                    className="px-3 py-2 border border-border hover:bg-paper rounded-lg transition-colors"
                  >
                    <RefreshCw size={14} className="text-muted" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
