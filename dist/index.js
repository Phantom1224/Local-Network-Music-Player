// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import fs from "fs/promises";
import path from "path";
var MemStorage = class {
  songs;
  currentId;
  uploadsDir;
  constructor() {
    this.songs = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.uploadsDir = path.resolve(process.cwd(), "audio-uploads");
    this.initUploadsDir();
  }
  async initUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create uploads directory:", error);
    }
  }
  async getAllSongs() {
    return Array.from(this.songs.values());
  }
  async getSong(id) {
    return this.songs.get(id);
  }
  async createSong(insertSong) {
    const id = this.currentId++;
    const song = {
      ...insertSong,
      id,
      artist: insertSong.artist || "Unknown",
      duration: insertSong.duration || 0
    };
    this.songs.set(id, song);
    return song;
  }
  async renameSong(input) {
    const song = this.songs.get(input.id);
    if (!song) return void 0;
    const updatedSong = {
      ...song,
      title: input.title,
      artist: input.artist || song.artist
    };
    this.songs.set(input.id, updatedSong);
    return updatedSong;
  }
  async deleteSong(input) {
    const song = this.songs.get(input.id);
    if (!song) return false;
    try {
      await fs.unlink(song.path);
      return this.songs.delete(input.id);
    } catch (error) {
      console.error(`Failed to delete file ${song.path}:`, error);
      return false;
    }
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
import path2 from "path";
import fs2 from "fs/promises";

// shared/schema.ts
import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").default("Unknown"),
  duration: integer("duration").default(0),
  // in seconds
  format: text("format").notNull(),
  // mp3, m4a, wav, flac
  path: text("path").notNull(),
  filename: text("filename").notNull()
  // Original filename with extension
});
var insertSongSchema = createInsertSchema(songs).pick({
  title: true,
  artist: true,
  duration: true,
  format: true,
  path: true,
  filename: true
});
var renameSongSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().optional()
});
var deleteSongSchema = z.object({
  id: z.number()
});

// server/routes.ts
import { z as z2 } from "zod";
import { fromZodError } from "zod-validation-error";
import * as mm from "music-metadata";
var uploadsDir = path2.resolve(process.cwd(), "audio-uploads");
async function ensureUploadsDir() {
  try {
    await fs2.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
    throw error;
  }
}
var storage_config = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path2.extname(file.originalname);
    const filename = path2.basename(file.originalname, ext) + "-" + uniqueSuffix + ext;
    cb(null, filename);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "audio/mpeg",
    // MP3
    "audio/mp4",
    // M4A
    "audio/wav",
    // WAV
    "audio/x-wav",
    // WAV
    "audio/flac",
    // FLAC
    "audio/x-flac"
    // FLAC
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only MP3, M4A, WAV, and FLAC are allowed."));
  }
};
var upload = multer({
  storage: storage_config,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50 MB limit
  }
});
async function registerRoutes(app2) {
  await ensureUploadsDir();
  app2.use("/api/audio", (req, res, next) => {
    try {
      const decodedPath = decodeURIComponent(req.path);
      const audioFilePath = path2.join(uploadsDir, path2.basename(decodedPath));
      fs2.access(audioFilePath).then(() => {
        res.sendFile(audioFilePath, (err) => {
          if (err) next(err);
        });
      }).catch((error) => {
        console.error(`File not found: ${audioFilePath}`, error);
        res.status(404).json({ message: `File not found: ${path2.basename(decodedPath)}` });
      });
    } catch (error) {
      console.error("Error serving audio file:", error);
      next(error);
    }
  });
  app2.get("/api/songs", async (req, res) => {
    try {
      const songs2 = await storage.getAllSongs();
      res.json(songs2);
    } catch (error) {
      console.error("Error getting songs:", error);
      res.status(500).json({ message: "Failed to get songs" });
    }
  });
  app2.post("/api/songs/upload", upload.array("songs", 10), async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const uploadedSongs = [];
      for (const file of files) {
        const filePath = file.path;
        const fileExt = path2.extname(file.originalname).toLowerCase().substring(1);
        let metadata;
        try {
          metadata = await mm.parseBuffer(await fs2.readFile(filePath), {
            mimeType: file.mimetype,
            size: file.size
          });
        } catch (error) {
          console.error("Error parsing metadata:", error);
          metadata = { common: {}, format: {} };
        }
        const title = metadata.common.title || path2.basename(file.originalname, path2.extname(file.originalname));
        const artist = metadata.common.artist || "Unknown";
        const duration = Math.floor(metadata.format.duration || 0);
        const songData = insertSongSchema.parse({
          title,
          artist,
          duration,
          format: fileExt,
          path: filePath,
          filename: file.originalname
        });
        const song = await storage.createSong(songData);
        uploadedSongs.push(song);
      }
      res.status(201).json(uploadedSongs);
    } catch (error) {
      console.error("Error uploading song:", error);
      if (error instanceof z2.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to upload song" });
    }
  });
  app2.patch("/api/songs/:id", async (req, res) => {
    try {
      const input = renameSongSchema.parse({
        id: parseInt(req.params.id),
        ...req.body
      });
      const updatedSong = await storage.renameSong(input);
      if (!updatedSong) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.json(updatedSong);
    } catch (error) {
      console.error("Error renaming song:", error);
      if (error instanceof z2.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to rename song" });
    }
  });
  app2.delete("/api/songs/:id", async (req, res) => {
    try {
      const input = deleteSongSchema.parse({
        id: parseInt(req.params.id)
      });
      const deleted = await storage.deleteSong(input);
      if (!deleted) {
        return res.status(404).json({ message: "Song not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting song:", error);
      if (error instanceof z2.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to delete song" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path3, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(__dirname, "client", "src"),
      "@shared": path3.resolve(__dirname, "shared")
    }
  },
  root: path3.resolve(__dirname, "client"),
  build: {
    outDir: path3.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server }
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(__dirname2, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { networkInterfaces } from "os";
var getLocalIpAddress = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
};
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const localIp = getLocalIpAddress() || "localhost";
  const port = 5e3;
  server.listen({ port, host: localIp }, () => {
    log(`serving on http://${localIp}:${port}`);
  });
})();
