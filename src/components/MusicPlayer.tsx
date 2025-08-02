import React, { useRef, useState, useEffect } from 'react';
import '../styles/MusicPlayer.css';

interface MusicPlayerProps {
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  audioFile,
  onAudioFileChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioSrcRef = useRef<string>('');

  // Handle file upload and create audio element
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

      console.log('Audio file reset');
      return;
    }

    // Clean up previous URL if it exists
    if (audioSrcRef.current) {
      URL.revokeObjectURL(audioSrcRef.current);
    }

    // Create a new object URL for the audio file
    const objectUrl = URL.createObjectURL(audioFile);
    audioSrcRef.current = objectUrl;

    console.log('Created audio source for:', audioFile.name);

    // Reset error state when loading new file
    setAudioError(null);

    // Reset playback position
    setCurrentTime(0);
    setIsPlaying(false);

    // Clean up when component unmounts or file changes
    return () => {
      if (audioSrcRef.current) {
        URL.revokeObjectURL(audioSrcRef.current);
      }
    };
  }, [audioFile]);

  // Update time display when audio is playing
  useEffect(() => {
    if (!audioRef.current) return;

    // Setup event listeners for the audio element
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
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
  }, []);

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

  // Simple playback control functions using HTML5 audio
  const handlePlayPause = () => {
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
  };

  const handleStop = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    console.log('Audio playback stopped');
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    console.log('Seeking to:', newTime);
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
              className="progress-slider"
              aria-label="Playback progress"
            />
          </div>

          {audioError && (
            <div className="error-message">{audioError}</div>
          )}

          {/* Hidden audio element that does the actual playback */}
          <audio
            ref={audioRef}
            src={audioSrcRef.current}
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </>
      )}
    </div>
  );
};

export default MusicPlayer;
