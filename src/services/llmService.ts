import { GoogleGenAI } from "@google/genai";
import { LLMConfig } from "../types";

export async function callLLM(prompt: string, config: LLMConfig): Promise<string> {
  switch (config.provider) {
    case 'gemini':
      return callGemini(prompt, config);
    case 'openrouter':
      return callOpenAICompatible(prompt, config, "https://openrouter.ai/api/v1");
    case 'nvidia':
      return callOpenAICompatible(prompt, config, "https://integrate.api.nvidia.com/v1");
    case 'local':
      return callOpenAICompatible(prompt, config, config.baseUrl || "http://localhost:11434/v1");
    case 'custom':
      if (!config.baseUrl) throw new Error("Base URL is required for custom provider");
      return callOpenAICompatible(prompt, config, config.baseUrl);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

async function callGemini(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing. Please check your settings.");
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: config.model || "gemini-2.0-flash",
      contents: prompt
    });
    
    return response.text || "";
  } catch (error: any) {
    if (error.message?.includes('fetch')) {
      throw new Error("Failed to connect to Gemini API. Check your internet connection or API Key.");
    }
    throw error;
  }
}

async function callOpenAICompatible(prompt: string, config: LLMConfig, defaultBaseUrl: string): Promise<string> {
  const baseUrl = config.baseUrl || defaultBaseUrl;
  const apiKey = config.apiKey;
  
  if (!apiKey && config.provider !== 'local') {
    throw new Error(`${config.provider} API Key is missing`);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || 'no-key'}`,
        ...(config.provider === 'openrouter' ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'NovaScribe' } : {})
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        throw new Error("Failed to connect to local AI (Ollama/LM Studio). Ensure your local server is running and allows CORS. Note: Browsers block HTTPS to HTTP requests (Mixed Content).");
      }
      throw new Error(`Connection failed: Could not reach ${config.provider} at ${baseUrl}. Check your internet connection or API endpoint.`);
    }
    throw error;
  }
}
