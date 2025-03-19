import { useState } from "react";
import { Song } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeleteConfirmDialogProps {
  song: Song;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteConfirmDialog({ song, onClose, onSuccess }: DeleteConfirmDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      await apiRequest('DELETE', `/api/songs/${song.id}`);
      
      toast({
        title: "Song Deleted",
        description: "The song has been deleted successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-medium mb-2">Delete Song</h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete "{song.title}"? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-2">
          <button 
            type="button" 
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
