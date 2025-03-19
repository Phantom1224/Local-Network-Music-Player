import { Song } from "@shared/schema";
import { formatTime } from "@/lib/formatTime";

interface MusicLibraryProps {
  songs: Song[];
  currentSong: Song | null;
  isLoading: boolean;
  isError: boolean;
  onPlay: (song: Song) => void;
  onRename: (song: Song) => void;
  onDelete: (song: Song) => void;
}

export default function MusicLibrary({
  songs,
  currentSong,
  isLoading,
  isError,
  onPlay,
  onRename,
  onDelete
}: MusicLibraryProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-primary text-white flex justify-between items-center">
        <h2 className="text-lg font-medium">Music Library</h2>
      </div>
      
      <div className="p-4">
        <div className="text-sm text-gray-600 mb-2">
          {isLoading ? (
            <span>Loading...</span>
          ) : isError ? (
            <span>Error loading songs</span>
          ) : (
            <span>{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        
        {/* Song List */}
        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              <span className="material-icons text-4xl animate-spin">refresh</span>
              <p className="mt-2">Loading songs...</p>
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              <span className="material-icons text-4xl">error_outline</span>
              <p className="mt-2">Failed to load songs</p>
            </div>
          ) : songs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <span className="material-icons text-4xl">music_off</span>
              <p className="mt-2">No songs found</p>
              <p className="text-sm">Upload some music to get started!</p>
            </div>
          ) : (
            <ul>
              {songs.map((song) => (
                <li 
                  key={song.id}
                  className="song-item group flex border-b last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div 
                    className={`active-indicator ${
                      currentSong?.id === song.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  ></div>
                  <div className="flex-1 py-3 px-4">
                    <div className="flex items-center">
                      <div 
                        className="flex-1 truncate cursor-pointer"
                        onClick={() => onPlay(song)}
                      >
                        <h3 className="font-medium truncate flex items-center">
                          {song.title}
                          <span className="ml-2 text-xs uppercase bg-gray-200 text-gray-700 rounded px-1.5 py-0.5">
                            {song.format}
                          </span>
                        </h3>
                        <div className="flex justify-between">
                          <p className="text-sm text-gray-600 truncate">{song.artist}</p>
                          <p className="text-sm text-gray-500 ml-2">{formatTime(song.duration || 0)}</p>
                        </div>
                      </div>
                      <div className="song-actions flex items-center space-x-1">
                        <button 
                          className="p-1 text-gray-600 hover:text-primary"
                          onClick={() => onRename(song)}
                          aria-label="Rename song"
                        >
                          <span className="material-icons text-lg">edit</span>
                        </button>
                        <button 
                          className="p-1 text-gray-600 hover:text-error"
                          onClick={() => onDelete(song)}
                          aria-label="Delete song"
                        >
                          <span className="material-icons text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
