import { ScrollArea } from "@/components/ui/scroll-area";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function Editor({ content, onChange }: EditorProps) {
  return (
    <div className="h-full flex flex-col items-center bg-paper">
      <ScrollArea className="w-full max-w-3xl px-4 md:px-8 py-6 md:py-12 h-full">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start your story here..."
          className="w-full min-h-[calc(100vh-200px)] writing-editor bg-transparent border-none resize-none focus:ring-0 placeholder:text-gray-400 text-base md:text-lg"
          spellCheck={false}
        />
      </ScrollArea>
      
      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 px-4 md:px-6 py-2 md:py-2.5 bg-white/95 backdrop-blur-xl border border-gray-300 rounded-full shadow-xl flex items-center gap-3 md:gap-6 text-[9px] md:text-[10px] uppercase tracking-widest text-ink font-mono transition-all hover:shadow-2xl hover:border-accent/40 whitespace-nowrap">
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-accent font-bold">{content.split(/\s+/).filter(Boolean).length}</span>
          <span className="hidden sm:inline">words</span>
          <span className="sm:hidden">w</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-300" />
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-accent font-bold">{Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)}</span>
          <span className="hidden sm:inline">min read</span>
          <span className="sm:hidden">min</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-gray-300" />
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-accent font-bold">{content.length}</span>
          <span className="hidden sm:inline">chars</span>
          <span className="sm:hidden">c</span>
        </div>
      </div>
    </div>
  );
}
