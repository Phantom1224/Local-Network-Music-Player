import MusicPlayer from "@/components/MusicPlayer";
import MusicLibrary from "@/components/MusicLibrary";
import RenameDialog from "@/components/dialogs/RenameDialog";
import DeleteConfirmDialog from "@/components/dialogs/DeleteConfirmDialog";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Song } from "@shared/schema";
import { useState } from "react";

export default function Home() {
  const queryClient = useQueryClient();
  const [songToRename, setSongToRename] = useState<Song | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  // Fetch all songs
  const { data: songs = [], isLoading, isError } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
  });

  // Music player state and controls
  const {
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    currentTime,
    duration,
    setSeekPosition,
    togglePlay,
    playNext,
    playPrevious,
    playSong,
    toggleShuffle,
    toggleRepeat,
  } = useMusicPlayer(songs);

  // Handle renaming a song
  const handleOpenRenameDialog = (song: Song) => {
    setSongToRename(song);
  };

  const handleCloseRenameDialog = () => {
    setSongToRename(null);
  };

  // Handle deleting a song
  const handleOpenDeleteDialog = (song: Song) => {
    setSongToDelete(song);
  };

  const handleCloseDeleteDialog = () => {
    setSongToDelete(null);
  };

  // Handle successful song deletion
  const handleSongDeleted = () => {
    // Invalidate songs query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
  };

  // Handle successful song rename
  const handleSongRenamed = () => {
    // Invalidate songs query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="material-icons">music_note</span>
            <h1 className="text-xl font-medium">Local Network Music Player</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="material-icons">wifi</span>
            <span className="text-sm">Local Network</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Music Player */}
          <MusicPlayer
            currentSong={currentSong}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            currentTime={currentTime}
            duration={duration}
            onPlay={togglePlay}
            onNext={playNext}
            onPrevious={playPrevious}
            onSeek={setSeekPosition}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
          />

          {/* Music Library */}
          <MusicLibrary
            songs={songs}
            currentSong={currentSong}
            isLoading={isLoading}
            isError={isError}
            onPlay={playSong}
            onRename={handleOpenRenameDialog}
            onDelete={handleOpenDeleteDialog}
          />
        </div>
      </main>

      {/* Rename Dialog */}
      {songToRename && (
        <RenameDialog
          song={songToRename}
          onClose={handleCloseRenameDialog}
          onSuccess={handleSongRenamed}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {songToDelete && (
        <DeleteConfirmDialog
          song={songToDelete}
          onClose={handleCloseDeleteDialog}
          onSuccess={handleSongDeleted}
        />
      )}
    </div>
  );
}
