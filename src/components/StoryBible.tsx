import { useState } from 'react';
import { Plus, Trash2, Search, User, MapPin, Box, ScrollText, Tag, BookOpen, ArrowLeft, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StoryBibleEntry, LLMConfig } from '../types';
import { generateImage } from '../services/llmService';

interface StoryBibleProps {
  entries: StoryBibleEntry[];
  onUpdate: (entries: StoryBibleEntry[]) => void;
  llmConfig: LLMConfig;
}

const ENTRY_TYPES = [
  { value: 'character', label: 'Character', icon: <User size={16} /> },
  { value: 'place', label: 'Place', icon: <MapPin size={16} /> },
  { value: 'object', label: 'Object', icon: <Box size={16} /> },
  { value: 'lore', label: 'Lore', icon: <ScrollText size={16} /> },
  { value: 'outline', label: 'Outline', icon: <Tag size={16} /> },
] as const;

export default function StoryBible({ entries, onUpdate, llmConfig }: StoryBibleProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | 'all'>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(entries[0]?.id || null);
  const [isVisualizing, setIsVisualizing] = useState(false);

  const filteredEntries = entries.filter(e => {
    const matchesSearch = 
      e.name.toLowerCase().includes(search.toLowerCase()) || 
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.type.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    
    const matchesType = filterType === 'all' || e.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  const addEntry = (type: StoryBibleEntry['type']) => {
    const newEntry: StoryBibleEntry = {
      id: crypto.randomUUID(),
      type,
      name: `New ${type}`,
      description: '',
      tags: []
    };
    onUpdate([...entries, newEntry]);
    setSelectedEntryId(newEntry.id);
  };

  const updateEntry = (id: string, updates: Partial<StoryBibleEntry>) => {
    onUpdate(entries.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEntry = (id: string) => {
    onUpdate(entries.filter(e => e.id !== id));
    if (selectedEntryId === id) setSelectedEntryId(null);
  };

  const visualizeEntry = async () => {
    if (!selectedEntry) return;
    setIsVisualizing(true);

    try {
      const prompt = `A highly detailed, professional digital illustration for a ${selectedEntry.type} named "${selectedEntry.name}" in a creative writing story.
Description: ${selectedEntry.description}
Tags: ${selectedEntry.tags.join(', ')}
Art style: Epic fantasy, cinematic lighting, sharp focus.`;

      const imageUrl = await generateImage(prompt, llmConfig);
      updateEntry(selectedEntry.id, { imageUrl });
    } catch (error) {
      console.error("Visualization failed:", error);
      alert("Failed to generate image. Please check your API key and connection.");
    } finally {
      setIsVisualizing(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-paper relative min-h-0">
      {/* List Panel */}
      <div className={`
        w-full md:w-85 border-r border-border flex flex-col bg-secondary h-full min-h-0
        ${selectedEntryId && window.innerWidth < 768 ? 'hidden' : 'flex'}
      `}>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-accent transition-colors" />
              <Input 
                placeholder="Search name, notes, tags..." 
                className="pl-9 pr-8 bg-paper border-none h-10 text-sm shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
                >
                  <Plus size={14} className="rotate-45" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categories</label>
              {filterType !== 'all' && (
                <button 
                  onClick={() => setFilterType('all')}
                  className="text-[9px] font-bold text-accent uppercase tracking-wider hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ENTRY_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all
                    ${filterType === type.value 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'bg-paper text-muted-foreground hover:text-accent border border-transparent hover:border-accent/10'}
                  `}
                >
                  <span className={filterType === type.value ? 'text-white' : 'text-accent'}>
                    {type.icon}
                  </span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <div className="grid grid-cols-5 gap-1.5">
              {ENTRY_TYPES.map(type => (
                <Button 
                  key={type.value}
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-full bg-paper border-none shadow-sm hover:bg-accent/5 hover:text-accent"
                  onClick={() => addEntry(type.value)}
                  title={`Add ${type.label}`}
                >
                  <Plus size={12} className="absolute -top-0.5 -right-0.5 text-accent opacity-50" />
                  {type.icon}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 border-t border-border/50">
          <div className="p-3 space-y-1.5 touch-pan-y">
            {filteredEntries.length > 0 ? filteredEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntryId(entry.id)}
                className={`
                  w-full text-left p-3 rounded-lg transition-all group
                  ${selectedEntryId === entry.id 
                    ? 'bg-accent/10 border-accent/20 border' 
                    : 'hover:bg-paper border-transparent border'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">
                      {ENTRY_TYPES.find(t => t.value === entry.type)?.icon}
                    </span>
                    <span className={`font-medium text-sm ${selectedEntryId === entry.id ? 'text-accent' : ''}`}>
                      {entry.name || 'Untitled'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                  {entry.description || 'No description...'}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[8px] font-bold uppercase tracking-widest bg-accent/5 text-accent/60 px-1 py-0.5 rounded-sm">
                        {tag}
                      </span>
                    ))}
                    {entry.tags.length > 3 && <span className="text-[8px] text-muted-foreground">+ {entry.tags.length - 3}</span>}
                  </div>
                )}
              </button>
            )) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground opacity-50 space-y-3">
                <Search size={32} strokeWidth={1} />
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-widest leading-tight">No matches found</p>
                  <p className="text-[9px] leading-relaxed">Try adjusting your search or category filters.</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      <div className={`
        flex-1 p-4 md:p-8 overflow-y-auto h-full
        ${!selectedEntryId && window.innerWidth < 768 ? 'hidden' : 'block'}
      `}>
        {selectedEntry ? (
          <Card className="max-w-3xl mx-auto border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 md:pb-7">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden h-8 w-8" 
                  onClick={() => setSelectedEntryId(null)}
                >
                  <ArrowLeft size={18} />
                </Button>
                <div className="space-y-1">
                  <CardTitle className="text-xl md:text-2xl font-serif">
                    <input 
                      value={selectedEntry.name}
                      onChange={(e) => updateEntry(selectedEntry.id, { name: e.target.value })}
                      className="bg-transparent border-none focus:outline-none w-full"
                      placeholder="Entry Name"
                    />
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                      {selectedEntry.type}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                onClick={() => deleteEntry(selectedEntry.id)}
              >
                <Trash2 size={18} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              {/* Visualization Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                    <ImageIcon size={14} className="text-accent" />
                    Visualization
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent hover:bg-accent/5 gap-1.5"
                    onClick={visualizeEntry}
                    disabled={isVisualizing || !selectedEntry.description}
                  >
                    {isVisualizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {selectedEntry.imageUrl ? "Re-Imagine" : "Imagine"}
                  </Button>
                </div>
                
                <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary/50 border border-border/50 group">
                  {selectedEntry.imageUrl ? (
                    <img 
                      src={selectedEntry.imageUrl} 
                      alt={selectedEntry.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-40 space-y-2">
                      <ImageIcon size={32} strokeWidth={1} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No visualization yet</p>
                    </div>
                  )}
                  
                  {isVisualizing && (
                    <div className="absolute inset-0 bg-paper/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 z-10 transition-all">
                      <div className="relative">
                        <Loader2 size={40} className="text-accent animate-spin" />
                        <Sparkles size={16} className="absolute -top-1 -right-1 text-accent animate-pulse" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-accent animate-pulse">Manifesting...</p>
                        <p className="text-[10px] text-muted-foreground">Consulting the creative ether</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Description & Notes</label>
                <Textarea 
                  value={selectedEntry.description}
                  onChange={(e) => updateEntry(selectedEntry.id, { description: e.target.value })}
                  placeholder="Describe this character, place, or concept..."
                  className="min-h-[200px] md:min-h-[300px] font-serif text-sm md:text-base leading-relaxed bg-gray-50/50 border-none resize-none focus-visible:ring-1 focus-visible:ring-accent/20"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="gap-1 px-2 py-1">
                      {tag}
                      <button onClick={() => {
                        const newTags = [...selectedEntry.tags];
                        newTags.splice(i, 1);
                        updateEntry(selectedEntry.id, { tags: newTags });
                      }}>
                        <Plus size={10} className="rotate-45" />
                      </button>
                    </Badge>
                  ))}
                  <Input 
                    placeholder="Add tag..." 
                    className="w-24 h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !selectedEntry.tags.includes(val)) {
                          updateEntry(selectedEntry.id, { tags: [...selectedEntry.tags, val] });
                          e.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
            <div className="p-6 rounded-full bg-secondary">
              <BookOpen size={48} strokeWidth={1} />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-ink">Select an entry</h3>
              <p className="text-sm">Or create a new one using the icons on the left.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
