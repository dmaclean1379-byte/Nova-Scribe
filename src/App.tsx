import React, { useState, useEffect, useRef } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { StoryState, LLMConfig, ThemeConfig, ThemeMode } from './types';
import { storage } from './lib/storage';
import { syncService } from './services/syncService';
import { useSyncStatus } from './hooks/useSyncStatus';
import Editor from './components/Editor';
import StoryBible from './components/StoryBible';
import ToolsPanel from './components/ToolsPanel';
import SettingsDialog from './components/SettingsDialog';
import LibraryDialog from './components/LibraryDialog';
import WorldBuilder from './components/WorldBuilder';

const createNewStory = (): StoryState => ({
  id: crypto.randomUUID(),
  title: "Untitled Story",
  content: "",
  bible: [],
  lastModified: Date.now(),
  isSetup: true
});

const DEFAULT_LLM_CONFIG: LLMConfig = {
  activeProvider: 'gemini',
  keys: {},
  baseUrls: {
    local: "http://localhost:11434/v1",
    openrouter: "https://openrouter.ai/api/v1",
    nvidia: "https://integrate.api.nvidia.com/v1"
  },
  models: {
    gemini: 'gemini-2.0-flash'
  }
};

const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  primaryColor: '#6d28d9',
};

export default function App() {
  const [stories, setStories] = useState<StoryState[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string>("");
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(DEFAULT_LLM_CONFIG);
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [isInitializing, setIsInitializing] = useState(true);
  const storiesRef = useRef<StoryState[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

  // Initial load from IndexedDB
  useEffect(() => {
    const initStorage = async () => {
      // First, try to migrate from localStorage if this is a first-time use of IDB
      const migrated = await storage.migrateFromLocalStorage();
      
      const savedStories = await storage.getAllStories();
      const savedCurrentId = await storage.getConfig<string>('current_story_id');
      const savedLlmConfig = await storage.getConfig<LLMConfig>('llm_config');
      const savedTheme = await storage.getConfig<ThemeConfig>('theme_config');

      // Also try to load from config.json (Electron style)
      let cloudConfig = null;
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          cloudConfig = await response.json();
        }
      } catch (err) {
        console.warn("Could not load config.json", err);
      }

      let currentStories = savedStories;
      if (savedStories.length === 0) {
        const initialStory = createNewStory();
        currentStories = [initialStory];
      }
      
      setStories(currentStories);
      setCurrentStoryId(savedCurrentId || currentStories[0].id);

      if (cloudConfig && Object.keys(cloudConfig).length > 0) {
        setLlmConfig(cloudConfig);
      } else if (savedLlmConfig) {
        setLlmConfig(savedLlmConfig);
      }
      
      if (savedTheme) setTheme(savedTheme);
      
      setIsInitializing(false);

      // Start Auto-Sync
      syncService.startAutoSync(
        () => storiesRef.current,
        (synced) => {
          setStories(prev => prev.map(p => synced.find(s => s.id === p.id) || p));
        }
      );
    };

    initStorage();
    return () => syncService.stopAutoSync();
  }, []);

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'bible'>('editor');
  const [isLargeScreen, setIsLargeScreen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
      if (window.innerWidth < 768) {
        setLeftSidebarOpen(false);
      }
      if (window.innerWidth < 1024) {
        setRightSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAutoSaving(true);
      setLastSaved(new Date());
      // The actual data is already persisted via the stories useEffect,
      // but we use this interval to provide the requested auto-save behavior/feedback
      setTimeout(() => setIsAutoSaving(false), 3000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const currentStory = stories.find(s => s.id === currentStoryId) || stories[0];

  useEffect(() => {
    if (isInitializing) return;
    storage.saveAllStories(stories);
  }, [stories, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    storage.saveConfig('current_story_id', currentStoryId);
  }, [currentStoryId, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    storage.saveConfig('llm_config', llmConfig);
  }, [llmConfig, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    storage.saveConfig('theme_config', theme);
    
    // Apply theme to document root
    const root = document.documentElement;
    const colors: Record<ThemeMode, Record<string, string>> = {
      light: {
        '--bg-paper': '#fdfcfb',
        '--text-ink': '#1a1a1a',
        '--text-muted': '#374151',
        '--bg-secondary': '#f3f4f6',
        '--border-color': '#e5e7eb',
        '--primary-foreground': '#ffffff',
      },
      dark: {
        '--bg-paper': '#121212',
        '--text-ink': '#e5e7eb',
        '--text-muted': '#d1d5db',
        '--bg-secondary': '#1f1f1f',
        '--border-color': '#2d2d2d',
        '--primary-foreground': '#ffffff',
      },
      sepia: {
        '--bg-paper': '#f4ecd8',
        '--text-ink': '#433422',
        '--text-muted': '#5d4a36',
        '--bg-secondary': '#e8dfc4',
        '--border-color': '#d3c5a3',
        '--primary-foreground': '#ffffff',
      }
    };

    const currentColors = colors[theme.mode];
    Object.entries(currentColors).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
    root.style.setProperty('--primary-accent', theme.primaryColor);
    
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const updateStory = (updates: Partial<StoryState>) => {
    setStories(prev => prev.map(s => 
      s.id === currentStoryId 
        ? { ...s, ...updates, lastModified: Date.now(), isDirty: true } 
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

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-paper text-accent">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={48} />
          </motion.div>
          <p className="font-serif italic text-lg opacity-80">Opening your archives...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] w-full bg-paper overflow-hidden text-ink relative">
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
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Left Sidebar - Navigation & Bible Quick Access */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: (typeof window !== 'undefined' && window.innerWidth < 768) ? 280 : (leftSidebarOpen ? 280 : 64),
            x: (typeof window !== 'undefined' && window.innerWidth < 768) 
              ? (mobileMenuOpen ? 0 : -280) 
              : 0
          }}
          className={`
            fixed md:relative h-full border-r border-border bg-paper flex flex-col z-50 transition-all
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

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 space-y-1 touch-pan-y">
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
                label="Project Bible" 
                active={activeTab === 'bible'} 
                collapsed={!leftSidebarOpen && !mobileMenuOpen}
                onClick={() => {
                  setActiveTab('bible');
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem 
                icon={<Sparkles size={20} />} 
                label="Genesis Chamber" 
                active={currentStory?.isSetup} 
                collapsed={!leftSidebarOpen && !mobileMenuOpen}
                onClick={() => {
                  updateStory({ isSetup: true });
                  setMobileMenuOpen(false);
                }}
              />
              <SidebarItem 
                icon={<Library size={20} />} 
                label="Manage Projects" 
                collapsed={!leftSidebarOpen && !mobileMenuOpen}
                onClick={() => {
                  setLibraryOpen(true);
                  setMobileMenuOpen(false);
                }}
              />
            </div>

            {(leftSidebarOpen || mobileMenuOpen) && (
              <div className="mt-8 px-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Your Projects</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNewStory}>
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                  {stories.map(story => (
                    <button 
                      key={story.id}
                      onClick={() => {
                        setCurrentStoryId(story.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 group ${story.id === currentStoryId ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-secondary text-muted'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${story.id === currentStoryId ? 'bg-accent' : 'bg-muted/40 group-hover:bg-muted'}`} />
                      <span className="truncate">{story.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(leftSidebarOpen || mobileMenuOpen) && currentStory && (
              <div className="mt-8 px-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Recent Bible Entries</h3>
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
                      className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-secondary transition-colors flex items-center gap-2 group"
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
        <main className="flex-1 flex flex-col relative overflow-hidden w-full min-h-0">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-secondary z-10">
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
                className="bg-transparent border-none font-serif text-base md:text-lg font-medium focus:outline-none w-full max-w-[200px] md:max-w-80 truncate"
                placeholder="Project Title"
              />
              <Badge variant="outline" className="hidden sm:flex font-mono text-[10px] uppercase tracking-widest text-muted truncate max-w-[100px] md:max-w-none">
                {llmConfig.provider}: {llmConfig.model}
              </Badge>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <div className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-full bg-secondary/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <Save size={12} className={isAutoSaving ? "text-accent animate-pulse" : "text-muted"} />
                  <span className="text-[9px] text-muted uppercase tracking-widest font-medium">
                    {isAutoSaving ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
                  </span>
                </div>
                
                <Separator orientation="vertical" className="h-3 mx-1" />
                
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'online' ? 'bg-green-500' : 
                    syncStatus === 'syncing' ? 'bg-accent animate-pulse' : 
                    syncStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-[9px] text-muted uppercase tracking-widest font-medium">
                    {syncStatus}
                  </span>
                </div>
              </div>
              
              {!currentStory?.isSetup && (
                <>
                  <Tooltip>
                    <TooltipTrigger render={
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted hover:text-accent"
                        onClick={() => {
                          setIsAutoSaving(true);
                          setLastSaved(new Date());
                          setTimeout(() => setIsAutoSaving(false), 1000);
                        }}
                      >
                        <Save size={18} />
                      </Button>
                    } />
                    <TooltipContent>Save Project</TooltipContent>
                  </Tooltip>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-accent"
                    onClick={() => {
                      if (isLargeScreen) {
                        setRightSidebarOpen(!rightSidebarOpen);
                      } else {
                        setMobileToolsOpen(true);
                      }
                    }}
                  >
                    <Sparkles size={20} />
                  </Button>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative min-h-0">
            <AnimatePresence mode="wait">
              {currentStory?.isSetup ? (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <WorldBuilder 
                    story={currentStory} 
                    llmConfig={llmConfig}
                    onUpdate={updateStory}
                    onComplete={() => updateStory({ isSetup: false })}
                  />
                </motion.div>
              ) : activeTab === 'editor' ? (
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
                    llmConfig={llmConfig}
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
                    llmConfig={llmConfig}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Sidebar - AI Tools */}
        {!currentStory?.isSetup && (
          <motion.aside 
            initial={false}
            animate={{ 
              width: isLargeScreen ? (rightSidebarOpen ? 320 : 0) : (mobileToolsOpen ? 320 : 0),
              x: isLargeScreen ? 0 : (mobileToolsOpen ? 0 : 320)
            }}
            className={`
              fixed lg:relative right-0 h-full border-l border-border bg-secondary flex flex-col z-50 transition-all
              ${!isLargeScreen && mobileToolsOpen ? 'shadow-2xl' : ''}
              ${isLargeScreen && !rightSidebarOpen ? 'border-none' : ''}
            `}
          >
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className={`hidden lg:flex absolute -left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow-sm z-30 transition-transform ${!rightSidebarOpen ? 'rotate-180' : ''}`}
            >
              <ChevronRight size={14} />
            </Button>
  
            {(rightSidebarOpen || (!isLargeScreen && mobileToolsOpen)) && (
              <div className="h-full flex flex-col overflow-hidden w-[320px] min-h-0">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-accent" />
                    <h2 className="font-semibold text-sm uppercase tracking-wider">AI Writing Tools</h2>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden"
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
                      if (!isLargeScreen) setMobileToolsOpen(false);
                    }}
                  />
                )}
              </div>
            )}
          </motion.aside>
        )}

        <SettingsDialog 
          open={settingsOpen} 
          onOpenChange={setSettingsOpen} 
          config={llmConfig} 
          onSave={setLlmConfig} 
          theme={theme}
          onThemeSave={setTheme}
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
  const innerContent = (
    <>
      <div className={active ? 'text-accent' : 'text-muted'}>
        {icon}
      </div>
      {!collapsed && (
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium"
        >
          {label}
        </motion.span>
      )}
    </>
  );

  const className = `
    w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
    ${active 
      ? 'bg-accent/10 text-accent font-bold shadow-sm' 
      : 'text-muted hover:bg-secondary hover:text-ink'}
  `;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger 
          onClick={onClick}
          className={className}
        >
          {innerContent}
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={className}
    >
      {innerContent}
    </button>
  );
}
