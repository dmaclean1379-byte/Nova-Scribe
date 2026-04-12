import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Settings, 
  Sparkles, 
  PenTool, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  Save,
  Library,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { StoryState, LLMConfig } from './types';
import Editor from './components/Editor';
import StoryBible from './components/StoryBible';
import ToolsPanel from './components/ToolsPanel';
import SettingsDialog from './components/SettingsDialog';
import LibraryDialog from './components/LibraryDialog';

const createNewStory = (): StoryState => ({
  id: crypto.randomUUID(),
  title: "Untitled Story",
  content: "",
  bible: [],
  lastModified: Date.now()
});

const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  model: 'gemini-3-flash-preview',
};

export default function App() {
  const [stories, setStories] = useState<StoryState[]>(() => {
    const saved = localStorage.getItem('novascribe_stories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse stories", e);
      }
    }
    return [createNewStory()];
  });

  const [currentStoryId, setCurrentStoryId] = useState<string>(() => {
    const saved = localStorage.getItem('novascribe_current_id');
    return saved || (stories.length > 0 ? stories[0].id : "");
  });

  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('novascribe_llm_config');
    return saved ? JSON.parse(saved) : DEFAULT_LLM_CONFIG;
  });

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(window.innerWidth > 768);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(window.innerWidth > 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'bible'>('editor');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const currentStory = stories.find(s => s.id === currentStoryId) || stories[0];

  useEffect(() => {
    localStorage.setItem('novascribe_stories', JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    localStorage.setItem('novascribe_current_id', currentStoryId);
  }, [currentStoryId]);

  useEffect(() => {
    localStorage.setItem('novascribe_llm_config', JSON.stringify(llmConfig));
  }, [llmConfig]);

  const updateStory = (updates: Partial<StoryState>) => {
    setStories(prev => prev.map(s => 
      s.id === currentStoryId 
        ? { ...s, ...updates, lastModified: Date.now() } 
        : s
    ));
  };

  const handleNewStory = () => {
    const newStory = createNewStory();
    setStories(prev => [...prev, newStory]);
    setCurrentStoryId(newStory.id);
    setLibraryOpen(false);
    setActiveTab('editor');
  };

  const handleDeleteStory = (id: string) => {
    if (stories.length <= 1) return;
    const newStories = stories.filter(s => s.id !== id);
    setStories(newStories);
    if (currentStoryId === id) {
      setCurrentStoryId(newStories[0].id);
    }
  };

  const handleImportStory = (story: StoryState) => {
    const newStory = { ...story, id: crypto.randomUUID(), lastModified: Date.now() };
    setStories(prev => [...prev, newStory]);
    setCurrentStoryId(newStory.id);
    setLibraryOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-paper overflow-hidden text-ink relative">
        {/* Mobile Overlay for Sidebars */}
        <AnimatePresence>
          {(mobileMenuOpen || mobileToolsOpen) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileToolsOpen(false);
              }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar - Navigation & Bible Quick Access */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: leftSidebarOpen ? 280 : 64,
            x: mobileMenuOpen ? 0 : (window.innerWidth < 768 ? -280 : 0)
          }}
          className={`
            fixed md:relative h-full border-r border-gray-200 bg-white/95 backdrop-blur-md flex flex-col z-50 transition-all
            ${mobileMenuOpen ? 'shadow-2xl' : ''}
          `}
        >
          <div className="p-4 flex items-center justify-between">
            {(leftSidebarOpen || mobileMenuOpen) && (
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-serif font-bold text-xl tracking-tight text-accent-foreground"
              >
                NovaScribe
              </motion.h1>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileMenuOpen(false);
                } else {
                  setLeftSidebarOpen(!leftSidebarOpen);
                }
              }}
              className="text-muted hover:text-accent"
            >
              {window.innerWidth < 768 ? <X size={18} /> : (leftSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />)}
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 space-y-1">
              <SidebarItem 
                icon={<PenTool size={20} />} 
                label="Editor" 
                active={activeTab === 'editor'} 
                collapsed={!leftSidebarOpen && !mobileMenuOpen}
                onClick={() => {
                  setActiveTab('editor');
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem 
                icon={<BookOpen size={20} />} 
                label="Story Bible" 
                active={activeTab === 'bible'} 
                collapsed={!leftSidebarOpen && !mobileMenuOpen}
                onClick={() => {
                  setActiveTab('bible');
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem 
                icon={<Library size={20} />} 
                label="Library" 
                collapsed={!leftSidebarOpen && !mobileMenuOpen}
                onClick={() => {
                  setLibraryOpen(true);
                  setMobileMenuOpen(false);
                }}
              />
            </div>

            {(leftSidebarOpen || mobileMenuOpen) && currentStory && (
              <div className="mt-8 px-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Recent Bible Entries</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    setActiveTab('bible');
                    setMobileMenuOpen(false);
                  }}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="space-y-1">
                  {currentStory.bible.slice(0, 5).map(entry => (
                    <button 
                      key={entry.id}
                      onClick={() => {
                        setActiveTab('bible');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 transition-colors flex items-center gap-2 group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/40 group-hover:bg-accent" />
                      <span className="truncate">{entry.name}</span>
                    </button>
                  ))}
                  {currentStory.bible.length === 0 && (
                    <p className="text-xs text-muted italic px-2">No entries yet.</p>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t border-gray-100">
            <SidebarItem 
              icon={<Settings size={20} />} 
              label="Settings" 
              collapsed={!leftSidebarOpen && !mobileMenuOpen}
              onClick={() => {
                setSettingsOpen(true);
                setMobileMenuOpen(false);
              }}
            />
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden w-full">
          <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 md:px-6 bg-white/30 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 md:gap-4 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </Button>
              <input 
                type="text" 
                value={currentStory?.title || ""}
                onChange={(e) => updateStory({ title: e.target.value })}
                className="bg-transparent border-none font-serif text-base md:text-lg font-medium focus:outline-none w-full max-w-[150px] md:max-w-64 truncate"
              />
              <Badge variant="outline" className="hidden sm:flex font-mono text-[10px] uppercase tracking-widest text-muted truncate max-w-[100px] md:max-w-none">
                {llmConfig.provider}: {llmConfig.model}
              </Badge>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Save size={14} className="text-muted" />
                <span className="text-[10px] text-muted uppercase tracking-widest">Saved</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden text-accent"
                onClick={() => setMobileToolsOpen(true)}
              >
                <Sparkles size={20} />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === 'editor' ? (
                <motion.div 
                  key="editor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  <Editor 
                    content={currentStory?.content || ""} 
                    onChange={(content) => updateStory({ content })} 
                  />
                </motion.div>
              ) : (
                <motion.div 
                  key="bible"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  <StoryBible 
                    entries={currentStory?.bible || []} 
                    onUpdate={(bible) => updateStory({ bible })} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Sidebar - AI Tools */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: rightSidebarOpen ? 320 : 0,
            x: mobileToolsOpen ? 0 : (window.innerWidth < 1024 ? 320 : 0)
          }}
          className={`
            fixed md:relative right-0 h-full border-l border-gray-200 bg-white/95 backdrop-blur-md flex flex-col z-50 transition-all
            ${mobileToolsOpen ? 'shadow-2xl' : ''}
          `}
        >
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className={`hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow-sm z-30 transition-transform ${!rightSidebarOpen ? 'rotate-180' : ''}`}
          >
            <ChevronRight size={14} />
          </Button>

          {(rightSidebarOpen || mobileToolsOpen) && (
            <div className="h-full flex flex-col overflow-hidden w-[320px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-accent" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider">AI Writing Tools</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  onClick={() => setMobileToolsOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>
              {currentStory && (
                <ToolsPanel 
                  story={currentStory} 
                  llmConfig={llmConfig} 
                  onApplyChanges={(newContent) => {
                    updateStory({ content: newContent });
                    if (window.innerWidth < 1024) setMobileToolsOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </motion.aside>

        <SettingsDialog 
          open={settingsOpen} 
          onOpenChange={setSettingsOpen} 
          config={llmConfig} 
          onSave={setLlmConfig} 
        />

        <LibraryDialog 
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          stories={stories}
          currentStoryId={currentStoryId}
          onSelect={setCurrentStoryId}
          onDelete={handleDeleteStory}
          onNew={handleNewStory}
          onImport={handleImportStory}
        />
      </div>
    </TooltipProvider>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  active = false, 
  collapsed = false, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
        ${active 
          ? 'bg-accent/10 text-accent font-bold shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-ink'}
      `}
    >
      <div className={active ? 'text-accent' : 'text-gray-500'}>
        {icon}
      </div>
      {!collapsed && (
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm"
        >
          {label}
        </motion.span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
