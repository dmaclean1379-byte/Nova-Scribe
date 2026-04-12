import { useState } from 'react';
import { 
  Sparkles, 
  Type, 
  ArrowRight, 
  RefreshCw, 
  Loader2, 
  Check, 
  Copy,
  BrainCircuit,
  Eye,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StoryState, LLMConfig } from '../types';
import { callLLM } from '../services/llmService';

interface ToolsPanelProps {
  story: StoryState;
  llmConfig: LLMConfig;
  onApplyChanges: (newContent: string) => void;
}

export default function ToolsPanel({ story, llmConfig, onApplyChanges }: ToolsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeTool, setActiveTool] = useState('describe');

  const handleAction = async (action: string, params: any = {}) => {
    setLoading(true);
    setResult('');
    
    try {
      let prompt = "";
      const bibleContext = story.bible.map(e => `${e.name} (${e.type}): ${e.description}`).join('\n');
      
      switch (action) {
        case 'describe':
          prompt = `You are a creative writing assistant. 
          Context from Story Bible:
          ${bibleContext}
          
          Current story content:
          ${story.content.slice(-1000)}
          
          Task: Provide a rich, sensory description for the following: "${params.text}". 
          Focus on sight, sound, smell, touch, and taste where appropriate. Keep it evocative and literary.`;
          break;
        case 'rewrite':
          prompt = `You are a creative writing assistant.
          Task: Rewrite the following text to be ${params.tone}.
          
          Text: "${params.text}"
          
          Provide only the rewritten text.`;
          break;
        case 'expand':
          prompt = `You are a creative writing assistant.
          Context from Story Bible:
          ${bibleContext}
          
          Current story content:
          ${story.content.slice(-2000)}
          
          Task: Continue the story from where it left off. Maintain the tone and style. Provide about 200-300 words.`;
          break;
        case 'brainstorm':
          prompt = `You are a creative writing assistant.
          Context from Story Bible:
          ${bibleContext}
          
          Current story content:
          ${story.content.slice(-1000)}
          
          Task: Brainstorm 5 unique and interesting plot twists or next steps for this story. Be creative and unexpected.`;
          break;
      }

      const response = await callLLM(prompt, llmConfig);
      setResult(response);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Tabs value={activeTool} onValueChange={setActiveTool} className="flex-1 flex flex-col">
        <div className="px-2 md:px-4 py-2 border-b border-gray-100">
          <TabsList className="grid grid-cols-4 w-full h-8 md:h-9 bg-gray-200/50">
            <TabsTrigger value="describe" className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-gray-700 data-[state=active]:text-accent">Describe</TabsTrigger>
            <TabsTrigger value="rewrite" className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-gray-700 data-[state=active]:text-accent">Rewrite</TabsTrigger>
            <TabsTrigger value="expand" className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-gray-700 data-[state=active]:text-accent">Expand</TabsTrigger>
            <TabsTrigger value="brain" className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-gray-700 data-[state=active]:text-accent">Ideas</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 md:p-4 space-y-4 md:space-y-6">
            <TabsContent value="describe" className="m-0 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Sensory Detail</label>
                <Textarea 
                  id="describe-input"
                  placeholder="e.g. 'the old library', 'a cold winter morning'..."
                  className="text-sm bg-gray-50 border-none resize-none"
                />
                <Button 
                  className="w-full gap-2 bg-accent hover:bg-accent/90" 
                  disabled={loading}
                  onClick={() => {
                    const input = document.getElementById('describe-input') as HTMLTextAreaElement;
                    handleAction('describe', { text: input.value });
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
                  Describe
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="rewrite" className="m-0 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Text to Rewrite</label>
                <Textarea 
                  id="rewrite-input"
                  placeholder="Paste text to transform..."
                  className="text-sm bg-gray-50 border-none h-24"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-[10px] uppercase" onClick={() => {
                    const input = document.getElementById('rewrite-input') as HTMLTextAreaElement;
                    handleAction('rewrite', { text: input.value, tone: 'more descriptive and flowery' });
                  }}>More Descriptive</Button>
                  <Button variant="outline" size="sm" className="text-[10px] uppercase" onClick={() => {
                    const input = document.getElementById('rewrite-input') as HTMLTextAreaElement;
                    handleAction('rewrite', { text: input.value, tone: 'darker and more suspenseful' });
                  }}>Darker</Button>
                  <Button variant="outline" size="sm" className="text-[10px] uppercase" onClick={() => {
                    const input = document.getElementById('rewrite-input') as HTMLTextAreaElement;
                    handleAction('rewrite', { text: input.value, tone: 'concise and punchy' });
                  }}>Concise</Button>
                  <Button variant="outline" size="sm" className="text-[10px] uppercase" onClick={() => {
                    const input = document.getElementById('rewrite-input') as HTMLTextAreaElement;
                    handleAction('rewrite', { text: input.value, tone: 'humorous and witty' });
                  }}>Humorous</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="expand" className="m-0 space-y-4">
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/10 space-y-3">
                <p className="text-xs text-muted leading-relaxed">
                  NovaScribe will analyze your story and bible to continue the narrative naturally.
                </p>
                <Button 
                  className="w-full gap-2 bg-accent hover:bg-accent/90"
                  disabled={loading}
                  onClick={() => handleAction('expand')}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                  Write Next Section
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="brain" className="m-0 space-y-4">
              <div className="space-y-4">
                <Button 
                  variant="outline"
                  className="w-full gap-2 border-accent/20 text-accent hover:bg-accent/5"
                  disabled={loading}
                  onClick={() => handleAction('brainstorm')}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                  Brainstorm Plot Ideas
                </Button>
              </div>
            </TabsContent>

            {/* Result Area */}
            {result && (
              <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-accent">AI Suggestion</label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      navigator.clipboard.writeText(result);
                    }}>
                      <Copy size={14} />
                    </Button>
                    {activeTool !== 'brain' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => {
                        onApplyChanges(story.content + "\n\n" + result);
                        setResult('');
                      }}>
                        <Check size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm font-serif text-sm leading-relaxed whitespace-pre-wrap">
                  {result}
                </div>
                {activeTool !== 'brain' && (
                  <p className="text-[10px] text-muted italic text-center">
                    Click the checkmark to append to your story.
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
