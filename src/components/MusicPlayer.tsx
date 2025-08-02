import React, { useRef, useState, useEffect, useCallback } from 'react';
import '../styles/MusicPlayer.css';

interface MusicPlayerProps {
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
}

// Web Audio API context type
type AudioContextType = AudioContext | null;

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  audioFile,
  onAudioFileChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [useWebAudio, setUseWebAudio] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioSrcRef = useRef<string>('');

  // Web Audio API refs
  const audioContextRef = useRef<AudioContextType>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Initialize and clean up Web Audio API
  const initWebAudio = useCallback(async (file: File) => {
    try {
      // Clean up any existing audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }

      // Create new audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create analyzer for future visualizations
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.connect(audioContextRef.current.destination);

      // Read the file and decode audio data
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      console.log('Web Audio API initialized with buffer length:', audioBuffer.length);
      setDuration(audioBuffer.duration);

      return true;
    } catch (error) {
      console.error('Web Audio API initialization error:', error);
      setAudioError('Failed to initialize Web Audio API. Falling back to standard audio.');
      setUseWebAudio(false);
      return false;
    }
  }, []);

  // Handle file upload
  useEffect(() => {
    if (!audioFile) {
      // Reset state when no file is present
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);

      // Revoke any existing object URL
      if (audioSrcRef.current) {
        URL.revokeObjectURL(audioSrcRef.current);
        audioSrcRef.current = '';
      }

      // Clean up Web Audio if it was being used
      if (audioContextRef.current) {
        stopWebAudio();
        audioBufferRef.current = null;
      }

      console.log('Audio file reset');
      return;
    }

    // Clean up previous URL if it exists
    if (audioSrcRef.current) {
      URL.revokeObjectURL(audioSrcRef.current);
    }

    // Create a new object URL for the audio file for HTML5 Audio
    const objectUrl = URL.createObjectURL(audioFile);
    audioSrcRef.current = objectUrl;

    console.log('Created audio source for:', audioFile.name);

    // Reset error state when loading new file
    setAudioError(null);

    // Reset playback position
    setCurrentTime(0);
    setIsPlaying(false);

    // Initialize Web Audio API if enabled
    if (useWebAudio) {
      initWebAudio(audioFile);
    }

    // Clean up when component unmounts or file changes
    return () => {
      if (audioSrcRef.current) {
        URL.revokeObjectURL(audioSrcRef.current);
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [audioFile, useWebAudio, initWebAudio]);

  // Update time display when audio is playing with HTML5 Audio
  useEffect(() => {
    if (!audioRef.current || useWebAudio) return;

    // Setup event listeners for the audio element
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
      console.log('Audio duration:', audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      console.log('Audio playback ended');
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Audio playback error:', e);
      setAudioError('Error playing audio file');
      setIsPlaying(false);
    };

    // Add event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError as unknown as EventListener);

    // Clean up event listeners
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError as unknown as EventListener);
    };
  }, [isDragging, useWebAudio]);

  // Web Audio API time update function
  const updateWebAudioTime = useCallback(() => {
    if (!audioContextRef.current || !isPlaying || !audioBufferRef.current) return;

    const currentAudioTime = audioContextRef.current.currentTime - startTimeRef.current + pausedTimeRef.current;

    if (currentAudioTime >= audioBufferRef.current.duration) {
      // Handle playback end
      stopWebAudio();
      setCurrentTime(0);
      setIsPlaying(false);
      console.log('Web Audio playback ended');
      return;
    }

    if (!isDragging) {
      setCurrentTime(currentAudioTime);
    }

    // Continue updating time
    rafIdRef.current = requestAnimationFrame(updateWebAudioTime);
  }, [isPlaying, isDragging]);

  // Start Web Audio time updates when playing
  useEffect(() => {
    if (useWebAudio && isPlaying) {
      updateWebAudioTime();
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [useWebAudio, isPlaying, updateWebAudioTime]);

  // Handle drag and drop directly on player
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) {
        // Create a new reference to the file to avoid potential caching issues
        const newFile = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });

        console.log('Dropped audio file:', newFile.name, newFile.type);
        onAudioFileChange(newFile);
      } else {
        setAudioError('Dropped file is not an audio file');
        console.warn('Dropped file is not an audio file:', file.type);
      }
    }
  };

  // Play audio with Web Audio API
  const playWebAudio = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;

    // Resume audio context if suspended (due to browser policies)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Stop any currently playing source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    // Create new source
    sourceNodeRef.current = audioContextRef.current.createBufferSource();
    sourceNodeRef.current.buffer = audioBufferRef.current;
    sourceNodeRef.current.connect(analyserRef.current!);

    // Calculate offset based on current position
    const offset = isDragging ? currentTime : pausedTimeRef.current;

    // Start playback
    sourceNodeRef.current.start(0, offset);
    startTimeRef.current = audioContextRef.current.currentTime;

    // Start time update
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(updateWebAudioTime);

    setIsPlaying(true);
    console.log('Web Audio playback started at offset:', offset);
  }, [currentTime, isDragging, updateWebAudioTime]);

  // Stop Web Audio playback
  const stopWebAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  // Pause Web Audio playback
  const pauseWebAudio = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    // Calculate current position
    pausedTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current + pausedTimeRef.current;

    // Stop source node
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Stop animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    setIsPlaying(false);
    console.log('Web Audio paused at:', pausedTimeRef.current);
  }, [isPlaying]);

  // Playback control functions - decides which implementation to use
  const handlePlayPause = () => {
    if (useWebAudio) {
      if (isPlaying) {
        pauseWebAudio();
      } else {
        playWebAudio();
      }
    } else {
      if (!audioRef.current) return;

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        console.log('Audio paused at:', audioRef.current.currentTime);
      } else {
        // Attempt to play and handle autoplay restrictions
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            console.log('Audio playback started');
          })
          .catch(error => {
            console.error('Play failed:', error);
            setAudioError('Browser blocked autoplay. Please click play again.');
          });
      }
    }
  };

  const handleStop = () => {
    if (useWebAudio) {
      stopWebAudio();
      pausedTimeRef.current = 0;
      setCurrentTime(0);
      console.log('Web Audio playback stopped');
    } else {
      if (!audioRef.current) return;

      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      console.log('Audio playback stopped');
    }
  };

  const handleScrubStart = () => {
    setIsDragging(true);
  };

  const handleScrubEnd = () => {
    setIsDragging(false);

    if (useWebAudio) {
      // Update the paused time for Web Audio API
      pausedTimeRef.current = currentTime;

      // If currently playing, restart playback from new position
      if (isPlaying) {
        playWebAudio();
      }
    } else if (audioRef.current && !isNaN(currentTime)) {
      audioRef.current.currentTime = currentTime;
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    console.log('Seeking to:', newTime);
  };

  // Toggle between HTML5 Audio and Web Audio API
  const toggleAudioImplementation = () => {
    if (isPlaying) {
      // Stop current playback before switching
      if (useWebAudio) {
        stopWebAudio();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }

    setCurrentTime(0);
    pausedTimeRef.current = 0;

    // Toggle implementation
    const newUseWebAudio = !useWebAudio;
    setUseWebAudio(newUseWebAudio);

    // Initialize Web Audio if switching to it and we have an audio file
    if (newUseWebAudio && audioFile) {
      initWebAudio(audioFile);
    }

    console.log(`Switched to ${newUseWebAudio ? 'Web Audio API' : 'HTML5 Audio'}`);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('audio/')) {
        // Create a new reference to the file to avoid potential caching issues
        const newFile = new File([file], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });

        console.log('Selected audio file:', newFile.name, newFile.type);
        onAudioFileChange(newFile);
      } else {
        setAudioError('Selected file is not an audio file');
      }
    }
  };

  return (
    <div
      className={`music-player ${isDragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={playerRef}
    >
      {!audioFile ? (
        <div className="music-player-placeholder">
          <span>Drop audio file here</span>
          <input
            type="file"
            id="audio-file-input"
            className="file-input"
            accept="audio/*"
            onChange={handleFileInputChange}
          />
          <label htmlFor="audio-file-input" className="file-input-label">or click to browse</label>
        </div>
      ) : (
        <>
          <div className="music-player-info">
            <span className="track-name" title={audioFile.name}>
              {audioFile.name.length > 25
                ? `${audioFile.name.substring(0, 22)}...`
                : audioFile.name}
            </span>
          </div>

          <div className="music-player-controls">
            <button
              className="player-button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>

            <button
              className="player-button"
              onClick={handleStop}
              aria-label="Stop"
            >
              ⏹️
            </button>

            <button
              className="player-button api-toggle"
              onClick={toggleAudioImplementation}
              aria-label={useWebAudio ? "Switch to HTML5 Audio" : "Switch to Web Audio API"}
              title={useWebAudio ? "Using Web Audio API" : "Using HTML5 Audio"}
            >
              {useWebAudio ? "🎛️" : "🎵"}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="music-player-progress">
            <input
              type="range"
              min={0}
              max={duration || 1}
              value={currentTime}
              onChange={handleTimeChange}
              onMouseDown={handleScrubStart}
              onMouseUp={handleScrubEnd}
              onTouchStart={handleScrubStart}
              onTouchEnd={handleScrubEnd}
              className="progress-slider"
              aria-label="Playback progress"
            />
          </div>

          {audioError && (
            <div className="error-message">{audioError}</div>
          )}

          {/* Hidden audio element for HTML5 Audio playback */}
          {!useWebAudio && (
            <audio
              ref={audioRef}
              src={audioSrcRef.current}
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                if (audioRef.current) {
                  setDuration(audioRef.current.duration);
                  console.log('Audio metadata loaded, duration:', audioRef.current.duration);
                }
              }}
            />
          )}

          {/* Web Audio API info message */}
          {useWebAudio && (
            <div className="web-audio-info">
              Using Web Audio API
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MusicPlayer;
