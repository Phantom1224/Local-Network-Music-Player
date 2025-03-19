import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Song } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { formatTime } from "@/lib/formatTime";

interface MusicPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

export default function MusicPlayer({
  currentSong,
  isPlaying,
  isShuffle,
  repeatMode,
  currentTime,
  duration,
  onPlay,
  onNext,
  onPrevious,
  onSeek,
  onToggleShuffle,
  onToggleRepeat
}: MusicPlayerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    } else {
      setSelectedFiles(null);
    }
  };

  // Handle file upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one music file to upload.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('songs', selectedFiles[i]);
      }
      
      const response = await fetch('/api/songs/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload song');
      }
      
      const uploadedSongs = await response.json();
      
      // Success notification
      toast({
        title: "Upload Successful",
        description: `${uploadedSongs.length} song${uploadedSongs.length > 1 ? 's' : ''} uploaded successfully.`,
      });
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFiles(null);
      
      // Refresh song list
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const position = parseInt(e.target.value);
    onSeek(position);
  };

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col h-full">
        {/* Now Playing Section */}
        <div className="text-center mb-6">
          <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
            {/* Album Art Placeholder */}
            <span className="material-icons text-6xl text-gray-400">music_note</span>
          </div>
          <h2 className="text-xl font-medium truncate">
            {currentSong ? currentSong.title : 'No song playing'}
          </h2>
          <p className="text-gray-600 truncate">
            {currentSong ? currentSong.artist : 'Select a song to play'}
          </p>
        </div>
        
        {/* Seek Bar */}
        <div className="mb-6 px-4">
          <input 
            type="range" 
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            min="0" 
            max={duration || 100} 
            value={currentTime}
            onChange={handleSeek}
            disabled={!currentSong}
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex justify-center items-center space-x-6 mb-8">
          {/* Shuffle Button */}
          <button 
            className={`hover:text-primary transition-colors ${isShuffle ? 'text-primary' : 'text-gray-500'}`}
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
          >
            <span className="material-icons text-2xl">shuffle</span>
          </button>
          
          {/* Previous Button */}
          <button 
            className="text-gray-800 hover:text-primary transition-colors"
            onClick={onPrevious}
            disabled={!currentSong}
            aria-label="Previous song"
          >
            <span className="material-icons text-4xl">skip_previous</span>
          </button>
          
          {/* Play/Pause Button */}
          <button 
            className="bg-primary text-white rounded-full p-3 hover:bg-primary-dark transition-colors"
            onClick={onPlay}
            disabled={!currentSong}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <span className="material-icons text-4xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          
          {/* Next Button */}
          <button 
            className="text-gray-800 hover:text-primary transition-colors"
            onClick={onNext}
            disabled={!currentSong}
            aria-label="Next song"
          >
            <span className="material-icons text-4xl">skip_next</span>
          </button>
          
          {/* Repeat Button */}
          <button 
            className={`hover:text-primary transition-colors ${
              repeatMode !== 'none' ? 'text-primary' : 'text-gray-500'
            }`}
            onClick={onToggleRepeat}
            aria-label="Toggle repeat"
          >
            <span className="material-icons text-2xl">
              {repeatMode === 'one' ? 'repeat_one' : 'repeat'}
            </span>
          </button>
        </div>
        
        {/* Upload Section */}
        <div className="mt-auto">
          <div className="border-t pt-4">
            <form className="flex flex-col space-y-3" onSubmit={handleUpload}>
              <div className="flex items-center space-x-2">
                <span className="material-icons text-gray-600">upload_file</span>
                <h3 className="font-medium">Upload Music</h3>
              </div>
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input 
                  type="file" 
                  id="musicUpload"
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  multiple 
                  accept=".mp3,.m4a,.wav,.flac"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                <div className="text-gray-600">
                  <span className="material-icons text-3xl mb-2">music_note</span>
                  <p>Drag &amp; drop music files or click to browse</p>
                  <p className="text-xs mt-1">Supported formats: MP3, M4A, WAV, FLAC</p>
                </div>
              </div>
              {selectedFiles && selectedFiles.length > 0 && (
                <div>
                  <div className="flex justify-between items-center bg-gray-100 rounded-lg p-3">
                    <div>
                      {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
