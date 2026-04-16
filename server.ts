import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory mock "SQLite" Database for remote sync demo
  // In a real VPS, this would be SQLite via FastAPI
  const remoteDB: Record<string, any> = {};

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Sync Endpoint (Last-Write-Wins based on timestamp)
  app.post("/api/sync", (req, res) => {
    const { stories } = req.body;
    
    if (!Array.isArray(stories)) {
      return res.status(400).json({ error: "Invalid stories format" });
    }

    const updatedStories = stories.map(localStory => {
      const remoteStory = remoteDB[localStory.id];
      
      // Conflict Resolution: Most recent timestamp wins
      if (!remoteStory || localStory.lastModified > remoteStory.lastModified) {
        remoteDB[localStory.id] = localStory;
        return { ...localStory, syncStatus: 'synced' };
      }
      
      return { ...remoteStory, syncStatus: 'synced' };
    });

    console.log(`[Sync] Processed ${stories.length} stories.`);
    res.json({ stories: Object.values(remoteDB) });
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
