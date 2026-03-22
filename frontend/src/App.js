import React from 'react';
import './App.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

const priceData = {
  labels: ['Mar 1','Mar 5','Mar 10','Mar 15','Mar 17','Mar 21'],
  datasets: [
    {
      label: 'Price',
      data: [205, 208, 211, 209, 212, 213],
      borderColor: '#378ADD',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    }
  ]
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => '$' + v } }
  }
};

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

      <div className="main-grid">
        <div className="card">
          <div className="card-title">Price chart</div>
          <div className="chart-wrapper">
            <Line data={priceData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-title">Why it's moving</div>
          <p>Fed paused rate hikes, easing pressure on tech valuations.</p>
        </div>
      </div>

    </div>
  );
}

export default App;
