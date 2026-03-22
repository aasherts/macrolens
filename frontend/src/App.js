import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">macro<span>lens</span></div>
        <input placeholder="Search ticker e.g. AAPL" />
      </div>

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-label">Current price</div>
          <div className="metric-value">$213.49</div>
          <div className="metric-change up">+2.14 (+1.01%) today</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">7-day forecast</div>
          <div className="metric-value up">+4.2%</div>
          <div className="metric-change">68% confidence</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Market cap</div>
          <div className="metric-value">$3.28T</div>
          <div className="metric-change">Mega-cap</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Macro signal</div>
          <div className="metric-value up">Bullish</div>
          <div className="metric-change">3 of 5 indicators</div>
        </div>
      </div>

    </div>
  );
}

export default App;
