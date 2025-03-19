import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Song schema representing a music file
export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").default("Unknown"),
  duration: integer("duration").default(0), // in seconds
  format: text("format").notNull(), // mp3, m4a, wav, flac
  path: text("path").notNull(),
  filename: text("filename").notNull(), // Original filename with extension
});

export const insertSongSchema = createInsertSchema(songs).pick({
  title: true,
  artist: true,
  duration: true,
  format: true,
  path: true,
  filename: true,
});

export const renameSongSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().optional(),
});

export const deleteSongSchema = z.object({
  id: z.number(),
});

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
export type RenameSongInput = z.infer<typeof renameSongSchema>;
export type DeleteSongInput = z.infer<typeof deleteSongSchema>;
