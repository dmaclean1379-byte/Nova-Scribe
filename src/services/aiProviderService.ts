import OpenAI from "openai";
import { Database } from "better-sqlite3";

export type AIProvider = "openrouter" | "nvidia" | "local" | "gemini";

export interface AIProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model: string;
}

export class AIProviderService {
  constructor(private db: Database) {
    // Ensure tables exist for context injection
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bible_entries (
        id TEXT PRIMARY KEY,
        story_id TEXT,
        name TEXT,
        type TEXT,
        description TEXT
      );
    `);
  }

  getClient(provider: AIProvider): OpenAI {
    // 1. Start with defaults/env
    let apiKey = (provider === 'gemini' ? process.env.GEMINI_API_KEY : 
                  provider === 'openrouter' ? process.env.OPENROUTER_API_KEY :
                  provider === 'nvidia' ? process.env.NVIDIA_API_KEY : undefined);
    
    let baseURL = (provider === 'gemini' ? "https://generativelanguage.googleapis.com/v1beta/openai/" :
                   provider === 'openrouter' ? "https://openrouter.ai/api/v1" :
                   provider === 'nvidia' ? "https://integrate.api.nvidia.com/v1" :
                   provider === 'local' ? (process.env.LOCAL_AI_BASE_URL || "http://localhost:11434/v1") : undefined);

    // 2. Override with config.json if exists
    try {
      const configPath = "./config.json";
      if (require('fs').existsSync(configPath)) {
        const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
        if (config.keys && config.keys[provider]) {
          apiKey = config.keys[provider];
        }
        if (config.baseUrls && config.baseUrls[provider]) {
          baseURL = config.baseUrls[provider];
        }
      }
    } catch (err) {
      console.warn("Could not read config.json for provider overrides", err);
    }

    if (!apiKey && provider !== 'local') {
      throw new Error(`API Key for provider '${provider}' is missing. Please set it in Settings.`);
    }

    return new OpenAI({
      apiKey: apiKey || "local",
      baseURL: baseURL,
      defaultHeaders: provider === 'openrouter' ? {
        "HTTP-Referer": "https://novascribe.ai",
        "X-Title": "NovaScribe Writer's IDE",
      } : undefined,
    });
  }

  // "Smart Context Injection" logic
  async getContext(storyId: string, currentText: string): Promise<string> {
    // Query local database for character/location names appearing in the text
    const entries = this.db.prepare("SELECT name, type, description FROM bible_entries WHERE story_id = ?").all(storyId) as any[];
    
    const relevantEntries = entries.filter(entry => 
      currentText.toLowerCase().includes(entry.name.toLowerCase())
    );

    if (relevantEntries.length === 0) return "";

    let context = "\n\nRelevant Context from Story Bible:\n";
    relevantEntries.forEach(entry => {
      context += `- ${entry.name} (${entry.type}): ${entry.description}\n`;
    });

    return context;
  }

  async *generateStream(
    provider: AIProvider,
    model: string,
    prompt: string,
    systemPrompt: string,
    storyId: string
  ) {
    try {
      const client = this.getClient(provider);
      
      // Inject context
      const bibleContext = await this.getContext(storyId, prompt);
      const fullSystemPrompt = systemPrompt + bibleContext;

      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: prompt },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) yield token;
      }
    } catch (err: any) {
      if (err.message.includes('ECONNREFUSED')) {
        yield `Error: The local AI server at ${process.env.LOCAL_AI_BASE_URL} is down. Please start Ollama or LM Studio.`;
      } else if (err.message.includes('API Key')) {
        yield `Error: Missing API Key for ${provider}. Please check your environment variables or platform settings.`;
      } else {
        yield `Error: ${err.message}`;
      }
    }
  }
}
