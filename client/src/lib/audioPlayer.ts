// Audio Player singleton class to manage the audio element
class AudioPlayer {
  private audio: HTMLAudioElement;
  private timeUpdateCallbacks: ((time: number) => void)[] = [];
  private durationChangeCallbacks: ((duration: number) => void)[] = [];
  private endedCallbacks: (() => void)[] = [];

  constructor() {
    this.audio = new Audio();
    
    // Set up event listeners
    this.audio.addEventListener('timeupdate', () => {
      // Notify time update callback
      this.timeUpdateCallbacks.forEach(cb => cb(this.audio.currentTime));
      
      // Check if we're at the end of the track (within 0.1 seconds)
      if (this.audio.duration > 0 && 
          !isNaN(this.audio.duration) && 
          this.audio.currentTime >= this.audio.duration - 0.1) {
        
        console.log("Near end of track detected:", this.audio.currentTime, "of", this.audio.duration);
        
        // Manually trigger ended callbacks
        this.endedCallbacks.forEach(cb => {
          console.log("Triggering ended callback");
          cb();
        });
      }
    });
    
    this.audio.addEventListener('durationchange', () => {
      if (this.audio.duration && !isNaN(this.audio.duration)) {
        this.durationChangeCallbacks.forEach(cb => cb(this.audio.duration));
      }
    });
    
    this.audio.addEventListener('ended', () => {
      // This is the native ended event
      this.endedCallbacks.forEach(cb => cb());
    });
  }

  loadSong(src: string): void {
    // Force reload to ensure proper audio loading
    this.audio.src = src;
    this.audio.load();
    console.log(`Audio loaded: ${src}`);
  }

  play(): Promise<void> {
    // Add a safety check for playability
    try {
      const playPromise = this.audio.play();
      
      // The play() method returns a Promise in modern browsers
      if (playPromise !== undefined) {
        return playPromise.catch(error => {
          console.error("Audio playback error:", error);
          // Throw the error again to be caught by the caller
          throw error;
        });
      }
      
      // For older browsers that don't return a promise
      return Promise.resolve();
    } catch (error) {
      console.error("Error in play():", error);
      return Promise.reject(error);
    }
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time: number): void {
    if (time >= 0 && time <= this.audio.duration) {
      this.audio.currentTime = time;
    }
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getDuration(): number {
    return this.audio.duration;
  }

  // Event handlers
  onTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallbacks.push(callback);
  }

  offTimeUpdate(callback: (time: number) => void): void {
    this.timeUpdateCallbacks = this.timeUpdateCallbacks.filter(cb => cb !== callback);
  }

  onDurationChange(callback: (duration: number) => void): void {
    this.durationChangeCallbacks.push(callback);
  }

  offDurationChange(callback: (duration: number) => void): void {
    this.durationChangeCallbacks = this.durationChangeCallbacks.filter(cb => cb !== callback);
  }

  onEnded(callback: () => void): void {
    this.endedCallbacks.push(callback);
  }

  offEnded(callback: () => void): void {
    this.endedCallbacks = this.endedCallbacks.filter(cb => cb !== callback);
  }
}

// Export a singleton instance
export const audioPlayer = new AudioPlayer();
