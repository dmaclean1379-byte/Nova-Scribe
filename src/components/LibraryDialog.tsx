import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StoryState } from '../types';
import { Plus, Trash2, FileJson, FileText, Download, Upload, Clock } from 'lucide-react';

interface LibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: StoryState[];
  currentStoryId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onImport: (story: StoryState) => void;
}

export default function LibraryDialog({ 
  open, 
  onOpenChange, 
  stories, 
  currentStoryId, 
  onSelect, 
  onDelete, 
  onNew,
  onImport
}: LibraryDialogProps) {
  
  const handleExport = (story: StoryState) => {
    const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportText = (story: StoryState) => {
    const blob = new Blob([story.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const story = JSON.parse(event.target?.result as string) as StoryState;
        if (story.id && story.title && Array.isArray(story.bible)) {
          onImport(story);
        } else {
          alert("Invalid story file format.");
        }
      } catch (err) {
        alert("Failed to parse story file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] w-[95vw] flex flex-col p-4 md:p-6">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle>Story Library</DialogTitle>
              <DialogDescription className="text-xs">
                Manage your creative projects and exports.
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2 relative h-8 text-[10px] uppercase tracking-wider">
                <Upload size={14} />
                Import
                <input 
                  type="file" 
                  accept=".json" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                />
              </Button>
              <Button size="sm" className="flex-1 sm:flex-none gap-2 bg-accent hover:bg-accent/90 h-8 text-[10px] uppercase tracking-wider" onClick={onNew}>
                <Plus size={14} />
                New Story
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4 pr-0 md:pr-4">
          <div className="space-y-3">
            {stories.sort((a, b) => b.lastModified - a.lastModified).map(story => (
              <div 
                key={story.id}
                className={`
                  p-3 md:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between group gap-3
                  ${story.id === currentStoryId 
                    ? 'bg-accent/5 border-accent/20 ring-1 ring-accent/20' 
                    : 'bg-white border-gray-100 hover:border-gray-200'}
                `}
              >
                <div 
                  className="flex-1 cursor-pointer" 
                  onClick={() => {
                    onSelect(story.id);
                    onOpenChange(false);
                  }}
                >
                  <h4 className="font-serif font-medium text-base md:text-lg truncate">{story.title}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[9px] md:text-[10px] text-muted uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(story.lastModified).toLocaleDateString()}
                    </span>
                    <span>{story.content.split(/\s+/).filter(Boolean).length} words</span>
                    <span>{story.bible.length} entries</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExport(story)} title="Export JSON">
                    <FileJson size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportText(story)} title="Export Text">
                    <FileText size={14} />
                  </Button>
                  <Separator orientation="vertical" className="hidden sm:block h-4 mx-1" />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onDelete(story.id)}
                    disabled={stories.length <= 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[10px] text-muted italic w-full text-center">
            All stories are stored locally in your browser's database.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
