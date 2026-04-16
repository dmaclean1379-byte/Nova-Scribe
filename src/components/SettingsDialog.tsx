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
import { LLMConfig, LLMProvider, ThemeConfig, ThemeMode } from '../types';
import { callLLM } from '../services/llmService';
import { Loader2, CheckCircle2, XCircle, Palette, Monitor } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: LLMConfig;
  onSave: (config: LLMConfig) => void;
  theme: ThemeConfig;
  onThemeSave: (theme: ThemeConfig) => void;
}

const PROVIDERS: { value: LLMProvider; label: string; description: string }[] = [
  { value: 'gemini', label: 'Google Gemini', description: 'Fast and powerful (Default)' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Access any model (OpenAI, Claude, etc.)' },
  { value: 'nvidia', label: 'NVIDIA NIM', description: 'High-performance inference' },
  { value: 'local', label: 'Local (Ollama/LM Studio)', description: 'Run models on your own machine' },
  { value: 'custom', label: 'Custom OpenAI API', description: 'Any OpenAI-compatible endpoint' },
];

const THEME_COLORS = [
  { name: 'Amethyst', value: '#6d28d9' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Ruby', value: '#dc2626' },
  { name: 'Sapphire', value: '#2563eb' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Slate', value: '#475569' },
];

export default function SettingsDialog({ open, onOpenChange, config, onSave, theme, onThemeSave }: SettingsDialogProps) {
  const [tempConfig, setTempConfig] = useState<LLMConfig>(config);
  const [tempTheme, setTempTheme] = useState<ThemeConfig>(theme);
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance'>('ai');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);
    try {
      await callLLM("Hello, are you working?", tempConfig);
      setTestResult('success');
    } catch (error: any) {
      console.error(error);
      setTestResult('error');
      setErrorMessage(error.message || "An unknown error occurred");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(tempConfig);
    onThemeSave(tempTheme);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto flex flex-col p-0 bg-paper shadow-2xl border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="text-xs">
            Configure your AI provider and application appearance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-gray-100 px-6">
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ai' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            AI Provider
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'appearance' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Appearance
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'ai' ? (
            <div className="grid gap-4 md:gap-6">
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
                  {tempConfig.provider === 'local' && (
                    <p className="text-[9px] text-amber-600 italic leading-tight">
                      Note: Browsers block HTTPS to HTTP requests. To use local AI, you may need to use a proxy or disable "Mixed Content" blocking in your browser.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
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
                {errorMessage && (
                  <p className="text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100 animate-in fade-in slide-in-from-top-1">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-2">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Theme Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'sepia'] as ThemeMode[]).map(mode => (
                    <Button
                      key={mode}
                      variant={tempTheme.mode === mode ? 'default' : 'outline'}
                      size="sm"
                      className={`capitalize h-12 flex flex-col gap-1 ${tempTheme.mode === mode ? 'bg-accent hover:bg-accent/90' : ''}`}
                      onClick={() => setTempTheme({ ...tempTheme, mode })}
                    >
                      <Monitor size={14} />
                      <span className="text-[10px]">{mode}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Accent Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setTempTheme({ ...tempTheme, primaryColor: color.value })}
                      className={`
                        flex items-center gap-2 p-2 rounded-lg border transition-all text-left
                        ${tempTheme.primaryColor === color.value 
                          ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                          : 'border-gray-100 hover:border-gray-200'}
                      `}
                    >
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color.value }} />
                      <span className="text-[10px] font-medium">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 flex-row gap-2 sm:gap-0 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">Cancel</Button>
          <Button onClick={handleSave} size="sm" className="flex-1 sm:flex-none bg-accent hover:bg-accent/90">Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
