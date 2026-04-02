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
import { signInWithGoogle, signOutUser, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [horizon, setHorizon] = useState('medium');
  const [customDays, setCustomDays] = useState(30);
  const [showCustom, setShowCustom] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [donateClicks, setDonateClicks] = useState(0);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [showWatchlistPanel, setShowWatchlistPanel] = useState(false);
  const [finderCapital, setFinderCapital] = useState('');
const [finderProfitDollars, setFinderProfitDollars] = useState('');
const [finderProfitPct, setFinderProfitPct] = useState('');
const [finderTimeframe, setFinderTimeframe] = useState('week');
const [finderDays, setFinderDays] = useState(7);
const [finderRisk, setFinderRisk] = useState('medium');
const [finderPreference, setFinderPreference] = useState('any');
const [finderResult, setFinderResult] = useState(null);
const [finderLoading, setFinderLoading] = useState(false);
const [finderCustomDays, setFinderCustomDays] = useState(7);
  const [topPicks, setTopPicks] = useState([]);
const [topPicksUpdated, setTopPicksUpdated] = useState('');
const [portfolio, setPortfolio] = useState([
  { ticker: '', shares: '', avg_cost: '' }
]);
const [portfolioResults, setPortfolioResults] = useState(null);
const [portfolioLoading, setPortfolioLoading] = useState(false);
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
  }, [stockData, ticker]);

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
    if (activeTab === 'signal' && ticker) {
      setSignalLoading(true);
      setSignalData(null);
      const days = horizon === 'day' ? 1 : horizon === 'week' ? 7 : customDays;
      fetch(`http://127.0.0.1:8000/signal/${ticker}?horizon=${horizon}&days=${days}`)
        .then(res => res.json())
        .then(data => { setSignalData(data); setSignalLoading(false); });
    }
  }, [activeTab, ticker, horizon, customDays]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('macrolens_token', token);
        setUser({ username: firebaseUser.displayName || firebaseUser.email.split('@')[0], email: firebaseUser.email });
        fetch('http://127.0.0.1:8000/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => { if (data.watchlist) setUserWatchlist(data.watchlist); })
          .catch(() => {});
      } else {
        const token = localStorage.getItem('macrolens_token');
        const savedUser = localStorage.getItem('macrolens_user');
        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
  fetch('http://127.0.0.1:8000/donate-clicks')
    .then(res => res.json())
    .then(data => setDonateClicks(data.clicks || 0));
}, []);

  useEffect(() => {
  if (activeTab === 'picks') {
    fetch('http://127.0.0.1:8000/top-picks')
      .then(res => res.json())
      .then(data => {
        setTopPicks(data.picks || []);
        setTopPicksUpdated(data.last_updated || '');
      });
  }
}, [activeTab]);

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

  const fetchSignal = (h, d) => {
    setSignalLoading(true);
    setSignalData(null);
    fetch(`http://127.0.0.1:8000/signal/${ticker}?horizon=${h}&days=${d}`)
      .then(res => res.json())
      .then(data => { setSignalData(data); setSignalLoading(false); });
  };

  const handleHorizon = (h) => {
    setHorizon(h);
    setShowCustom(h === 'custom');
    if (h !== 'custom') {
      const days = h === 'day' ? 1 : h === 'week' ? 7 : 30;
      fetchSignal(h, days);
    }
  };

  const handleCustomSubmit = () => {
    fetchSignal('custom', customDays);
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    const url = authMode === 'login' ? 'http://127.0.0.1:8000/login' : 'http://127.0.0.1:8000/register';
    const body = authMode === 'login'
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, username: authUsername, password: authPassword };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || 'Something went wrong');
      } else {
        localStorage.setItem('macrolens_token', data.token);
        localStorage.setItem('macrolens_user', JSON.stringify({ username: data.username, email: data.email }));
        setUser({ username: data.username, email: data.email });
        setShowAuth(false);
        setAuthEmail(''); setAuthPassword(''); setAuthUsername(''); setAuthError('');
      }
    } catch {
      setAuthError('Connection error');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    try { await signOutUser(); } catch {}
    localStorage.removeItem('macrolens_token');
    localStorage.removeItem('macrolens_user');
    setUser(null);
    setUserWatchlist([]);
  };

  const handleAddToWatchlist = async (tickerSymbol, companyName) => {
    const token = localStorage.getItem('macrolens_token');
    if (!token) { setShowAuth(true); return; }
    await fetch('http://127.0.0.1:8000/watchlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ticker: tickerSymbol, company_name: companyName })
    });
    setUserWatchlist(prev => [...prev.filter(w => w.ticker !== tickerSymbol.toUpperCase()), { ticker: tickerSymbol.toUpperCase(), company_name: companyName }]);
  };

  const handleRemoveFromWatchlist = async (tickerSymbol) => {
    const token = localStorage.getItem('macrolens_token');
    if (!token) return;
    await fetch(`http://127.0.0.1:8000/watchlist/remove/${tickerSymbol}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setUserWatchlist(prev => prev.filter(w => w.ticker !== tickerSymbol.toUpperCase()));
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

  const handlePortfolioAnalysis = async () => {
  const validHoldings = portfolio.filter(h => h.ticker && h.shares && h.avg_cost);
  if (validHoldings.length === 0) return;
  setPortfolioLoading(true);
  setPortfolioResults(null);
  try {
    const res = await fetch('http://127.0.0.1:8000/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdings: validHoldings.map(h => ({
        ticker: h.ticker.toUpperCase(),
        shares: parseFloat(h.shares),
        avg_cost: parseFloat(h.avg_cost)
      }))})
    });
    const data = await res.json();
    setPortfolioResults(data);
  } catch(e) {
    console.error(e);
  }
  setPortfolioLoading(false);
};
const handleFindTrade = async () => {
  setFinderLoading(true);
  setFinderResult(null);
  const days = finderTimeframe === 'day' ? 1 : finderTimeframe === 'week' ? 7 : finderTimeframe === 'month' ? 30 : finderTimeframe === 'year' ? 365 : finderCustomDays;
  try {
    const res = await fetch('http://127.0.0.1:8000/trade-finder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capital: finderCapital ? parseFloat(finderCapital) : null,
        profit_target_dollars: finderProfitDollars ? parseFloat(finderProfitDollars) : null,
        profit_target_pct: finderProfitPct ? parseFloat(finderProfitPct) : null,
        timeframe: finderTimeframe,
        days: days,
        risk_tolerance: finderRisk,
        preference: finderPreference,
      })
    });
    const data = await res.json();
    setFinderResult(data);
  } catch(e) {
    console.error(e);
  }
  setFinderLoading(false);
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
        <div style={{display:'flex', gap:'8px', alignItems:'center', marginLeft:'12px'}}>
          {user ? (
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              <div className="user-pill" style={{position:'relative'}} onClick={() => setShowWatchlistPanel(prev => !prev)}>
  <div className="user-avatar">{user.username[0].toUpperCase()}</div>
  {user.username}
  {showWatchlistPanel && (
    <div style={{
      position:'absolute', top:'36px', right:'0', width:'220px',
      background:'#0e0e0e', border:'1px solid #1a1a1a', borderRadius:'12px',
      padding:'12px', zIndex:1000, boxShadow:'0 8px 32px rgba(0,0,0,0.5)'
    }} onClick={e => e.stopPropagation()}>
      <div style={{fontSize:'11px', fontWeight:'700', letterSpacing:'0.8px', color:'#444', textTransform:'uppercase', marginBottom:'10px'}}>Saved watchlist</div>
      {userWatchlist.length === 0 ? (
        <div style={{fontSize:'12px', color:'#555'}}>No saved tickers yet</div>
      ) : (
        userWatchlist.map((w, i) => (
          <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom: i < userWatchlist.length - 1 ? '1px solid #1a1a1a' : 'none'}}>
            <span style={{fontSize:'13px', color:'#fff', cursor:'pointer', fontWeight:'500'}}
              onClick={() => { setTicker(w.ticker); setInput(w.ticker); setShowWatchlistPanel(false); }}>
              {w.ticker}
            </span>
            <span style={{fontSize:'11px', color:'#555', flex:1, marginLeft:'8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{w.company_name}</span>
            <span style={{fontSize:'11px', color:'#f87171', cursor:'pointer', marginLeft:'8px'}}
              onClick={() => handleRemoveFromWatchlist(w.ticker)}>✕</span>
          </div>
        ))
      )}
    </div>
  )}
</div>
              <button className="auth-btn" onClick={handleLogout}>Sign out</button>
            </div>
          ) : (
            <>
              <button className="auth-btn" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Sign in</button>
              <button className="auth-btn primary" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>Sign up</button>
            </>
          )}
        </div>
      </div>

      {showAuth && (
        <div className="auth-modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setShowAuth(false); }}>
          <div className="auth-modal">
            <div className="auth-modal-title">{authMode === 'login' ? 'Welcome back' : 'Create account'}</div>
            <div className="auth-modal-sub">{authMode === 'login' ? 'Sign in to access your saved watchlist' : 'Save your watchlist and preferences'}</div>

            <button
              className="auth-btn"
              style={{width:'100%', padding:'12px', marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', boxSizing:'border-box'}}
              onClick={async () => {
                try {
                  await signInWithGoogle();
                  setShowAuth(false);
                } catch(e) {
                  setAuthError('Google sign-in failed');
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
              <div style={{flex:1, height:'1px', background:'#1a1a1a'}}></div>
              <span style={{fontSize:'11px', color:'#444'}}>or</span>
              <div style={{flex:1, height:'1px', background:'#1a1a1a'}}></div>
            </div>

            {authMode === 'register' && (
              <div className="auth-field">
                <label>Username</label>
                <input placeholder="e.g. aasher" value={authUsername} onChange={e => setAuthUsername(e.target.value)} />
              </div>
            )}
            <div className="auth-field">
              <label>Email</label>
              <input type="email" placeholder="your@email.com" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()} />
            </div>
            {authError && <div className="auth-error">{authError}</div>}
            <button className="auth-btn primary" style={{width:'100%', padding:'12px', boxSizing:'border-box'}} onClick={handleAuth} disabled={authLoading}>
              {authLoading ? 'Loading...' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <div className="auth-switch">
              {authMode === 'login' ? <>No account? <span onClick={() => { setAuthMode('register'); setAuthError(''); }}>Sign up</span></> : <>Already have an account? <span onClick={() => { setAuthMode('login'); setAuthError(''); }}>Sign in</span></>}
            </div>
          </div>
        </div>
      )}

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
          <div className="metric-label">Signal</div>
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
  <button className={`tab-btn ${activeTab === 'signal' ? 'active' : ''}`} onClick={() => setActiveTab('signal')}>Signal</button>
  <button className={`tab-btn ${activeTab === 'picks' ? 'active' : ''}`} onClick={() => setActiveTab('picks')}>Top picks</button>
  <button className={`tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>Portfolio</button>
  <button className={`tab-btn ${activeTab === 'finder' ? 'active' : ''}`} onClick={() => setActiveTab('finder')}>Trade finder</button>
  <button className={`tab-btn ${activeTab === 'fundamentals' ? 'active' : ''}`} onClick={() => setActiveTab('fundamentals')}>Fundamentals</button>
</div>

      {activeTab === 'overview' && (
        <>
          <div className="main-grid">
            <div className="card" onMouseLeave={() => { setHoverPrice(null); setHoverTime(null); if(chartRef.current) { chartRef.current._crosshairX = null; chartRef.current.draw(); }}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
  <div className="card-title" style={{marginBottom:0}}>Price chart — {stockData ? stockData.company_name : '...'}</div>
  {stockData && (
    <button
      onClick={() => {
        const isInWatchlist = userWatchlist.some(w => w.ticker === ticker.toUpperCase());
        if (isInWatchlist) {
          handleRemoveFromWatchlist(ticker);
        } else {
          handleAddToWatchlist(ticker, stockData.company_name);
        }
      }}
      style={{
        padding:'6px 12px',
        borderRadius:'6px',
        border: userWatchlist.some(w => w.ticker === ticker.toUpperCase()) ? '1px solid #3b82f6' : '1px solid #1a1a1a',
        background: userWatchlist.some(w => w.ticker === ticker.toUpperCase()) ? '#111' : 'transparent',
        color: userWatchlist.some(w => w.ticker === ticker.toUpperCase()) ? '#7eb8f7' : '#555',
        fontSize:'11px',
        fontWeight:'600',
        cursor:'pointer',
        fontFamily:'Inter, sans-serif',
      }}
    >
      {userWatchlist.some(w => w.ticker === ticker.toUpperCase()) ? '★ Saved' : '☆ Save'}
    </button>
  )}
</div>
              <div className="range-selector">
                {ranges.map(r => (
                  <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="chart-wrapper">
                {stockData ? <Line ref={chartRef} data={priceData} options={chartOptions} /> : (
                  <div className="loading">
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:'13px', color:'#555', marginBottom:'8px'}}>Fetching market data and generating analysis...</div>
                      <div style={{width:'200px', height:'3px', background:'#1a1a1a', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
                        <div style={{height:'100%', background:'#3b82f6', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:'flex', gap:'16px', marginTop:'10px', fontSize:'11px', color:'#555'}}>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{width:'20px', height:'2px', background:'#7eb8f7', display:'inline-block'}}></span>Actual</span>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{width:'20px', height:'2px', background:'#7b1c3e', display:'inline-block'}}></span>Predicted</span>
                <span style={{display:'flex', alignItems:'center', gap:'4px'}}><span style={{width:'10px', height:'10px', background:'rgba(123,28,62,0.15)', display:'inline-block', borderRadius:'2px'}}></span>Confidence band</span>
              </div>
            </div>
            <div className="card">
              <div className="card-title">Why it's moving</div>
              <div className="why-panel">
                {stockData && stockData.analysis ? (
                  stockData.analysis.split('\n').filter(line => line.trim()).map((line, i) => (
                    <div key={i} className="why-item">
                      <span className="bullet">•</span>
                      <span>{line.replace(/^[•\-*]\s*/, '').replace(/\*\*/g, '')}</span>
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
          <div className="horizon-selector">
            <button className={`horizon-btn ${horizon === 'day' ? 'active' : ''}`} onClick={() => handleHorizon('day')}>
              Day trade
              <div className="horizon-label">Same day entry/exit</div>
            </button>
            <button className={`horizon-btn ${horizon === 'week' ? 'active' : ''}`} onClick={() => handleHorizon('week')}>
              Swing trade
              <div className="horizon-label">3-7 day hold</div>
            </button>
            <button className={`horizon-btn ${horizon === 'medium' ? 'active' : ''}`} onClick={() => handleHorizon('medium')}>
              Position trade
              <div className="horizon-label">30 day hold</div>
            </button>
            <button className={`horizon-btn ${horizon === 'custom' ? 'active' : ''}`} onClick={() => handleHorizon('custom')}>
              Custom
              <div className="horizon-label">Set your timeframe</div>
            </button>
          </div>

          {showCustom && (
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', background:'#111', border:'1px solid #1a1a1a', borderRadius:'10px', padding:'14px 16px'}}>
              <span style={{fontSize:'13px', color:'#888'}}>Hold for</span>
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={e => setCustomDays(parseInt(e.target.value))}
                style={{width:'80px', background:'#0a0a0a', border:'1px solid #333', borderRadius:'6px', padding:'6px 10px', color:'#fff', fontSize:'14px', fontWeight:'500', outline:'none'}}
              />
              <span style={{fontSize:'13px', color:'#888'}}>days</span>
              <button
                onClick={handleCustomSubmit}
                style={{padding:'7px 16px', background:'#3b82f6', border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter, sans-serif'}}
              >
                Generate signal
              </button>
            </div>
          )}

          {signalLoading && (
            <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
              <div style={{fontSize:'14px', color:'#555'}}>Generating investment signal...</div>
              <div style={{fontSize:'12px', color:'#333', marginTop:'8px', marginBottom:'20px'}}>Analysing momentum, macro environment, and historical patterns</div>
              <div style={{width:'200px', height:'3px', background:'#1a1a1a', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
                <div style={{height:'100%', background:'#3b82f6', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
              </div>
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
                    <div className="signal-title">{stockData?.company_name || ticker} — Investment signal</div>
                    <div className="signal-subtitle">
                      {horizon === 'day' ? 'Day trade' : horizon === 'week' ? 'Swing trade' : horizon === 'custom' ? `${customDays}-day custom` : 'Position trade'} · {signalData.risk_level} risk · Generated {new Date().toLocaleDateString()}
                    </div>
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
                      <span style={{fontSize:'13px', color:'#888'}}>Confidence</span>
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

      {activeTab === 'picks' && (
  <div>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
      <div>
        <div style={{fontSize:'16px', fontWeight:'600', color:'#fff', letterSpacing:'-0.5px'}}>Top picks from S&P 500</div>
        <div style={{fontSize:'12px', color:'#555', marginTop:'2px'}}>Screened stocks with strongest momentum — refreshes every 15 minutes</div>
      </div>
      {topPicksUpdated && <div style={{fontSize:'11px', color:'#444'}}>Updated {topPicksUpdated}</div>}
    </div>

    {topPicks.length === 0 ? (
      <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
        <div style={{fontSize:'14px', color:'#555'}}>Scanning S&P 500...</div>
        <div style={{width:'200px', height:'3px', background:'#1a1a1a', borderRadius:'2px', margin:'20px auto 0', overflow:'hidden'}}>
          <div style={{height:'100%', background:'#3b82f6', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
        </div>
      </div>
    ) : (
      <div className="picks-grid">
        {topPicks.map((pick, i) => (
          <div key={i} className="pick-card" onClick={() => { setTicker(pick.ticker); setInput(pick.ticker); setActiveTab('overview'); }}>
            <div className="pick-rank">#{i + 1} Top pick</div>
            <div className="pick-ticker">{pick.ticker}</div>
            <div className="pick-name">{pick.company_name}</div>
            <div className="pick-price">${pick.price.toLocaleString()}</div>
            <div className="pick-stats">
              <div className="pick-stat">
                <div className="pick-stat-label">7d</div>
                <div className={`pick-stat-val ${pick.mom_7d >= 0 ? 'pos' : 'neg'}`}>{pick.mom_7d >= 0 ? '+' : ''}{pick.mom_7d}%</div>
              </div>
              <div className="pick-stat">
                <div className="pick-stat-label">30d</div>
                <div className={`pick-stat-val ${pick.mom_30d >= 0 ? 'pos' : 'neg'}`}>{pick.mom_30d >= 0 ? '+' : ''}{pick.mom_30d}%</div>
              </div>
              <div className="pick-stat">
                <div className="pick-stat-label">Score</div>
                <div className="pick-stat-val warn">{pick.score}</div>
              </div>
            </div>
            <div className="pick-sector">{pick.sector}</div>
          </div>
        ))}
      </div>
    )}
    <div style={{fontSize:'11px', color:'#333', textAlign:'center', padding:'12px'}}>
      Top picks are based on momentum scoring, not financial advice. Always do your own research.
    </div>
  </div>
)}

{activeTab === 'portfolio' && (
  <div>
    <div className="portfolio-input">
      <div className="portfolio-input-title">Portfolio analyser</div>
      <div className="portfolio-input-sub">Enter your holdings to get analysis of your portfolio</div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:'8px', marginBottom:'8px'}}>
        <div style={{fontSize:'10px', fontWeight:'700', letterSpacing:'0.8px', color:'#444', textTransform:'uppercase', padding:'0 12px'}}>Ticker</div>
        <div style={{fontSize:'10px', fontWeight:'700', letterSpacing:'0.8px', color:'#444', textTransform:'uppercase', padding:'0 12px'}}>Shares</div>
        <div style={{fontSize:'10px', fontWeight:'700', letterSpacing:'0.8px', color:'#444', textTransform:'uppercase', padding:'0 12px'}}>Avg cost ($)</div>
        <div></div>
      </div>

      {portfolio.map((holding, i) => (
        <div key={i} className="holding-row">
          <input
            className="holding-input"
            placeholder="e.g. AAPL"
            value={holding.ticker}
            onChange={e => {
              const updated = [...portfolio];
              updated[i].ticker = e.target.value.toUpperCase();
              setPortfolio(updated);
            }}
          />
          <input
            className="holding-input"
            placeholder="e.g. 10"
            type="number"
            value={holding.shares}
            onChange={e => {
              const updated = [...portfolio];
              updated[i].shares = e.target.value;
              setPortfolio(updated);
            }}
          />
          <input
            className="holding-input"
            placeholder="e.g. 180.00"
            type="number"
            value={holding.avg_cost}
            onChange={e => {
              const updated = [...portfolio];
              updated[i].avg_cost = e.target.value;
              setPortfolio(updated);
            }}
          />
          <button className="remove-holding" onClick={() => {
            if (portfolio.length === 1) {
              setPortfolio([{ ticker: '', shares: '', avg_cost: '' }]);
            } else {
              setPortfolio(portfolio.filter((_, idx) => idx !== i));
            }
          }}>✕</button>
        </div>
      ))}

      <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
        <button
          className="auth-btn"
          onClick={() => setPortfolio([...portfolio, { ticker: '', shares: '', avg_cost: '' }])}
        >
          + Add position
        </button>
        <button
          className="auth-btn primary"
          style={{padding:'8px 20px'}}
          onClick={handlePortfolioAnalysis}
          disabled={portfolioLoading}
        >
          {portfolioLoading ? 'Analysing...' : 'Analyse portfolio'}
        </button>
      </div>
    </div>

    {portfolioLoading && (
      <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
        <div style={{fontSize:'14px', color:'#555'}}>Analysing your portfolio...</div>
        <div style={{fontSize:'12px', color:'#333', marginTop:'8px', marginBottom:'20px'}}>Fetching live prices and generating insights</div>
        <div style={{width:'200px', height:'3px', background:'#1a1a1a', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
          <div style={{height:'100%', background:'#3b82f6', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
        </div>
      </div>
    )}

    {portfolioResults && !portfolioLoading && (
      <div className="portfolio-results">
        <div className="portfolio-summary">
          <div className="portfolio-stat">
            <div className="portfolio-stat-label">Total value</div>
            <div className="portfolio-stat-value">${portfolioResults.total_value.toLocaleString()}</div>
          </div>
          <div className="portfolio-stat">
            <div className="portfolio-stat-label">Positions</div>
            <div className="portfolio-stat-value">{portfolioResults.positions.length}</div>
          </div>
          <div className="portfolio-stat">
            <div className="portfolio-stat-label">Total P&L</div>
            <div className={`portfolio-stat-value ${portfolioResults.positions.reduce((sum, p) => sum + p.pnl, 0) >= 0 ? 'pos' : 'neg'}`}>
              ${Math.round(portfolioResults.positions.reduce((sum, p) => sum + p.pnl, 0)).toLocaleString()}
            </div>
          </div>
          <div className="portfolio-stat">
            <div className="portfolio-stat-label">Alerts</div>
            <div className={`portfolio-stat-value ${portfolioResults.momentum_alerts.length > 0 ? 'neg' : 'pos'}`}>
              {portfolioResults.momentum_alerts.length > 0 ? `${portfolioResults.momentum_alerts.length} ⚠` : '0 ✓'}
            </div>
          </div>
        </div>

        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th>Shares</th>
              <th>Avg cost</th>
              <th>Current</th>
              <th>Value</th>
              <th>P&L</th>
              <th>7d momentum</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {portfolioResults.positions.map((p, i) => (
              <tr key={i} onClick={() => { setTicker(p.ticker); setInput(p.ticker); setActiveTab('overview'); }}>
                <td style={{color:'#fff', fontWeight:'600'}}>{p.ticker}</td>
                <td style={{color:'#555', fontSize:'12px'}}>{p.company_name}</td>
                <td>{p.shares}</td>
                <td>${p.avg_cost}</td>
                <td>${p.current_price}</td>
                <td>${p.position_value.toLocaleString()}</td>
                <td className={p.pnl >= 0 ? 'pos' : 'neg'}>{p.pnl >= 0 ? '+' : ''}${p.pnl} ({p.pnl_pct}%)</td>
                <td className={p.mom_7d >= 0 ? 'pos' : 'neg'}>{p.mom_7d >= 0 ? '+' : ''}{p.mom_7d}%</td>
                <td>{p.weight}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="portfolio-analysis">
          <div className="portfolio-analysis-title">Portfolio analysis</div>
          <div className="portfolio-analysis-text">
            {portfolioResults.analysis.split('\n').filter(l => l.trim()).map((line, i) => (
              <div key={i} style={{marginBottom:'8px'}}>{line.replace(/\*\*/g, '')}</div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
)}
{activeTab === 'finder' && (
  <div>
    <div className="portfolio-input">
      <div className="portfolio-input-title">Trade finder</div>
      <div className="portfolio-input-sub">Tell us what you want to achieve and we'll find the best trade for you from the S&P 500</div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', marginBottom:'16px'}}>
        <div className="auth-field">
          <label>Capital to invest ($)</label>
          <input className="holding-input" placeholder="e.g. 500 (optional)" type="number" value={finderCapital} onChange={e => setFinderCapital(e.target.value)} />
        </div>
        <div className="auth-field">
          <label>Profit target ($)</label>
          <input className="holding-input" placeholder="e.g. 50 (optional)" type="number" value={finderProfitDollars} onChange={e => setFinderProfitDollars(e.target.value)} />
        </div>
        <div className="auth-field">
          <label>Return target (%)</label>
          <input className="holding-input" placeholder="e.g. 10 (optional)" type="number" value={finderProfitPct} onChange={e => setFinderProfitPct(e.target.value)} />
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', marginBottom:'16px'}}>
        <div className="auth-field">
          <label>Timeframe</label>
          <select className="holding-input" value={finderTimeframe} onChange={e => setFinderTimeframe(e.target.value)} style={{cursor:'pointer'}}>
            <option value="day">Day trade (today)</option>
            <option value="week">Swing trade (1 week)</option>
            <option value="month">Position trade (1 month)</option>
            <option value="year">Long term (1 year)</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="auth-field">
          <label>Risk tolerance</label>
          <select className="holding-input" value={finderRisk} onChange={e => setFinderRisk(e.target.value)} style={{cursor:'pointer'}}>
            <option value="low">Low — preserve capital</option>
            <option value="medium">Medium — balanced</option>
            <option value="high">High — maximise return</option>
          </select>
        </div>
        <div className="auth-field">
          <label>Preference</label>
          <select className="holding-input" value={finderPreference} onChange={e => setFinderPreference(e.target.value)} style={{cursor:'pointer'}}>
            <option value="any">Any sector</option>
            <option value="technology">Technology</option>
            <option value="energy">Energy</option>
            <option value="healthcare">Healthcare</option>
            <option value="financials">Financials</option>
            <option value="consumer">Consumer</option>
            <option value="industrials">Industrials</option>
            <option value="utilities">Utilities</option>
          </select>
        </div>
      </div>

      {finderTimeframe === 'custom' && (
        <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px'}}>
          <span style={{fontSize:'13px', color:'#888'}}>Hold for</span>
          <input type="number" min="1" max="365" value={finderCustomDays} onChange={e => setFinderCustomDays(parseInt(e.target.value))}
            style={{width:'80px', background:'#0a0a0a', border:'1px solid #333', borderRadius:'6px', padding:'6px 10px', color:'#fff', fontSize:'14px', fontWeight:'500', outline:'none'}} />
          <span style={{fontSize:'13px', color:'#888'}}>days</span>
        </div>
      )}

      <button className="auth-btn primary" style={{padding:'10px 24px'}} onClick={handleFindTrade} disabled={finderLoading}>
        {finderLoading ? 'Finding best trade...' : 'Find best trade'}
      </button>
    </div>

    {finderLoading && (
      <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
        <div style={{fontSize:'14px', color:'#555'}}>Scanning S&P 500 for your best trade...</div>
        <div style={{fontSize:'12px', color:'#333', marginTop:'8px', marginBottom:'20px'}}>Matching your criteria against top momentum stocks</div>
        <div style={{width:'200px', height:'3px', background:'#1a1a1a', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
          <div style={{height:'100%', background:'#3b82f6', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
        </div>
      </div>
    )}

    {finderResult && !finderLoading && !finderResult.error && (
      <div className="signal-card">
        <div className="signal-header">
          <div className={`signal-badge ${finderResult.risk_level === 'LOW' ? 'buy' : finderResult.risk_level === 'HIGH' ? 'sell' : 'hold'}`}>
            {finderResult.risk_level} RISK
          </div>
          <div>
            <div className="signal-title">{finderResult.ticker} — {finderResult.company_name}</div>
            <div className="signal-subtitle">Best match for your criteria · {finderResult.confidence}% confidence</div>
          </div>
          <button className="auth-btn primary" style={{marginLeft:'auto', padding:'8px 16px'}}
            onClick={() => { setTicker(finderResult.ticker); setInput(finderResult.ticker); setActiveTab('overview'); }}>
            View full analysis →
          </button>
        </div>

        <div className="signal-grid">
          <div className="signal-stat">
            <div className="signal-stat-label">Entry price</div>
            <div className="signal-stat-value">${finderResult.entry_price}</div>
            <div className="signal-stat-sub">{finderResult.entry_window}</div>
          </div>
          <div className="signal-stat">
            <div className="signal-stat-label">Exit price</div>
            <div className="signal-stat-value pos">${finderResult.exit_price}</div>
            <div className="signal-stat-sub">{finderResult.exit_window}</div>
          </div>
          <div className="signal-stat">
            <div className="signal-stat-label">Stop loss</div>
            <div className="signal-stat-value neg">${finderResult.stop_loss}</div>
            <div className="signal-stat-sub">Max loss protection</div>
          </div>
          {finderResult.shares && (
            <div className="signal-stat">
              <div className="signal-stat-label">Shares to buy</div>
              <div className="signal-stat-value warn">{finderResult.shares}</div>
              <div className="signal-stat-sub">Total cost ${finderResult.total_cost}</div>
            </div>
          )}
          <div className="signal-stat">
            <div className="signal-stat-label">Projected profit</div>
            <div className="signal-stat-value pos">${finderResult.projected_profit}</div>
            <div className="signal-stat-sub">If exit hit</div>
          </div>
          <div className="signal-stat">
            <div className="signal-stat-label">Projected return</div>
            <div className="signal-stat-value pos">+{finderResult.projected_return_pct}%</div>
            <div className="signal-stat-sub">On this trade</div>
          </div>
        </div>

        <div className="signal-section" style={{marginTop:'20px'}}>
          <div className="signal-section-title">Why this trade</div>
          <div className="signal-rationale">
            {finderResult.rationale?.map((r, i) => (
              <p key={i}><span className="rationale-dot" style={{background:'#4ade80'}}></span><span>{r}</span></p>
            ))}
          </div>
        </div>

        <div className="signal-section" style={{marginTop:'16px'}}>
          <div className="signal-section-title">Key risks</div>
          <div className="signal-rationale">
            {finderResult.risks?.map((r, i) => (
              <p key={i}><span className="rationale-dot" style={{background:'#f87171'}}></span><span>{r}</span></p>
            ))}
          </div>
        </div>

        <div className="disclaimer-signal" style={{marginTop:'16px'}}>
          This recommendation is for educational purposes only and does not constitute financial advice. Always do your own research before investing.
        </div>
      </div>
    )}

    {finderResult?.error && !finderLoading && (
      <div className="signal-card" style={{textAlign:'center', padding:'40px'}}>
        <div style={{fontSize:'14px', color:'#f87171'}}>{finderResult.error}</div>
      </div>
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
      <div className="support-banner">
        <div className="support-banner-text">
  <strong>MacroLens is free, forever.</strong> If MacroLens has helped you make a decision, consider to support financial literacy for students who can't afford it.
  {donateClicks > 0 && <span style={{color:'#4ade80', marginLeft:'8px', fontSize:'12px', whiteSpace:'nowrap'}}>♥ {donateClicks} supported</span>}
</div>
        <a href="https://www.juniorachievement.org/web/ja-usa/donate"
  target="_blank"
  rel="noreferrer"
  className="support-btn"
  onClick={() => {
    fetch('http://127.0.0.1:8000/donate-click', { method: 'POST' });
  }}
>
  ♥ Donate to Junior Achievement
</a>
      </div>
      <div className="disclaimer">MacroLens outputs are probabilistic signals for educational purposes only — not financial advice.</div>
    </div>
  );
}

export default App;