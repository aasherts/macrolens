import React, { useState, useEffect, useRef } from 'react';
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

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart._crosshairX) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chart._crosshairX, top);
    ctx.lineTo(chart._crosshairX, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.stroke();
    ctx.restore();
  }
};

ChartJS.register(crosshairPlugin);

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [input, setInput] = useState('AAPL');
  const [stockData, setStockData] = useState(null);
  const [signalData, setSignalData] = useState(null);
  const [signalLoading, setSignalLoading] = useState(false);
  const [range, setRange] = useState('1mo');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoverPrice, setHoverPrice] = useState(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [macroData, setMacroData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const chartRef = useRef(null);

  useEffect(() => {
    setStockData(null);
    setSignalData(null);
    setHoverPrice(null);
    setHoverTime(null);
    fetch(`http://127.0.0.1:8000/stock/${ticker}?range=${range}`)
      .then(res => res.json())
      .then(data => setStockData(data));
  }, [ticker, range]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/macro')
      .then(res => res.json())
      .then(data => setMacroData(data));
  }, []);

  useEffect(() => {
    if (stockData) {
      fetch(`http://127.0.0.1:8000/news/${ticker}?company=${encodeURIComponent(stockData.company_name)}`)
        .then(res => res.json())
        .then(data => setNewsData(data.articles || []));
    }
  }, [stockData]);

  useEffect(() => {
    const fetchMarket = () => {
      fetch('http://127.0.0.1:8000/market-overview')
        .then(res => res.json())
        .then(data => setMarketData(data.items || []));
    };
    fetchMarket();
    const interval = setInterval(fetchMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'signal' && !signalData && ticker) {
      setSignalLoading(true);
      fetch(`http://127.0.0.1:8000/signal/${ticker}`)
        .then(res => res.json())
        .then(data => { setSignalData(data); setSignalLoading(false); });
    }
  }, [activeTab, ticker]);

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val.length > 1) {
      fetch(`http://127.0.0.1:8000/search/${val}`)
        .then(res => res.json())
        .then(data => { setSearchResults(data.results); setShowDropdown(true); });
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

  const last = stockData ? stockData.prices[stockData.prices.length - 1] : null;

  const priceData = stockData ? {
    labels: [...stockData.dates, ...stockData.prediction.dates],
    datasets: [
      {
        label: 'Price',
        data: [...stockData.prices, null, null, null],
        borderColor: '#7eb8f7',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Predicted',
        data: [...stockData.prices.map((_, i) => i === stockData.prices.length - 1 ? last : null), ...stockData.prediction.mid],
        borderColor: '#7b1c3e',
        borderWidth: 2,
        borderDash: [5, 3],
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'High band',
        data: [...stockData.prices.map((_, i) => i === stockData.prices.length - 1 ? last : null), ...stockData.prediction.high],
        borderColor: 'transparent',
        backgroundColor: 'rgba(123,28,62,0.15)',
        pointRadius: 0,
        tension: 0.3,
        fill: '+1',
      },
      {
        label: 'Low band',
        data: [...stockData.prices.map((_, i) => i === stockData.prices.length - 1 ? last : null), ...stockData.prediction.low],
        borderColor: 'transparent',
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
    ]
  } : { labels: [], datasets: [] };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onHover: (event, elements, chart) => {
      if (!event.native) return;
      const points = chart.getElementsAtEventForMode(event.native, 'index', { intersect: false }, true);
      if (points.length > 0) {
        const idx = points[0].index;
        const price = chart.data.datasets[0].data[idx];
        chart._crosshairX = points[0].element.x;
        chart.draw();
        if (price !== null && price !== undefined) {
          setHoverPrice(price);
          setHoverTime(chart.data.labels[idx]);
        }
      }
    },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#555555', font: { size: 11 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#555555', font: { size: 11 }, callback: v => '$' + v } }
    }
  };

  const ranges = ['1d', '1w', '1mo', '6mo', 'ytd', '1y', '5y'];

  const getRiskColor = (level) => {
    if (level === 'LOW') return 'pos';
    if (level === 'HIGH') return 'neg';
    return 'warn';
  };

  const getRiskSegments = (level) => {
    if (level === 'LOW') return 1;
    if (level === 'MEDIUM') return 2;
    return 3;
  };

  return (
    <div className="app">
      {marketData.length > 0 && (
        <div className="ticker-bar">
          {marketData.map((item, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-name">{item.name}</span>
              <span className="ticker-price">${item.price.toLocaleString()}</span>
              <span className={item.change >= 0 ? 'ticker-up' : 'ticker-down'}>
                {item.change >= 0 ? '+' : ''}{item.change_pct}%
              </span>
            </div>
          ))}
        </div>
      )}

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
        <div className="watchlist">
          {['AAPL', 'TSLA', 'NVDA', 'SPY', 'BTC-USD', 'GC=F'].map(w => (
            <button
              key={w}
              className={`watch-btn ${ticker === w ? 'active' : ''}`}
              onClick={() => { setTicker(w); setInput(w); }}
            >
              {w === 'GC=F' ? 'GOLD' : w === 'BTC-USD' ? 'BTC' : w}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-label">Current price</div>
          <div className="metric-value">
            ${hoverPrice ? hoverPrice.toFixed(2) : (stockData ? stockData.current : '--')}
          </div>
          <div className="metric-change" style={{color: hoverPrice ? '#7eb8f7' : undefined}}>
            {hoverPrice ? hoverTime : (stockData ? `${stockData.change >= 0 ? '+' : ''}${stockData.change} (${stockData.change_pct}%) today` : '--')}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">7-day forecast</div>
          <div className={`metric-value ${stockData && stockData.prediction.pct >= 0 ? 'up' : 'down'}`}>
            {stockData ? `${stockData.prediction.pct >= 0 ? '+' : ''}${stockData.prediction.pct}%` : '--'}
          </div>
          <div className="metric-change">{stockData ? `Target: $${stockData.prediction.mid[2]}` : '--'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Market cap</div>
          <div className="metric-value">{stockData?.sentiment?.market_cap || '--'}</div>
          <div className="metric-change">{stockData?.sentiment?.recommendation || '--'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">AI signal</div>
          <div className={`metric-value ${signalData?.signal === 'BUY' ? 'up' : signalData?.signal === 'SELL' ? 'down' : ''}`}>
            {signalData ? signalData.signal : (activeTab === 'signal' ? 'Loading...' : 'View signal')}
          </div>
          <div className="metric-change" style={{cursor:'pointer', color:'#7eb8f7'}} onClick={() => setActiveTab('signal')}>
            {signalData ? `${signalData.confidence}% confidence` : 'Click signal tab →'}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'signal' ? 'active' : ''}`} onClick={() => setActiveTab('signal')}>AI signal</button>
        <button className={`tab-btn ${activeTab === 'fundamentals' ? 'active' : ''}`} onClick={() => setActiveTab('fundamentals')}>Fundamentals</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="main-grid">
            <div className="card" onMouseLeave={() => { setHoverPrice(null); setHoverTime(null); if(chartRef.current) { chartRef.current._crosshairX = null; chartRef.current.draw(); }}}>
              <div className="card-title">Price chart — {stockData ? stockData.company_name : '...'}</div>
              <div className="range-selector">
                {ranges.map(r => (
                  <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="chart-wrapper">
                {stockData ? <Line ref={chartRef} data={priceData} options={chartOptions} /> : <div className="loading">Loading...</div>}
              </div>
              <div style={{display:'flex', gap:'16px', marginTop:'10px', fontSize:'11px', color:'#555'}}>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{width:'20px', height:'2px', background:'#7eb8f7', display:'inline-block'}}></span>Actual</span>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{width:'20px', height:'2px', background:'#7b1c3e', display:'inline-block'}}></span>Predicted</span>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{width:'10px', height:'10px', background:'rgba(123,28,62,0.15)', display:'inline-block', borderRadius:'2px'}}></span>Confidence band</span>
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
                ) : <p style={{color:'#555', fontSize:'13px'}}>Loading analysis...</p>}
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="card">
              <div className="card-title">Macro indicators</div>
              <div className="macro-row"><span className="macro-name">Fed funds rate</span><span className="macro-val">{macroData?.fed_rate ? `${macroData.fed_rate.value}%` : '--'}<span className={`badge ${macroData?.fed_rate?.change === 0 ? 'badge-neu' : macroData?.fed_rate?.change > 0 ? 'badge-down' : 'badge-up'}`}>{macroData?.fed_rate ? (macroData.fed_rate.change === 0 ? 'Hold' : macroData.fed_rate.change > 0 ? '↑' : '↓') : ''}</span></span></div>
              <div className="macro-row"><span className="macro-name">CPI inflation</span><span className="macro-val">{macroData?.cpi ? macroData.cpi.value : '--'}<span className={`badge ${macroData?.cpi?.change < 0 ? 'badge-up' : 'badge-down'}`}>{macroData?.cpi ? (macroData.cpi.change > 0 ? '↑ Rising' : '↓ Cooling') : ''}</span></span></div>
              <div className="macro-row"><span className="macro-name">10Y yield</span><span className="macro-val">{macroData?.ten_year_yield ? `${macroData.ten_year_yield.value}%` : '--'}<span className={`badge ${macroData?.ten_year_yield?.change > 0 ? 'badge-down' : 'badge-up'}`}>{macroData?.ten_year_yield ? (macroData.ten_year_yield.change > 0 ? `↑ ${macroData.ten_year_yield.change}` : `↓ ${macroData.ten_year_yield.change}`) : ''}</span></span></div>
              <div className="macro-row"><span className="macro-name">Unemployment</span><span className="macro-val">{macroData?.unemployment ? `${macroData.unemployment.value}%` : '--'}<span className={`badge ${macroData?.unemployment?.change > 0 ? 'badge-down' : 'badge-up'}`}>{macroData?.unemployment ? (macroData.unemployment.change > 0 ? '↑ Rising' : '↓ Falling') : ''}</span></span></div>
              <div className="macro-row"><span className="macro-name">VIX</span><span className="macro-val">{macroData?.vix ? macroData.vix.value : '--'}<span className={`badge ${macroData?.vix && parseFloat(macroData.vix.value) > 20 ? 'badge-down' : 'badge-up'}`}>{macroData?.vix ? (parseFloat(macroData.vix.value) > 20 ? 'Elevated' : 'Low') : ''}</span></span></div>
              <div className="macro-row"><span className="macro-name">GDP</span><span className="macro-val">{macroData?.gdp ? `$${(parseFloat(macroData.gdp.value) / 1000).toFixed(1)}T` : '--'}<span className={`badge ${macroData?.gdp?.change > 0 ? 'badge-up' : 'badge-down'}`}>{macroData?.gdp ? (macroData.gdp.change > 0 ? '↑ Growing' : '↓ Shrinking') : ''}</span></span></div>
            </div>

            <div className="card">
              <div className="card-title">Latest news</div>
              {newsData.length > 0 ? newsData.map((article, i) => (
                <div key={i} style={{padding:'8px 0', borderBottom: i < newsData.length - 1 ? '1px solid #1a1a1a' : 'none'}}>
                  <a href={article.url} target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
                    <div style={{fontSize:'13px', color:'#ffffff', marginBottom:'4px', lineHeight:'1.4', fontWeight:'500'}}>{article.title}</div>
                    <div style={{fontSize:'11px', color:'#555555'}}>{article.source} · {article.publishedAt}</div>
                  </a>
                </div>
              )) : <p style={{color:'#555', fontSize:'13px'}}>Loading news...</p>}
            </div>

            <div className="card">
              <div className="card-title">Market sentiment</div>
              <div className="macro-row"><span className="macro-name">Analyst rating</span><span className="macro-val">{stockData?.sentiment?.recommendation || '--'}</span></div>
              <div className="macro-row"><span className="macro-name">Price target</span><span className="macro-val">{stockData?.sentiment?.target_price ? `$${stockData.sentiment.target_price}` : '--'}</span></div>
              <div className="macro-row"><span className="macro-name">Short ratio</span><span className="macro-val">{stockData?.sentiment?.short_ratio || '--'}</span></div>
              <div className="macro-row"><span className="macro-name">52w high</span><span className="macro-val up">{stockData?.sentiment?.fifty_two_high ? `$${stockData.sentiment.fifty_two_high}` : '--'}</span></div>
              <div className="macro-row"><span className="macro-name">52w low</span><span className="macro-val down">{stockData?.sentiment?.fifty_two_low ? `$${stockData.sentiment.fifty_two_low}` : '--'}</span></div>
              <div className="macro-row"><span className="macro-name">P/E ratio</span><span className="macro-val">{stockData?.sentiment?.pe_ratio || '--'}</span></div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'signal' && (
        <div>
          {signalLoading && (
            <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
              <div style={{fontSize:'14px', color:'#555'}}>Generating AI investment signal...</div>
              <div style={{fontSize:'12px', color:'#333', marginTop:'8px'}}>Analysing momentum, macro environment, and historical patterns</div>
            </div>
          )}

          {!signalLoading && signalData && !signalData.error && (
            <>
              <div className="signal-card">
                <div className="signal-header">
                  <div className={`signal-badge ${signalData.signal === 'BUY' ? 'buy' : signalData.signal === 'SELL' ? 'sell' : 'hold'}`}>
                    {signalData.signal}
                  </div>
                  <div>
                    <div className="signal-title">{stockData?.company_name || ticker} — AI investment signal</div>
                    <div className="signal-subtitle">{signalData.time_horizon} term · {signalData.risk_level} risk · Generated {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="signal-grid">
                  <div className="signal-stat">
                    <div className="signal-stat-label">Entry price</div>
                    <div className="signal-stat-value">${signalData.entry_price}</div>
                    <div className="signal-stat-sub">{signalData.entry_window}</div>
                  </div>
                  <div className="signal-stat">
                    <div className="signal-stat-label">Exit target</div>
                    <div className="signal-stat-value pos">${signalData.exit_target}</div>
                    <div className="signal-stat-sub">{signalData.exit_timeframe}</div>
                  </div>
                  <div className="signal-stat">
                    <div className="signal-stat-label">Stop loss</div>
                    <div className="signal-stat-value neg">${signalData.stop_loss}</div>
                    <div className="signal-stat-sub">Max loss protection</div>
                  </div>
                  <div className="signal-stat">
                    <div className="signal-stat-label">Potential return</div>
                    <div className="signal-stat-value pos">+{signalData.potential_return}%</div>
                    <div className="signal-stat-sub">If target hit</div>
                  </div>
                  <div className="signal-stat">
                    <div className="signal-stat-label">Max risk</div>
                    <div className="signal-stat-value neg">-{signalData.max_risk}%</div>
                    <div className="signal-stat-sub">If stop hit</div>
                  </div>
                  <div className="signal-stat">
                    <div className="signal-stat-label">Risk/reward</div>
                    <div className="signal-stat-value warn">{signalData.risk_reward_ratio}</div>
                    <div className="signal-stat-sub">{signalData.position_size}</div>
                  </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px'}}>
                  <div className="signal-section">
                    <div className="signal-section-title">Confidence score</div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                      <span style={{fontSize:'13px', color:'#888'}}>AI confidence</span>
                      <span style={{fontSize:'13px', fontWeight:'500', color:'#fff'}}>{signalData.confidence}%</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{width:`${signalData.confidence}%`}}></div>
                    </div>
                  </div>
                  <div className="signal-section">
                    <div className="signal-section-title">Risk level</div>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                      <span style={{fontSize:'13px', color:'#888'}}>Risk rating</span>
                      <span className={`signal-stat-value ${getRiskColor(signalData.risk_level)}`} style={{fontSize:'13px'}}>{signalData.risk_level}</span>
                    </div>
                    <div className="risk-bar">
                      {[1,2,3].map(i => (
                        <div key={i} className={`risk-segment ${i <= getRiskSegments(signalData.risk_level) ? `filled ${signalData.risk_level === 'LOW' ? 'low' : signalData.risk_level === 'MEDIUM' ? 'med' : 'high'}` : ''}`}></div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="signal-section">
                  <div className="signal-section-title">Investment rationale</div>
                  <div className="signal-rationale">
                    {signalData.rationale?.map((point, i) => (
                      <p key={i}><span className="rationale-dot"></span><span>{point}</span></p>
                    ))}
                  </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                  <div className="signal-section">
                    <div className="signal-section-title">Key catalysts</div>
                    <div className="signal-rationale">
                      {signalData.catalysts?.map((c, i) => (
                        <p key={i}><span className="rationale-dot" style={{background:'#4ade80'}}></span><span>{c}</span></p>
                      ))}
                    </div>
                  </div>
                  <div className="signal-section">
                    <div className="signal-section-title">Key risks</div>
                    <div className="signal-rationale">
                      {signalData.key_risks?.map((r, i) => (
                        <p key={i}><span className="rationale-dot" style={{background:'#f87171'}}></span><span>{r}</span></p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="disclaimer-signal">
                This AI signal is for educational purposes only and does not constitute financial advice. Past predictions do not guarantee future results. Always do your own research before investing.
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'fundamentals' && (
        <div className="bottom-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
          <div className="card">
            <div className="card-title">Company fundamentals</div>
            <div className="macro-row"><span className="macro-name">Company</span><span className="macro-val">{stockData?.company_name || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">Ticker</span><span className="macro-val">{stockData?.ticker || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">Market cap</span><span className="macro-val">{stockData?.sentiment?.market_cap || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">P/E ratio</span><span className="macro-val">{stockData?.sentiment?.pe_ratio || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">52w high</span><span className="macro-val up">{stockData?.sentiment?.fifty_two_high ? `$${stockData.sentiment.fifty_two_high}` : '--'}</span></div>
            <div className="macro-row"><span className="macro-name">52w low</span><span className="macro-val down">{stockData?.sentiment?.fifty_two_low ? `$${stockData.sentiment.fifty_two_low}` : '--'}</span></div>
            <div className="macro-row"><span className="macro-name">Analyst rating</span><span className="macro-val">{stockData?.sentiment?.recommendation || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">Price target</span><span className="macro-val">{stockData?.sentiment?.target_price ? `$${stockData.sentiment.target_price}` : '--'}</span></div>
            <div className="macro-row"><span className="macro-name">Short ratio</span><span className="macro-val">{stockData?.sentiment?.short_ratio || '--'}</span></div>
          </div>
          <div className="card">
            <div className="card-title">Macro environment</div>
            <div className="macro-row"><span className="macro-name">Fed funds rate</span><span className="macro-val">{macroData?.fed_rate?.value ? `${macroData.fed_rate.value}%` : '--'}</span></div>
            <div className="macro-row"><span className="macro-name">CPI inflation</span><span className="macro-val">{macroData?.cpi?.value || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">10Y yield</span><span className="macro-val">{macroData?.ten_year_yield?.value ? `${macroData.ten_year_yield.value}%` : '--'}</span></div>
            <div className="macro-row"><span className="macro-name">Unemployment</span><span className="macro-val">{macroData?.unemployment?.value ? `${macroData.unemployment.value}%` : '--'}</span></div>
            <div className="macro-row"><span className="macro-name">VIX</span><span className="macro-val">{macroData?.vix?.value || '--'}</span></div>
            <div className="macro-row"><span className="macro-name">GDP</span><span className="macro-val">{macroData?.gdp?.value ? `$${(parseFloat(macroData.gdp.value)/1000).toFixed(1)}T` : '--'}</span></div>
          </div>
        </div>
      )}

      <div className="disclaimer">MacroLens outputs are probabilistic signals for educational purposes only — not financial advice.</div>
    </div>
  );
}

export default App;
