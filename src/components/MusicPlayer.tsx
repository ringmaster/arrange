import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/MusicPlayer.css';
import { analyzeFullBuffer } from 'realtime-bpm-analyzer';

// Define a beat info interface to store calculated beat positions
interface BeatInfo {
  beatPositions: number[];  // Time positions of all beats in seconds
  barPositions: number[];   // Time positions of all bars (first beat of each bar) in seconds
  beatsPerBar: number;      // Number of beats in each bar based on time signature
}

interface MusicPlayerProps {
  audioFile: File | null;
  onAudioFileChange: (file: File | null) => void;
  onSeekToBar?: (seekFn: (barIndex: number) => void) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSeekToTime?: (seekFn: (time: number) => void) => void;
  onBpmDetected?: (bpm: number, beatInfo: BeatInfo) => void;
}

// Web Audio API context type
type AudioContextType = AudioContext | null;

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  audioFile,
  onAudioFileChange,
  onSeekToBar,
  onTimeUpdate,
  onSeekToTime,
  onBpmDetected
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [isBpmAnalyzing, setIsBpmAnalyzing] = useState(false);
  // Memoize time signature to avoid unnecessary re-renders
  const timeSignature = useMemo(() => ({ beats: 4, beatUnit: 4 }), []); // Default to 4/4
  const [beatInfo, setBeatInfo] = useState<BeatInfo | null>(null);
  // We track the current bar but not the current beat
  const [currentBar, setCurrentBar] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

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
      audioContextRef.current = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || AudioContext)();

      // Create analyzer for future visualizations
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.connect(audioContextRef.current.destination);

      // Read the file and decode audio data
      const arrayBuffer = await file.arrayBuffer();

      // Decode the audio data and store it in the ref
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      console.log('Web Audio API initialized');
      setDuration(audioBuffer.duration);

      // Return true to indicate successful initialization
      return true;
    } catch (error) {
      console.error('Web Audio API initialization error:', error);
      setAudioError('Failed to initialize Web Audio API.');
      audioBufferRef.current = null;
      return false;
    }
  }, []);

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

  // Handle file upload
  useEffect(() => {
    if (!audioFile) {
      // Reset state when no file is present
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAudioError(null);
      setBpm(null);
      setBeatInfo(null);

      // Clean up Web Audio if it was being used
      if (audioContextRef.current) {
        stopWebAudio();
        audioBufferRef.current = null;
      }

      console.log('Audio file reset');
      return;
    }

    // Reset error state when loading new file
    setAudioError(null);

    // Reset BPM state for new file
    setBpm(null);
    setBeatInfo(null);

    // Reset playback position
    setCurrentTime(0);
    setIsPlaying(false);

    // Initialize Web Audio API
    console.log('Starting Web Audio initialization for:', audioFile.name);
    initWebAudio(audioFile)
      .then(success => {
        if (success) {
          console.log('Web Audio initialized successfully, audioBufferRef is set:', !!audioBufferRef.current);
          console.log('Buffer is now ready for BPM analysis');

          // Directly trigger BPM analysis as soon as buffer is ready
          if (audioBufferRef.current) {
            analyzeFullBuffer(audioBufferRef.current)
              .then((tempoData) => {
                if (tempoData && Array.isArray(tempoData) && tempoData.length > 0) {
                  const topTempo = tempoData[0];
                  if (topTempo && typeof topTempo.tempo === 'number' && !isNaN(topTempo.tempo)) {
                    const detectedBpm = Math.round(topTempo.tempo);
                    console.log('BPM detected:', detectedBpm);
                    setBpm(detectedBpm);

                    // Notify parent about detected BPM
                    if (typeof onBpmDetected === 'function') {
                      const initialBeatInfo = {
                        beatPositions: [],
                        barPositions: [],
                        beatsPerBar: timeSignature.beats
                      };
                      onBpmDetected(detectedBpm, initialBeatInfo);
                    }

                    // Calculate beat positions
                    calculateBeatPositions(detectedBpm);
                  }
                }
              })
              .catch(error => {
                console.error('BPM analysis error:', error);
              })
              .finally(() => {
                setIsBpmAnalyzing(false);
              });
          }
        } else {
          console.error('Web Audio initialization failed');
        }
      });

    // Clean up when component unmounts or file changes
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [audioFile, initWebAudio, stopWebAudio]);

  // Web Audio API time update function
  const updateWebAudioTime = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) {
      return;
    }

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

      // Update current beat and bar information if we have beat info
      if (beatInfo) {
        // Find the current beat
        const currentBeatIndex = beatInfo.beatPositions.findIndex(time => time > currentAudioTime) - 1;
        if (currentBeatIndex >= 0) {
          // Calculate current bar based on beats per bar
          const currentBarIndex = Math.floor(currentBeatIndex / beatInfo.beatsPerBar);
          setCurrentBar(currentBarIndex);
        }
      }

      // Notify parent component about time update
      if (typeof onTimeUpdate === 'function') {
        onTimeUpdate(currentAudioTime, audioBufferRef.current.duration);
      }
    }

    // Continue updating time
    rafIdRef.current = requestAnimationFrame(updateWebAudioTime);
  }, [isPlaying, isDragging, beatInfo, onTimeUpdate, stopWebAudio]);

  // Start Web Audio time updates when playing
  useEffect(() => {
    if (isPlaying) {
      updateWebAudioTime();
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, updateWebAudioTime]);

  // Pause Web Audio playback
  const pauseAudio = useCallback(() => {
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

  // Define play and pause functions first to avoid circular dependencies
  const playAudio = useCallback(() => {
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

  // Define seekToBar function as a callback
  const seekToBar = useCallback((barIndex: number) => {
    // Convert from 1-based (UI) to 0-based (array) index
    const zeroBasedIndex = barIndex - 1;



    // If we don't have beat info yet, estimate time based on duration and totalBars
    if (!beatInfo || !beatInfo.barPositions || beatInfo.barPositions.length === 0) {
      if (audioBufferRef.current && audioBufferRef.current.duration > 0) {
        // Estimate bar position based on audio duration
        const barDuration = audioBufferRef.current.duration / 64; // Default to 64 bars if unknown
        const estimatedTime = (zeroBasedIndex) * barDuration;


        pausedTimeRef.current = estimatedTime;
        setCurrentTime(estimatedTime);

        if (isPlaying) {
          pauseAudio();
          setTimeout(() => playAudio(), 10);
        }
        return;
      }


      return;
    }

    // If the requested bar is beyond detected bars, estimate its position
    if (zeroBasedIndex >= beatInfo.barPositions.length) {
      if (beatInfo.barPositions.length >= 2) {
        // Calculate average bar duration from the last two bars
        const lastBarDuration =
          beatInfo.barPositions[beatInfo.barPositions.length - 1] -
          beatInfo.barPositions[beatInfo.barPositions.length - 2];

        // Extrapolate the time for the requested bar
        const extrapolatedTime =
          beatInfo.barPositions[beatInfo.barPositions.length - 1] +
          (zeroBasedIndex - (beatInfo.barPositions.length - 1)) * lastBarDuration;



        pausedTimeRef.current = extrapolatedTime;
        setCurrentTime(extrapolatedTime);

        if (isPlaying) {
          pauseAudio();
          setTimeout(() => playAudio(), 10);
        }
        return;
      }
    }

    try {
      // Normal case - we have beat info and the bar index is within range
      if (zeroBasedIndex < 0 || zeroBasedIndex >= beatInfo.barPositions.length) {

        return;
      }

      const barTime = beatInfo.barPositions[zeroBasedIndex];
      if (typeof barTime !== 'number' || isNaN(barTime)) {
        console.error(`Invalid bar time for bar ${barIndex} (index ${zeroBasedIndex})`);
        return;
      }

      pausedTimeRef.current = barTime;
      setCurrentTime(barTime);

      if (isPlaying) {
        pauseAudio();
        setTimeout(() => playAudio(), 10); // Small delay to ensure state update
      }


    } catch (error) {
      console.error('Error seeking to bar:', error);
    }
  }, [beatInfo, isPlaying, pauseAudio, playAudio]);

  // Define seekToTime function as a callback
  const seekToTime = useCallback((time: number) => {
    if (!audioBufferRef.current) {
      console.log(`Cannot seek: no audio buffer available`);
      return;
    }

    try {
      // Ensure time is within valid range
      const validTime = Math.max(0, Math.min(time, audioBufferRef.current.duration));

      pausedTimeRef.current = validTime;
      setCurrentTime(validTime);

      if (isPlaying) {
        pauseAudio();
        setTimeout(() => playAudio(), 10); // Small delay to ensure state update
      }

      console.log(`Seeking to time ${validTime}s`);
    } catch (error) {
      console.error('Error seeking to time:', error);
    }
  }, [isPlaying, pauseAudio, playAudio]);

  // Register seekToBar function with parent component
  useEffect(() => {
    if (typeof onSeekToBar === 'function') {
      try {
        // Always register the seekToBar function, even without beat info
        onSeekToBar(seekToBar);

        if (!beatInfo) {
          console.log('Note: Registered seek function but beat info not available yet - will estimate positions');
        }
      } catch (error) {
        console.error('Error registering seek function:', error);
      }
    }
  }, [onSeekToBar, seekToBar]); // Remove beatInfo dependency to ensure it's always registered

  // Register seekToTime function with parent component
  useEffect(() => {
    if (typeof onSeekToTime === 'function' && audioBufferRef.current) {
      try {
        onSeekToTime(seekToTime);
      } catch (error) {
        console.error('Error registering time seek function:', error);
      }
    }
  }, [onSeekToTime, seekToTime]);

  // Calculate beat and bar positions based on BPM and time signature
  const calculateBeatPositions = useCallback((detectedBpm: number) => {
    if (!audioBufferRef.current || !detectedBpm || isNaN(detectedBpm) || detectedBpm <= 0) {
      console.warn('Invalid BPM or audio buffer for beat calculation:', detectedBpm);
      return;
    }

    try {
      const beatsPerSecond = detectedBpm / 60;
      const secondsPerBeat = 60 / detectedBpm;
      const beatsPerBar = timeSignature.beats || 4; // Default to 4 if undefined
      const audioDuration = audioBufferRef.current.duration || 0;
      const totalBeats = Math.max(1, Math.ceil(audioDuration * beatsPerSecond));

      // Assume the first beat starts at 0 seconds (we could add offset detection later)
      const firstBeatOffset = 0;

      // Calculate all beat positions
      const beatPositions: number[] = [];
      for (let i = 0; i < totalBeats; i++) {
        beatPositions.push(firstBeatOffset + i * secondsPerBeat);
      }

      // Calculate bar positions (every nth beat, where n is the number of beats per bar)
      const barPositions: number[] = [];
      for (let i = 0; i < totalBeats; i += beatsPerBar) {
        barPositions.push(firstBeatOffset + i * secondsPerBeat);
      }

      // Make sure we have at least one position
      if (beatPositions.length > 0 && barPositions.length > 0) {
        const newBeatInfo: BeatInfo = {
          beatPositions,
          barPositions,
          beatsPerBar
        };
        console.log(`Beat positions calculated: ${barPositions.length} bars detected`);
        setBeatInfo(newBeatInfo);
        setIsBpmAnalyzing(false);

        // Notify parent about BPM and beat info detection
        if (typeof onBpmDetected === 'function') {
          onBpmDetected(detectedBpm, newBeatInfo);
        }
      } else {
        console.warn('No beat or bar positions calculated');
        setIsBpmAnalyzing(false);
      }
    } catch (error) {
      console.error('Error calculating beat positions:', error);
      setIsBpmAnalyzing(false);
    }
  }, [timeSignature]);

  // Analyze BPM when audio file is loaded
  useEffect(() => {
    const analyzeBPM = async () => {
      if (!audioContextRef.current || !audioBufferRef.current) {
        return;
      }

      try {
        setIsBpmAnalyzing(true);

        // We'll analyze the buffer without playing the audio
        analyzeFullBuffer(audioBufferRef.current)
          .then((tempoData) => {
            // tempoData is an array of tempo candidates with confidence
            if (tempoData && Array.isArray(tempoData) && tempoData.length > 0) {
              // Get the top tempo candidate
              const topTempo = tempoData[0];
              if (topTempo && typeof topTempo.tempo === 'number' && !isNaN(topTempo.tempo)) {
                const detectedBpm = Math.round(topTempo.tempo);
                setBpm(detectedBpm);

                // Always notify parent about detected BPM
                if (typeof onBpmDetected === 'function') {
                  const initialBeatInfo: BeatInfo = {
                    beatPositions: [],
                    barPositions: [],
                    beatsPerBar: timeSignature.beats
                  };
                  onBpmDetected(detectedBpm, initialBeatInfo);
                }

                // Calculate beat and bar positions once we have the BPM
                calculateBeatPositions(detectedBpm);
              } else {
                console.warn('Invalid tempo data received');
                setIsBpmAnalyzing(false);
              }
            } else {
              console.log('No tempo detected');
              setIsBpmAnalyzing(false);
            }
          })
          .catch((error) => {
            console.error('BPM Analysis error:', error);
            setIsBpmAnalyzing(false);
          });
      } catch (error) {
        console.error('Failed to analyze BPM:', error);
        setIsBpmAnalyzing(false);
      }
    };

    // Will use the dedicated secondary effect for analysis
  }, [audioFile]);

  // Dedicated effect to handle BPM analysis as a backup in case direct analysis fails
  useEffect(() => {
    // Only run this if BPM is still null after a delay
    if (!audioFile || !audioBufferRef.current || isBpmAnalyzing || bpm !== null) {
      return;
    }

    // Backup BPM analysis - only runs if the direct approach didn't work
    const backupAnalysisTimeout = setTimeout(() => {
      if (!audioBufferRef.current) {
        return;
      }

      setIsBpmAnalyzing(true);

      analyzeFullBuffer(audioBufferRef.current)
        .then((tempoData) => {
          if (tempoData && Array.isArray(tempoData) && tempoData.length > 0) {
            const topTempo = tempoData[0];
            if (topTempo && typeof topTempo.tempo === 'number' && !isNaN(topTempo.tempo)) {
              const detectedBpm = Math.round(topTempo.tempo);
              console.log('Backup BPM detected:', detectedBpm);
              setBpm(detectedBpm);

              if (typeof onBpmDetected === 'function') {
                const initialBeatInfo: BeatInfo = {
                  beatPositions: [],
                  barPositions: [],
                  beatsPerBar: timeSignature.beats
                };
                onBpmDetected(detectedBpm, initialBeatInfo);
              }

              calculateBeatPositions(detectedBpm);
            }
          }
        })
        .catch(error => {
          console.error('Backup BPM analysis error:', error);
        })
        .finally(() => {
          setIsBpmAnalyzing(false);
        });
    }, 2000); // Long timeout to ensure we don't interfere with direct analysis

    return () => clearTimeout(backupAnalysisTimeout);
  }, [audioFile, audioBufferRef.current, bpm, isBpmAnalyzing, calculateBeatPositions, onBpmDetected, timeSignature]);

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

        console.log('Dropped audio file:', newFile.name);

        // Reset state for new audio file
        setBpm(null);
        setBeatInfo(null);
        setIsBpmAnalyzing(false);
        // Force clear the audio buffer to ensure clean state
        if (audioBufferRef.current) {
          audioBufferRef.current = null;
        }

        // Update the audio file
        onAudioFileChange(newFile);
      } else {
        setAudioError('Dropped file is not an audio file');
        console.warn('Dropped file is not an audio file:', file.type);
      }
    }
  };

  // Playback control functions
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }, [isPlaying, pauseAudio, playAudio]);

  const handleStop = useCallback(() => {
    stopWebAudio();
    pausedTimeRef.current = 0;
    setCurrentTime(0);
    console.log('Web Audio playback stopped');
  }, [stopWebAudio]);

  const handleScrubStart = () => {
    setIsDragging(true);
  };

  const handleScrubEnd = () => {
    setIsDragging(false);

    // Update the paused time for Web Audio API
    pausedTimeRef.current = currentTime;

    // If currently playing, restart playback from new position
    if (isPlaying) {
      playAudio();
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
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

        console.log('Selected audio file:', newFile.name);

        // Reset state for new audio file
        setBpm(null);
        setBeatInfo(null);
        setIsBpmAnalyzing(false);
        // Force clear the audio buffer to ensure clean state
        if (audioBufferRef.current) {
          audioBufferRef.current = null;
        }

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

            <div className="bpm-time-display">
              {isBpmAnalyzing ? (
                <span className="bpm-display analyzing">Analyzing BPM...</span>
              ) : bpm ? (
                <span className="bpm-display" title="Tempo and current position">
                  {bpm} BPM {currentBar !== null ? `| Bar ${currentBar + 1}` : ''}
                </span>
              ) : null}
              <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
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

          <div className="web-audio-info">
            {isBpmAnalyzing
              ? "Analyzing audio BPM..."
              : beatInfo
                ? `${beatInfo.barPositions.length} bars detected | Shift+click on arrangement to seek to bar`
                : "Using Web Audio API for BPM detection"}
          </div>
        </>
      )}
    </div>
  );
};

export default MusicPlayer;
