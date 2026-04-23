import { useEffect, useState } from 'react';
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
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { LLMConfig, LLMProvider, ThemeConfig, ThemeMode } from '../types';
import { callLLM } from '../services/llmService';
import { Loader2, CheckCircle2, XCircle, Palette, Monitor, RefreshCw, Search } from 'lucide-react';

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

const COMMON_MODELS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite-preview-02-05', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  openrouter: [
    { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  ],
  nvidia: [
    { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' },
    { value: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
    { value: 'mistralai/mistral-large-2-instruct', label: 'Mistral Large 2' },
    { value: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B' },
  ],
  local: [
    { value: 'llama3:latest', label: 'Llama 3 8B' },
    { value: 'mistral:latest', label: 'Mistral 7B' },
    { value: 'phi3:latest', label: 'Phi 3' },
    { value: 'gemma2:9b', label: 'Gemma 2 9B' },
  ]
};

const THEME_COLORS = [
  { name: 'Amethyst', value: '#6d28d9' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Ruby', value: '#dc2626' },
  { name: 'Sapphire', value: '#2563eb' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Slate', value: '#475569' },
];

export default function SettingsDialog({ open, onOpenChange, config, onSave, theme, onThemeSave }: SettingsDialogProps) {
  const [tempConfig, setTempConfig] = useState<LLMConfig>(() => {
    // Ensure nested objects exist
    return {
      activeProvider: config.activeProvider || 'gemini',
      keys: config.keys || {},
      baseUrls: config.baseUrls || {},
      models: config.models || {},
    };
  });
  const [tempTheme, setTempTheme] = useState<ThemeConfig>(theme);
  const [activeTab, setActiveTab] = useState<'ai' | 'appearance'>('ai');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Record<string, { value: string; label: string }[]>>({});
  const [showCustomModelInput, setShowCustomModelInput] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage(null);
    try {
      const response = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: tempConfig.activeProvider,
          apiKey: tempConfig.keys[tempConfig.activeProvider],
          baseUrl: tempConfig.baseUrls[tempConfig.activeProvider],
          model: tempConfig.models[tempConfig.activeProvider]
        })
      });
      const data = await response.json();
      if (response.ok) {
        setTestResult('success');
        setTestMessage(data.message);
      } else {
        throw new Error(data.message || "Connection failed");
      }
    } catch (error: any) {
      console.error(error);
      setTestResult('error');
      setTestMessage(error.message || "An unknown error occurred");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    // 1. Update Frontend State
    onSave(tempConfig);
    onThemeSave(tempTheme);
    
    // 2. Persist to Backend config.json (Simulating Electron)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempConfig)
      });
    } catch (err) {
      console.error("Failed to save to config.json", err);
    }
    
    onOpenChange(false);
  };

  const updateProviderConfig = (provider: LLMProvider, field: 'keys' | 'baseUrls' | 'models', value: string) => {
    setTempConfig(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [provider]: value
      }
    }));
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    const provider = tempConfig.activeProvider;
    const apiKey = tempConfig.keys[provider];
    
    try {
      let endpoint = '';
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (provider === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/models';
      } else if (provider === 'local') {
        const baseUrl = tempConfig.baseUrls[provider] || 'http://localhost:11434/v1';
        // Note: browser might block this due to CORS if talking directly to localhost
        // For production Electron, it usually works or we proxy via main.py
        endpoint = `${baseUrl.replace('/v1', '')}/api/tags`;
      } else if (provider === 'nvidia') {
        endpoint = 'https://integrate.api.nvidia.com/v1/models';
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider === 'gemini') {
        // Gemini models are fairly static but could be fetched
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey || process.env.GEMINI_API_KEY}`;
      }

      if (!endpoint) return;

      const response = await fetch(endpoint, { headers });
      const data = await response.json();

      let modelsList: { value: string; label: string }[] = [];

      if (provider === 'openrouter') {
        modelsList = data.data.map((m: any) => ({ value: m.id, label: m.name || m.id }));
      } else if (provider === 'local') {
        modelsList = data.models.map((m: any) => ({ value: m.name, label: m.name }));
      } else if (provider === 'nvidia') {
        modelsList = data.data.map((m: any) => ({ value: m.id, label: m.id }));
      } else if (provider === 'gemini') {
        modelsList = data.models
          .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => ({ value: m.name.replace('models/', ''), label: m.displayName }));
      }

      setFetchedModels(prev => ({ ...prev, [provider]: modelsList }));
    } catch (err) {
      console.error("Failed to fetch models", err);
    } finally {
      setFetchingModels(false);
    }
  };

  const currentModels = [
    ...(COMMON_MODELS[tempConfig.activeProvider] || []),
    ...(fetchedModels[tempConfig.activeProvider] || [])
  ].filter((model, index, self) => 
    index === self.findIndex((m) => m.value === model.value)
  );

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
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Active Provider</label>
                <Select 
                  value={tempConfig.activeProvider} 
                  onValueChange={(val: LLMProvider) => setTempConfig({ ...tempConfig, activeProvider: val })}
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
                <div className="flex items-center justify-between">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Model Selection</label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] px-2 gap-1 text-accent font-bold"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                  >
                    {fetchingModels ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Refresh Models
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={tempConfig.models[tempConfig.activeProvider] || ''} 
                      onValueChange={(val: string) => {
                        if (val === 'custom') {
                          setShowCustomModelInput(true);
                        } else {
                          updateProviderConfig(tempConfig.activeProvider, 'models', val);
                          setShowCustomModelInput(false);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Recommended Models</SelectLabel>
                          {currentModels.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Custom</SelectLabel>
                          <SelectItem value="custom">Enter manually...</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {(showCustomModelInput || !currentModels.some(m => m.value === tempConfig.models[tempConfig.activeProvider])) && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <Input 
                      className="h-9"
                      placeholder="Enter custom model ID (e.g. gpt-4o)"
                      value={tempConfig.models[tempConfig.activeProvider] || ''}
                      onChange={(e) => updateProviderConfig(tempConfig.activeProvider, 'models', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {tempConfig.activeProvider !== 'gemini' && (
                <div className="grid gap-2">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">API Key</label>
                  <Input 
                    className="h-9"
                    type="password"
                    placeholder="Enter your API key"
                    value={tempConfig.keys[tempConfig.activeProvider] || ''}
                    onChange={(e) => updateProviderConfig(tempConfig.activeProvider, 'keys', e.target.value)}
                  />
                  <p className="text-[9px] text-muted italic">Stored in config.json on the server.</p>
                </div>
              )}

              {(tempConfig.activeProvider === 'local' || tempConfig.activeProvider === 'custom') && (
                <div className="grid gap-2">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-600">Base URL</label>
                  <Input 
                    className="h-9"
                    placeholder={tempConfig.activeProvider === 'local' ? 'http://localhost:11434/v1' : 'https://api.your-provider.com/v1'}
                    value={tempConfig.baseUrls[tempConfig.activeProvider] || ''}
                    onChange={(e) => updateProviderConfig(tempConfig.activeProvider, 'baseUrls', e.target.value)}
                  />
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
                  {testing ? <Loader2 className="animate-spin" size={16} /> : "Test " + tempConfig.activeProvider + " Connection"}
                  {testResult === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                  {testResult === 'error' && <XCircle size={16} className="text-red-500" />}
                </Button>
                {testMessage && (
                  <p className={`text-[10px] p-2 rounded border animate-in fade-in slide-in-from-top-1 ${testResult === 'success' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-500 bg-red-50 border-red-100'}`}>
                    {testMessage}
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
