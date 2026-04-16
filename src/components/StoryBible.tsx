import { useState } from 'react';
import { Plus, Trash2, Search, User, MapPin, Box, ScrollText, Tag, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StoryBibleEntry } from '../types';

interface StoryBibleProps {
  entries: StoryBibleEntry[];
  onUpdate: (entries: StoryBibleEntry[]) => void;
}

const ENTRY_TYPES = [
  { value: 'character', label: 'Character', icon: <User size={16} /> },
  { value: 'place', label: 'Place', icon: <MapPin size={16} /> },
  { value: 'object', label: 'Object', icon: <Box size={16} /> },
  { value: 'lore', label: 'Lore', icon: <ScrollText size={16} /> },
  { value: 'outline', label: 'Outline', icon: <Tag size={16} /> },
] as const;

export default function StoryBible({ entries, onUpdate }: StoryBibleProps) {
  const [search, setSearch] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(entries[0]?.id || null);

  const filteredEntries = entries.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.description.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="h-full flex flex-col md:flex-row bg-paper relative min-h-0">
      {/* List Panel */}
      <div className={`
        w-full md:w-80 border-r border-border flex flex-col bg-secondary h-full min-h-0
        ${selectedEntryId && window.innerWidth < 768 ? 'hidden' : 'flex'}
      `}>
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
            <Input 
              placeholder="Search project bible..." 
              className="pl-9 bg-paper border-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {ENTRY_TYPES.map(type => (
              <Button 
                key={type.value}
                variant="outline" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => addEntry(type.value)}
                title={`Add ${type.label}`}
              >
                {type.icon}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1 touch-pan-y">
            {filteredEntries.map(entry => (
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
                <p className="text-xs text-muted line-clamp-1">
                  {entry.description || 'No description...'}
                </p>
              </button>
            ))}
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
