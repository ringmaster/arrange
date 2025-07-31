import React, { useState, useRef } from 'react';
import '../styles/Header.css';

interface HeaderProps {
  arrangementName: string;
  onNameChange: (name: string) => void;
  onExport: () => void;
  onImport: (jsonData: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  arrangementName,
  onNameChange,
  onExport,
  onImport
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(arrangementName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNameClick = () => {
    setTempName(arrangementName);
    setIsEditing(true);
  };

  const handleNameBlur = () => {
    if (tempName.trim()) {
      onNameChange(tempName);
    } else {
      setTempName(arrangementName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setTempName(arrangementName);
      setIsEditing(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onImport(event.target.result as string);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be loaded again if needed
    e.target.value = '';
  };

  return (
    <header className="header">
      <div className="header-title">
        {isEditing ? (
          <input
            type="text"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="title-input"
          />
        ) : (
          <h1
            className="arrangement-title"
            onClick={handleNameClick}
            title="Click to edit arrangement name"
          >
            {arrangementName}
          </h1>
        )}
      </div>
      <div className="header-actions">
        <button
          className="header-button import-button"
          onClick={handleImportClick}
          title="Import arrangement from JSON file"
        >
          Import
        </button>
        <button
          className="header-button export-button"
          onClick={onExport}
          title="Export arrangement as JSON file"
        >
          Export
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />
      </div>
    </header>
  );
};

export default Header;
