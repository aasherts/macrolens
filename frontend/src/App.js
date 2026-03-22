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

    <div className="bottom-grid">
        <div className="card">
          <div className="card-title">Macro indicators</div>
          <div className="macro-row"><span className="macro-name">Fed funds rate</span><span className="macro-val">5.25%<span className="badge badge-neu">Hold</span></span></div>
          <div className="macro-row"><span className="macro-name">CPI inflation</span><span className="macro-val">3.1%<span className="badge badge-down">Cooling</span></span></div>
          <div className="macro-row"><span className="macro-name">10Y yield</span><span className="macro-val">4.38%<span className="badge badge-down">Down</span></span></div>
          <div className="macro-row"><span className="macro-name">GDP growth</span><span className="macro-val">2.8%<span className="badge badge-up">Beat</span></span></div>
          <div className="macro-row"><span className="macro-name">VIX</span><span className="macro-val">14.2<span className="badge badge-up">Low</span></span></div>
        </div>

        <div className="card">
          <div className="card-title">Evidence used</div>
          <div className="macro-row" style={{display:'block', padding:'8px 0'}}>
            <div style={{fontWeight:'500', fontSize:'13px', marginBottom:'4px'}}>50-day moving average crossover</div>
            <div style={{fontSize:'12px', color:'#888'}}>Price crossed above 50-DMA 4 days ago — historically bullish for AAPL in 63% of cases.</div>
          </div>
          <div className="macro-row" style={{display:'block', padding:'8px 0'}}>
            <div style={{fontWeight:'500', fontSize:'13px', marginBottom:'4px'}}>Yield curve normalisation</div>
            <div style={{fontSize:'12px', color:'#888'}}>2Y–10Y spread narrowed from −80bps to −22bps, correlated with tech sector rotation.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Market sentiment</div>
          <div className="macro-row"><span className="macro-name">News tone</span><span className="macro-val up">72% positive</span></div>
          <div className="macro-row"><span className="macro-name">Analyst buy</span><span className="macro-val up">81%</span></div>
          <div className="macro-row"><span className="macro-name">Short interest</span><span className="macro-val down">21%</span></div>
          <div className="macro-row"><span className="macro-name">Options skew</span><span className="macro-val up">Bullish</span></div>
        </div>
      </div>

      <div className="disclaimer">MacroLens outputs are probabilistic signals for educational purposes only, not financial advice.</div>

    </div>

  );
}


export default App;
