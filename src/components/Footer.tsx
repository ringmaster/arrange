import React from 'react';
import '../styles/Footer.css';

interface FooterProps {
  totalBars: number;
  onUpdateTotalBars: (totalBars: number) => void;
}

const Footer: React.FC<FooterProps> = ({ totalBars, onUpdateTotalBars }) => {
  const handleBarCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBarCount = parseInt(e.target.value, 10);
    onUpdateTotalBars(newBarCount);
  };

  const possibleBarCounts = [16, 24, 32, 48, 64];

  return (
    <footer className="footer">
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

        <div className="shortcuts-info">
          <span className="shortcut-key">Click</span> create/select
          <span className="shortcut-key">Drag</span> move/resize
          <span className="shortcut-key">Delete</span> remove
        </div>

        <div className="app-info">
          Music Arrangement Analyzer v1.0
        </div>
      </div>
    </footer>
  );
};

export default Footer;
