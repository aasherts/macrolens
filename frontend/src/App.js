import React, { useState, useEffect } from 'react';
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

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [input, setInput] = useState('AAPL');
  const [stockData, setStockData] = useState(null);
  const [range, setRange] = useState('1mo');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setStockData(null);
    fetch(`http://127.0.0.1:8000/stock/${ticker}?range=${range}`)
      .then(res => res.json())
      .then(data => setStockData(data));
  }, [ticker, range]);

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val.length > 1) {
      fetch(`http://127.0.0.1:8000/search/${val}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data.results);
          setShowDropdown(true);
        });
    } else {
      setShowDropdown(false);
    }
  };

  const handleSelect = (symbol) => {
    setTicker(symbol);
    setInput(symbol);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const priceData = stockData ? {
    labels: stockData.dates,
    datasets: [{
      label: 'Price',
      data: stockData.prices,
      borderColor: '#7eb8f7',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    }]
  } : { labels: [], datasets: [] };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#555555', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#555555', font: { size: 11 }, callback: v => '$' + v }
      }
    }
  };

  const ranges = ['1d', '1w', '1mo', '6mo', 'ytd', '1y', '5y'];

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">macro<span>lens</span></div>
        <div style={{flex:1, position:'relative'}}>
          <input
            placeholder="Search ticker or company name..."
            value={input}
            onChange={handleInput}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {showDropdown && searchResults.length > 0 && (
            <div className="dropdown">
              {searchResults.map((r, i) => (
                <div key={i} className="dropdown-item" onMouseDown={() => handleSelect(r.symbol)}>
                  <span className="dropdown-symbol">{r.symbol}</span>
                  <span className="dropdown-name">{r.name}</span>
                  <span className="dropdown-type">{r.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-label">Current price</div>
          <div className="metric-value">${stockData ? stockData.current : '--'}</div>
          <div className={`metric-change ${stockData && stockData.change >= 0 ? 'up' : 'down'}`}>
            {stockData ? `${stockData.change >= 0 ? '+' : ''}${stockData.change} (${stockData.change_pct}%) today` : '--'}
          </div>
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
          <div className="card-title">Price chart — {stockData ? stockData.company_name : '...'}</div>
          <div className="range-selector">
            {ranges.map(r => (
              <button
                key={r}
                className={`range-btn ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="chart-wrapper">
            {stockData ? <Line data={priceData} options={chartOptions} /> : <div className="loading">Loading...</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Why it's moving — AI analysis</div>
          <div className="why-panel">
            {stockData && stockData.analysis ? (
              stockData.analysis.split('\n').filter(line => line.trim()).map((line, i) => (
                <div key={i} className="why-item">
                  <span className="bullet">•</span>
                  <span>{line.replace(/^[•\-\*]\s*/, '').replace(/\*\*/g, '')}</span>
                </div>
              ))
            ) : (
              <p style={{color:'#555', fontSize:'13px'}}>Loading analysis...</p>
            )}
          </div>
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
            <div style={{fontWeight:'500', fontSize:'13px', marginBottom:'4px', color:'#ffffff'}}>50-day moving average crossover</div>
            <div style={{fontSize:'12px', color:'#555555'}}>Price crossed above 50-DMA 4 days ago — historically bullish in 63% of cases.</div>
          </div>
          <div className="macro-row" style={{display:'block', padding:'8px 0'}}>
            <div style={{fontWeight:'500', fontSize:'13px', marginBottom:'4px', color:'#ffffff'}}>Yield curve normalisation</div>
            <div style={{fontSize:'12px', color:'#555555'}}>2Y–10Y spread narrowed from −80bps to −22bps, correlated with tech sector rotation.</div>
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
