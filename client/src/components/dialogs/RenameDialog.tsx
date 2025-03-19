import { useState } from "react";
import { Song } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RenameDialogProps {
  song: Song;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RenameDialog({ song, onClose, onSuccess }: RenameDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await apiRequest('PATCH', `/api/songs/${song.id}`, {
        title: title.trim(),
        artist: artist?.trim() ?? "",
      });
      
      toast({
        title: "Song Renamed",
        description: "The song has been renamed successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Rename Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-medium mb-4">Rename Song</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Song Title
            </label>
            <input 
              type="text" 
              id="title" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="artist" className="block text-sm font-medium text-gray-700 mb-1">
              Artist
            </label>
            <input 
              type="text" 
              id="artist" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              value={artist ?? ""}
              onChange={(e) => setArtist(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
