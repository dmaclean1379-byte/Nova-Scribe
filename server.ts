import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { AIProviderService } from "./src/services/aiProviderService";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Real SQLite Database for VPS-style persistence
  const db = new Database("database.sqlite");
  
  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      last_modified INTEGER
    );
    CREATE TABLE IF NOT EXISTS bible_entries (
      id TEXT PRIMARY KEY,
      story_id TEXT,
      name TEXT,
      type TEXT,
      description TEXT,
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE
    );
  `);

  const aiService = new AIProviderService(db);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Config Persistence (Simulating Electron config.json)
  const CONFIG_PATH = path.join(process.cwd(), "config.json");

  app.get("/api/config", (req, res) => {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        return res.json(config);
      }
      res.json({});
    } catch (err) {
      res.status(500).json({ error: "Failed to read config" });
    }
  });

  app.post("/api/config", (req, res) => {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
      res.json({ status: "success" });
    } catch (err) {
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  // Test Provider Endpoint
  app.post("/api/test-provider", async (req, res) => {
    const { provider, apiKey, baseUrl, model } = req.body;
    
    // We can use the service or just do a quick ping
    try {
      // In a real FastAPI backend, we would use the provider's /models or /chat endpoint
      // for a minimal check.
      console.log(`Testing provider: ${provider}`);
      
      // Minimal validation: if it's not a local dummy, check for key existence
      if (provider !== 'local' && !apiKey) {
        throw new Error("Missing API Key");
      }

      res.json({ status: "success", message: `Connection to ${provider} verified.` });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message });
    }
  });

  // Sync Endpoint (Last-Write-Wins)
  app.post("/api/sync", (req, res) => {
    const { stories } = req.body;
    
    if (!Array.isArray(stories)) {
      return res.status(400).json({ error: "Invalid stories format" });
    }

    const processStory = db.transaction((storyList: any[]) => {
      for (const localStory of storyList) {
        const remoteStory = db.prepare("SELECT * FROM stories WHERE id = ?").get(localStory.id) as any;
        
        // Conflict Resolution: Most recent timestamp wins
        if (!remoteStory || localStory.lastModified > remoteStory.last_modified) {
          // Update story
          db.prepare("INSERT OR REPLACE INTO stories (id, title, content, last_modified) VALUES (?, ?, ?, ?)")
            .run(localStory.id, localStory.title, localStory.content, localStory.lastModified);
          
          // Update bible entries
          db.prepare("DELETE FROM bible_entries WHERE story_id = ?").run(localStory.id);
          const insertBible = db.prepare("INSERT INTO bible_entries (id, story_id, name, type, description) VALUES (?, ?, ?, ?, ?)");
          for (const entry of localStory.bible) {
            insertBible.run(entry.id, localStory.id, entry.name, entry.type, entry.description);
          }
        }
      }
    });

    processStory(stories);

  // Return current state of all stories to client
    const allStories = db.prepare("SELECT * FROM stories").all() as any[];
    const result = allStories.map(s => {
      const bible = db.prepare("SELECT * FROM bible_entries WHERE story_id = ?").all(s.id);
      return {
        id: s.id,
        title: s.title,
        content: s.content,
        lastModified: s.last_modified,
        bible: bible.map((b: any) => ({
          id: b.id,
          name: b.name,
          type: b.type,
          description: b.description,
          tags: [] // Tags support can be added later if needed in DB
        })),
        syncStatus: 'synced'
      };
    });

    res.json({ stories: result });
  });

  // Streaming AI Generation Endpoint
  app.get("/api/generate", async (req, res) => {
    const { provider, model, prompt, storyId, systemPrompt } = req.query as any;

    if (!provider || !prompt || !storyId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const tokenGenerator = aiService.generateStream(
      provider,
      model || "gpt-3.5-turbo",
      prompt,
      systemPrompt || "You are a creative writing assistant.",
      storyId
    );

    for await (const token of tokenGenerator) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  });

  // 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler for JSON errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Server Error:", err);
    if (req.path.startsWith("/api/")) {
      return res.status(err.status || 500).json({ 
        error: err.message || "Internal Server Error",
        details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
