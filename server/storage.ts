import { 
  songs, 
  type Song, 
  type InsertSong, 
  type RenameSongInput, 
  type DeleteSongInput 
} from "@shared/schema";
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Interface for storage operations
export interface IStorage {
  getAllSongs(): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  renameSong(input: RenameSongInput): Promise<Song | undefined>;
  deleteSong(input: DeleteSongInput): Promise<boolean>;
}

// File-based persistent storage implementation
export class FileStorage implements IStorage {
  private songs: Map<number, Song>;
  private currentId: number;
  private uploadsDir: string;
  private metadataFile: string;

  constructor() {
    this.songs = new Map();
    this.currentId = 1;
    this.uploadsDir = path.resolve(process.cwd(), 'audio-uploads');
    this.metadataFile = path.join(this.uploadsDir, 'songs-metadata.json');
    
    // Initialize storage - create directories and load saved data
    this.init();
  }

  private async init() {
    try {
      // Create uploads directory if it doesn't exist
      await fs.mkdir(this.uploadsDir, { recursive: true });
      
      // Load saved song metadata if it exists
      await this.loadSavedMetadata();
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private async loadSavedMetadata() {
    try {
      // Check if the metadata file exists
      if (existsSync(this.metadataFile)) {
        const data = await fs.readFile(this.metadataFile, 'utf-8');
        const { songs, nextId } = JSON.parse(data);
        
        // Restore songs to the map
        this.songs.clear();
        for (const song of songs) {
          // Validate that the song file still exists
          const songPath = song.path;
          if (existsSync(songPath)) {
            this.songs.set(song.id, song);
          }
        }
        
        // Restore the next ID counter
        this.currentId = nextId;
        
        console.log(`Loaded ${this.songs.size} songs from saved metadata`);
      }
    } catch (error) {
      console.error('Failed to load saved metadata:', error);
      // If there's an error loading the file, we'll start with an empty state
      this.songs.clear();
      this.currentId = 1;
    }
  }

  private async saveMetadata() {
    try {
      const songs = Array.from(this.songs.values());
      const data = {
        songs,
        nextId: this.currentId
      };
      
      await fs.writeFile(this.metadataFile, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Saved ${songs.length} songs to metadata file`);
    } catch (error) {
      console.error('Failed to save metadata:', error);
    }
  }

  async getAllSongs(): Promise<Song[]> {
    return Array.from(this.songs.values());
  }

  async getSong(id: number): Promise<Song | undefined> {
    return this.songs.get(id);
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const id = this.currentId++;
    
    // Ensure all required fields are present
    const song: Song = { 
      ...insertSong, 
      id,
      artist: insertSong.artist || "Unknown",
      duration: insertSong.duration || 0
    };
    
    this.songs.set(id, song);
    
    // Save updated metadata
    await this.saveMetadata();
    
    return song;
  }

  async renameSong(input: RenameSongInput): Promise<Song | undefined> {
    const song = this.songs.get(input.id);
    if (!song) return undefined;

    const updatedSong = { 
      ...song, 
      title: input.title,
      artist: input.artist || song.artist,
    };
    
    this.songs.set(input.id, updatedSong);
    
    // Save updated metadata
    await this.saveMetadata();
    
    return updatedSong;
  }

  async deleteSong(input: DeleteSongInput): Promise<boolean> {
    const song = this.songs.get(input.id);
    if (!song) return false;

    // Delete the file from the filesystem
    try {
      if (existsSync(song.path)) {
        await fs.unlink(song.path);
      }
      // Delete from memory store
      const result = this.songs.delete(input.id);
      
      // Save updated metadata
      await this.saveMetadata();
      
      return result;
    } catch (error) {
      console.error(`Failed to delete file ${song.path}:`, error);
      return false;
    }
  }
}

export const storage = new FileStorage();
