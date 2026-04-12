import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { LLMConfig, LLMProvider } from '../types';
import { callLLM } from '../services/llmService';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: LLMConfig;
  onSave: (config: LLMConfig) => void;
}

const PROVIDERS: { value: LLMProvider; label: string; description: string }[] = [
  { value: 'gemini', label: 'Google Gemini', description: 'Fast and powerful (Default)' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Access any model (OpenAI, Claude, etc.)' },
  { value: 'nvidia', label: 'NVIDIA NIM', description: 'High-performance inference' },
  { value: 'local', label: 'Local (Ollama/LM Studio)', description: 'Run models on your own machine' },
  { value: 'custom', label: 'Custom OpenAI API', description: 'Any OpenAI-compatible endpoint' },
];

export default function SettingsDialog({ open, onOpenChange, config, onSave }: SettingsDialogProps) {
  const [tempConfig, setTempConfig] = useState<LLMConfig>(config);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await callLLM("Hello, are you working?", tempConfig);
      setTestResult('success');
    } catch (error) {
      console.error(error);
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(tempConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LLM Configuration</DialogTitle>
          <DialogDescription className="text-xs">
            Choose your preferred AI provider and model.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:gap-6 py-4">
          <div className="grid gap-2">
            <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Provider</label>
            <Select 
              value={tempConfig.provider} 
              onValueChange={(val: LLMProvider) => setTempConfig({ ...tempConfig, provider: val, model: val === 'gemini' ? 'gemini-2.0-flash' : '' })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{p.label}</span>
                      <span className="text-[9px] text-muted">{p.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Model Name</label>
            <Input 
              className="h-9"
              placeholder={tempConfig.provider === 'gemini' ? 'gemini-2.0-flash' : 'e.g. gpt-4o, llama3, etc.'}
              value={tempConfig.model}
              onChange={(e) => setTempConfig({ ...tempConfig, model: e.target.value })}
            />
          </div>

          {tempConfig.provider !== 'gemini' && (
            <div className="grid gap-2">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">API Key</label>
              <Input 
                className="h-9"
                type="password"
                placeholder="Enter your API key"
                value={tempConfig.apiKey || ''}
                onChange={(e) => setTempConfig({ ...tempConfig, apiKey: e.target.value })}
              />
              <p className="text-[9px] text-muted italic">Keys are stored locally in your browser.</p>
            </div>
          )}

          {(tempConfig.provider === 'local' || tempConfig.provider === 'custom') && (
            <div className="grid gap-2">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Base URL</label>
              <Input 
                className="h-9"
                placeholder={tempConfig.provider === 'local' ? 'http://localhost:11434/v1' : 'https://api.your-provider.com/v1'}
                value={tempConfig.baseUrl || ''}
                onChange={(e) => setTempConfig({ ...tempConfig, baseUrl: e.target.value })}
              />
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 h-9 text-[10px] uppercase tracking-wider"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? <Loader2 className="animate-spin" size={16} /> : "Test Connection"}
              {testResult === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
              {testResult === 'error' && <XCircle size={16} className="text-red-500" />}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
          <Button onClick={handleSave} size="sm" className="flex-1 sm:flex-none bg-accent hover:bg-accent/90">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
