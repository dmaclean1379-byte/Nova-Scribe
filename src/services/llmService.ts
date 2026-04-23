import { GoogleGenAI } from "@google/genai";
import { LLMConfig } from "../types";

export async function* streamLLM(
  prompt: string, 
  config: LLMConfig, 
  storyId: string,
  systemPrompt?: string
): AsyncGenerator<string> {
  const provider = config.activeProvider;
  const model = config.models[provider] || (provider === 'gemini' ? 'gemini-2.0-flash' : '');
  
  const params = new URLSearchParams({
    provider: provider,
    model: model,
    prompt: prompt,
    storyId: storyId,
    systemPrompt: systemPrompt || "You are a creative writing assistant."
  });

  const response = await fetch(`/api/generate?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to connect to AI service" }));
    throw new Error(error.error || "Generation failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Could not read response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const { token } = JSON.parse(data);
          if (token) yield token;
        } catch (e) {
          console.error("Error parsing stream chunk", e);
        }
      }
    }
  }
}

export async function callLLM(prompt: string, config: LLMConfig): Promise<string> {
  const provider = config.activeProvider;
  const model = config.models[provider] || '';
  const apiKey = config.keys[provider];
  const baseUrl = config.baseUrls[provider];

  switch (provider) {
    case 'gemini':
      return callGemini(prompt, { ...config, model, apiKey } as any);
    case 'openrouter':
      return callOpenAICompatible(prompt, { ...config, model, apiKey, baseUrl } as any, "https://openrouter.ai/api/v1");
    case 'nvidia':
      return callOpenAICompatible(prompt, { ...config, model, apiKey, baseUrl } as any, "https://integrate.api.nvidia.com/v1");
    case 'local':
      return callOpenAICompatible(prompt, { ...config, model, apiKey, baseUrl } as any, baseUrl || "http://localhost:11434/v1");
    case 'custom':
      if (!baseUrl) throw new Error("Base URL is required for custom provider");
      return callOpenAICompatible(prompt, { ...config, model, apiKey, baseUrl } as any, baseUrl);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
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

export async function generateImage(prompt: string, config: LLMConfig): Promise<string> {
  const apiKey = config.keys.gemini || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing for image generation.");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image was generated in the response.");
  } catch (error: any) {
    console.error("Image generation error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
}
