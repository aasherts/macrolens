import React from 'react';
import { SECTOR_COLORS } from '../data/sectorBenchmarks';

// sectors: { [sectorName]: weightPercent }
export default function PortfolioDonut({ sectors }) {
  const entries = Object.entries(sectors || {}).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#f4f1ea" strokeWidth="22" />
          {entries.map(([name, value], i) => {
            const frac = value / total;
            const dash = frac * circumference;
            const circle = (
              <circle
                key={name}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                strokeWidth="22"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return circle;
          })}
        </g>
      </svg>
      <div className="donut-legend">
        {entries.map(([name, value], i) => (
          <div key={name} className="donut-legend-item">
            <span className="donut-dot" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}></span>
            <span className="donut-legend-name">{name}</span>
            <span className="donut-legend-val">{Math.round(value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
