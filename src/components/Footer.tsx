import React, { useState, useEffect, useRef } from 'react';
import '../styles/Footer.css';
import MusicPlayer from './MusicPlayer';

interface FooterProps {
  totalBars: number;
  onUpdateTotalBars: (totalBars: number) => void;
  onSeekToBar?: (seekFn: (barIndex: number) => void) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onSeekToTime?: (seekFn: (time: number) => void) => void;
  onBpmDetected?: (bpm: number, beatInfo: { beatPositions: number[], barPositions: number[], beatsPerBar: number }) => void;
}

const Footer: React.FC<FooterProps> = ({
  totalBars,
  onUpdateTotalBars,
  onSeekToBar,
  onTimeUpdate,
  onSeekToTime,
  onBpmDetected
}) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const footerRef = useRef<HTMLElement>(null);

  const handleBarCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBarCount = parseInt(e.target.value, 10);
    onUpdateTotalBars(newBarCount);
  };

  const possibleBarCounts = [16, 24, 32, 48, 64];

  // Handle file dropping
  useEffect(() => {
    const footerElement = footerRef.current;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) {
        setIsDragging(true);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('audio/')) {
          console.log('Audio file dropped:', file.name, file.type);
          console.log('Footer: Preparing to process audio file for BPM detection');

          // Create an audio element to test if the browser can play this format
          const audio = new Audio();
          const canPlay = audio.canPlayType(file.type);

          if (canPlay === '') {
            console.warn('Browser cannot play this audio format:', file.type);
            alert(`Your browser cannot play this audio format: ${file.type}`);
            return;
          }

          // Important: First set audioFile to null to trigger complete cleanup
          setAudioFile(null);

          // Use a slightly longer timeout to ensure state is fully cleared
          setTimeout(() => {
            // Create a new file object to ensure we have a clean reference
            const newFile = new File([file], file.name, {
              type: file.type,
              lastModified: file.lastModified
            });

            console.log('Footer: Setting new audio file for BPM detection after reset:', newFile.name);
            setAudioFile(newFile);
          }, 100);
        } else {
          console.warn('Dropped file is not an audio file:', file.type);
          alert('Please drop an audio file (MP3, WAV, etc.)');
        }
      }
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only set isDragging to false if we're leaving the footer element itself,
      // not when moving between its children
      if (e.target === footerElement) {
        setIsDragging(false);
      }
    };

    if (footerElement) {
      footerElement.addEventListener('dragover', handleDragOver);
      footerElement.addEventListener('drop', handleDrop);
      footerElement.addEventListener('dragenter', handleDragEnter);
      footerElement.addEventListener('dragleave', handleDragLeave);
    }

    return () => {
      if (footerElement) {
        footerElement.removeEventListener('dragover', handleDragOver);
        footerElement.removeEventListener('drop', handleDrop);
        footerElement.removeEventListener('dragenter', handleDragEnter);
        footerElement.removeEventListener('dragleave', handleDragLeave);
      }
    };
  }, [isDragging]);

  return (
    <footer className={`footer ${isDragging ? 'dragging' : ''}`} ref={footerRef}>
      <div className="footer-content">
        <div className="bar-count-control">
          <label htmlFor="barCount">Total Bars:</label>
          <select
            id="barCount"
            value={totalBars}
            onChange={handleBarCountChange}
          >
            {possibleBarCounts.map(count => (
              <option key={count} value={count}>
                {count} bars
              </option>
            ))}
          </select>
        </div>

        <MusicPlayer
          audioFile={audioFile}
          onAudioFileChange={(file) => {
            console.log('Audio file changed in MusicPlayer:', file?.name);
            // Reset the audio file if there's an error
            if (audioFile && !file) {
              console.log('Resetting audio file due to error');
            }

            // First clear the audio file to trigger a complete reset
            setAudioFile(null);

            // Only set the new file after ensuring complete reset
            if (file) {
              setTimeout(() => {
                console.log('Footer: Setting new audio file after complete reset:', file.name);
                setAudioFile(file);
              }, 200); // Longer timeout for more reliable reset
            }
          }}
          onSeekToBar={onSeekToBar ?
            (seekFn) => {
              if (typeof seekFn === 'function') {
                onSeekToBar(seekFn);
              }
            } : undefined}
          onTimeUpdate={onTimeUpdate ?
            (currentTime, duration) => {
              onTimeUpdate(currentTime, duration);
            } : undefined}
          onSeekToTime={onSeekToTime ?
            (seekFn) => {
              if (typeof seekFn === 'function') {
                onSeekToTime(seekFn);
              }
            } : undefined}
          onBpmDetected={(detectedBpm, beatInfo) => {
            console.log('Footer: BPM detected callback received:', detectedBpm);
            console.log('Footer: Beat info received:', JSON.stringify(beatInfo));
            if (onBpmDetected) {
              console.log('Footer: Forwarding BPM data to App component');
              onBpmDetected(detectedBpm, beatInfo);
            } else {
              console.warn('Footer: No onBpmDetected handler available');
            }
          }}
        />

        <div className="app-info">
          Music Arrangement Analyzer v1.0
        </div>
      </div>
    </footer>
  );
};

export default Footer;
