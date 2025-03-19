import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { 
  insertSongSchema, 
  renameSongSchema, 
  deleteSongSchema 
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import * as mm from "music-metadata";

// Configure multer for file uploads
const uploadsDir = path.resolve(process.cwd(), 'audio-uploads');

// Create uploads directory if it doesn't exist
async function ensureUploadsDir() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
    throw error;
  }
}

// Storage configuration for multer
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Preserve the original filename but make it unique with a timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = path.basename(file.originalname, ext) + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

// File filter to only allow music files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if the file is one of the allowed types
  const allowedMimeTypes = [
    'audio/mpeg', // MP3
    'audio/mp4', // M4A
    'audio/wav', // WAV
    'audio/x-wav', // WAV
    'audio/flac', // FLAC
    'audio/x-flac' // FLAC
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP3, M4A, WAV, and FLAC are allowed.'));
  }
};

// Configure multer with storage and file filter
const upload = multer({ 
  storage: storage_config,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  await ensureUploadsDir();
  
  // Serve static files from the uploads directory
  app.use('/api/audio', (req, res, next) => {
    try {
      // Decode the URI component to handle files with spaces and special characters
      const decodedPath = decodeURIComponent(req.path);
      const audioFilePath = path.join(uploadsDir, path.basename(decodedPath));
      
      // Check if file exists before sending
      fs.access(audioFilePath)
        .then(() => {
          res.sendFile(audioFilePath, (err) => {
            if (err) next(err);
          });
        })
        .catch(error => {
          console.error(`File not found: ${audioFilePath}`, error);
          res.status(404).json({ message: `File not found: ${path.basename(decodedPath)}` });
        });
    } catch (error) {
      console.error('Error serving audio file:', error);
      next(error);
    }
  });

  // Get all songs
  app.get('/api/songs', async (req, res) => {
    try {
      const songs = await storage.getAllSongs();
      res.json(songs);
    } catch (error) {
      console.error('Error getting songs:', error);
      res.status(500).json({ message: 'Failed to get songs' });
    }
  });

  // Upload a new song
  app.post('/api/songs/upload', upload.array('songs', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const uploadedSongs = [];

      for (const file of files) {
        const filePath = file.path;
        const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
        
        // Parse metadata from the music file
        let metadata;
        try {
          metadata = await mm.parseBuffer(await fs.readFile(filePath), {
            mimeType: file.mimetype,
            size: file.size
          });
        } catch (error) {
          console.error('Error parsing metadata:', error);
          metadata = { common: {}, format: {} };
        }
        
        // Extract title and artist from metadata if available
        const title = metadata.common.title || path.basename(file.originalname, path.extname(file.originalname));
        const artist = metadata.common.artist || 'Unknown';
        const duration = Math.floor(metadata.format.duration || 0);
        
        // Validate and create the song
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
      console.error('Error uploading song:', error);
      
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: 'Failed to upload song' });
    }
  });

  // Rename a song
  app.patch('/api/songs/:id', async (req, res) => {
    try {
      const input = renameSongSchema.parse({
        id: parseInt(req.params.id),
        ...req.body
      });

      const updatedSong = await storage.renameSong(input);
      
      if (!updatedSong) {
        return res.status(404).json({ message: 'Song not found' });
      }
      
      res.json(updatedSong);
    } catch (error) {
      console.error('Error renaming song:', error);
      
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: 'Failed to rename song' });
    }
  });

  // Delete a song
  app.delete('/api/songs/:id', async (req, res) => {
    try {
      const input = deleteSongSchema.parse({
        id: parseInt(req.params.id)
      });

      const deleted = await storage.deleteSong(input);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Song not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting song:', error);
      
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: 'Failed to delete song' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
