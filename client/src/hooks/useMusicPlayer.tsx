import { useState, useEffect, useRef } from "react";
import { Song } from "@shared/schema";
import { audioPlayer } from "@/lib/audioPlayer";

type RepeatMode = 'none' | 'all' | 'one';

export function useMusicPlayer(songs: Song[]) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Refs to track the current playlist and song index
  const playlistRef = useRef<Song[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const shuffledPlaylistRef = useRef<Song[]>([]);
  const lastEndedRef = useRef<number | null>(null);

  // Update the playlist when songs change
  useEffect(() => {
    playlistRef.current = [...songs];
    
    // Create shuffled playlist
    updateShuffledPlaylist();
    
    // If we have a current song, find its new index
    if (currentSong) {
      const newIndex = songs.findIndex(song => song.id === currentSong.id);
      if (newIndex !== -1) {
        currentIndexRef.current = newIndex;
      } else if (songs.length > 0) {
        // If current song was removed, set to first song but don't auto-play
        setCurrentSong(songs[0]);
        currentIndexRef.current = 0;
        audioPlayer.stop();
        setIsPlaying(false);
      } else {
        // No songs left
        setCurrentSong(null);
        currentIndexRef.current = -1;
        audioPlayer.stop();
        setIsPlaying(false);
      }
    }
  }, [songs]);

  // Initialize audio player event handlers
  useEffect(() => {
    // Update time as song plays
    const handleTimeUpdate = (time: number) => {
      setCurrentTime(time);
      
      // Check if we're near the end (within 0.5 seconds) to handle any potential missed 'ended' events
      if (duration > 0 && time >= duration - 0.5) {
        handleSongEnd();
      }
    };

    // Handle when audio duration is available
    const handleDurationChange = (newDuration: number) => {
      setDuration(newDuration);
    };

    // Handle song ending
    const handleEnded = () => {
      handleSongEnd();
    };

    // Set up event listeners
    audioPlayer.onTimeUpdate(handleTimeUpdate);
    audioPlayer.onDurationChange(handleDurationChange);
    audioPlayer.onEnded(handleEnded);

    // Cleanup
    return () => {
      audioPlayer.offTimeUpdate(handleTimeUpdate);
      audioPlayer.offDurationChange(handleDurationChange);
      audioPlayer.offEnded(handleEnded);
    };
  }, [duration, repeatMode, isShuffle]);

  // Update the player when the current song changes
  useEffect(() => {
    if (currentSong) {
      // Use the stored path name (extracting just the filename part)
      const filename = currentSong.path.split('/').pop();
      if (!filename) {
        console.error("Invalid filename for song:", currentSong);
        return;
      }

      // Properly encode the filename for URLs with spaces or special characters
      const encodedFilename = encodeURIComponent(filename);
      const audioSrc = `/api/audio/${encodedFilename}`;
      console.log(`Loading song: ${currentSong.title}, src: ${audioSrc}`);
      
      audioPlayer.loadSong(audioSrc);
      
      // Small delay before playing to ensure the audio is loaded
      if (isPlaying) {
        setTimeout(() => {
          audioPlayer.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsPlaying(false); // Set to not playing if there's an error
          });
        }, 100);
      }
    }
  }, [currentSong, isPlaying]);

  // Handle play/pause state changes
  useEffect(() => {
    // Only handle pause here, play is handled in the currentSong useEffect
    if (!isPlaying) {
      audioPlayer.pause();
    }
    // We don't play here because that's handled in the currentSong effect
  }, [isPlaying]);

  // Shuffle the playlist
  const updateShuffledPlaylist = () => {
    const playlist = [...playlistRef.current];
    
    // Fisher-Yates shuffle algorithm
    for (let i = playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
    }
    
    shuffledPlaylistRef.current = playlist;
  };

  // Get the current playlist based on shuffle state
  const getCurrentPlaylist = () => {
    return isShuffle ? shuffledPlaylistRef.current : playlistRef.current;
  };

  // Handle what happens when a song ends
  const handleSongEnd = () => {
    // Avoid multiple triggers in a short time window
    const now = Date.now();
    if (lastEndedRef.current && now - lastEndedRef.current < 1000) {
      return;
    }
    lastEndedRef.current = now;
    
    console.log("Song ended, handling end of track");
    
    if (repeatMode === 'one') {
      // Repeat the current song
      console.log("Repeating current song (repeat one)");
      audioPlayer.seek(0);
      audioPlayer.play().catch(err => console.error("Error playing audio:", err));
    } else {
      // For both 'none' and 'all' modes, go to the next song
      // The difference is handled in playNext() where we wrap around for 'all'
      console.log("Moving to next song");
      playNext();
    }
  };

  // Play a specific song
  const playSong = (song: Song) => {
    const playlist = getCurrentPlaylist();
    const index = playlist.findIndex(s => s.id === song.id);
    
    if (index !== -1) {
      currentIndexRef.current = index;
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!currentSong && songs.length > 0) {
      // If no song is selected, play the first one
      const playlist = getCurrentPlaylist();
      currentIndexRef.current = 0;
      
      console.log("Starting playback with first song");
      setCurrentSong(playlist[0]);
      setIsPlaying(true);
    } else if (currentSong) {
      // Toggle play/pause for the current song
      if (isPlaying) {
        console.log("Pausing playback");
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        console.log("Resuming playback");
        audioPlayer.play().catch(err => console.error("Error playing audio:", err));
        setIsPlaying(true);
      }
    }
  };

  // Play the next song
  const playNext = () => {
    if (songs.length === 0) return;
    
    const playlist = getCurrentPlaylist();
    let nextIndex = currentIndexRef.current + 1;
    
    // Always wrap around to the beginning when reaching the end
    if (nextIndex >= playlist.length) {
      nextIndex = 0;
    }
    
    // Make sure nextIndex is valid
    if (nextIndex < 0 || nextIndex >= playlist.length) {
      console.warn("Invalid next index:", nextIndex);
      return;
    }
    
    // Update current index and song
    currentIndexRef.current = nextIndex;
    const nextSong = playlist[nextIndex];
    
    // Log to help debug
    console.log(`Playing next song: ${nextSong.title} (${nextSong.format})`);
    
    // Set the current song and ensure playing state
    setCurrentSong(nextSong);
    setIsPlaying(true);
  };

  // Play the previous song
  const playPrevious = () => {
    if (songs.length === 0) return;
    
    // If we're more than 3 seconds into the song, restart it instead of going to previous
    if (currentTime > 3) {
      audioPlayer.seek(0);
      return;
    }
    
    const playlist = getCurrentPlaylist();
    let prevIndex = currentIndexRef.current - 1;
    
    // Always wrap around to the end when reaching the beginning
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }
    
    // Make sure prevIndex is valid
    if (prevIndex < 0 || prevIndex >= playlist.length) {
      console.warn("Invalid previous index:", prevIndex);
      return;
    }
    
    // Log for debugging
    console.log(`Playing previous song: ${playlist[prevIndex].title} (${playlist[prevIndex].format})`);
    
    currentIndexRef.current = prevIndex;
    setCurrentSong(playlist[prevIndex]);
    setIsPlaying(true);
  };

  // Toggle shuffle mode
  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
    
    if (!isShuffle) {
      // Turning shuffle on, update the shuffled playlist
      updateShuffledPlaylist();
      
      // Find current song in the shuffled playlist if we have one
      if (currentSong) {
        const shuffledIndex = shuffledPlaylistRef.current.findIndex(s => s.id === currentSong.id);
        currentIndexRef.current = shuffledIndex;
      }
    } else {
      // Turning shuffle off, find the current song in the normal playlist
      if (currentSong) {
        const normalIndex = playlistRef.current.findIndex(s => s.id === currentSong.id);
        currentIndexRef.current = normalIndex;
      }
    }
  };

  // Cycle through repeat modes
  const toggleRepeat = () => {
    if (repeatMode === 'none') {
      setRepeatMode('all');
    } else if (repeatMode === 'all') {
      setRepeatMode('one');
    } else {
      setRepeatMode('none');
    }
  };

  // Set the current time/position of the song
  const setSeekPosition = (position: number) => {
    audioPlayer.seek(position);
    setCurrentTime(position);
  };

  return {
    currentSong,
    isPlaying,
    isShuffle,
    repeatMode,
    currentTime,
    duration,
    playSong,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    setSeekPosition,
  };
}
