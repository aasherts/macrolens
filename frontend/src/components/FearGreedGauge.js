import React from 'react';

const LABELS = [
  { max: 20, label: 'Extreme Fear', color: '#9c1c1c' },
  { max: 40, label: 'Fear', color: '#c94545' },
  { max: 60, label: 'Neutral', color: '#b08a3e' },
  { max: 80, label: 'Greed', color: '#5a9e6f' },
  { max: 100, label: 'Extreme Greed', color: '#2d7a4f' },
];

function getZone(score) {
  return LABELS.find(z => score <= z.max) || LABELS[LABELS.length - 1];
}

// score: 0 (extreme fear) - 100 (extreme greed)
export default function FearGreedGauge({ score, explanation }) {
  const zone = getZone(score);
  const angle = (score / 100) * 180; // 0-180 degrees across the semicircle
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const rad = (Math.PI / 180) * (180 - angle);
  const needleX = cx + radius * Math.cos(rad);
  const needleY = cy - radius * Math.sin(rad);

  return (
    <div className="gauge-wrap">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9c1c1c" />
            <stop offset="25%" stopColor="#c94545" />
            <stop offset="50%" stopColor="#b08a3e" />
            <stop offset="75%" stopColor="#5a9e6f" />
            <stop offset="100%" stopColor="#2d7a4f" />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1a1510" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="#1a1510" />
      </svg>
      <div className="gauge-score" style={{ color: zone.color }}>{zone.label}</div>
      <div className="gauge-value">{score}/100</div>
      {explanation && <div className="gauge-explain">{explanation}</div>}
    </div>
  );
}
