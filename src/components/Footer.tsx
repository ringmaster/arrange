import React, { useState, useEffect, useRef } from 'react';
import '../styles/Footer.css';
import MusicPlayer from './MusicPlayer';

interface FooterProps {
  totalBars: number;
  onUpdateTotalBars: (totalBars: number) => void;
}

const Footer: React.FC<FooterProps> = ({ totalBars, onUpdateTotalBars }) => {
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

          // Create an audio element to test if the browser can play this format
          const audio = new Audio();
          const canPlay = audio.canPlayType(file.type);

          if (canPlay === '' || canPlay === 'no') {
            console.warn('Browser cannot play this audio format:', file.type);
            alert(`Your browser cannot play this audio format: ${file.type}`);
            return;
          }

          // Ensure we have a clean reference to the file
          const newFile = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified
          });

          setAudioFile(newFile);
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
            setAudioFile(file);
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
