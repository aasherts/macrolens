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
    ctx.strokeStyle = 'rgba(164,57,28,0.2)';
    ctx.stroke();
    ctx.restore();
  }
};

ChartJS.register(crosshairPlugin);

const API_URL = process.env.REACT_APP_API_URL || 'https://macrolens-backend.onrender.com';

// ---------- localStorage cache helpers ----------

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore storage errors (e.g. private browsing)
  }
}

function minutesAgo(ts) {
  if (!ts) return null;
  const mins = Math.round((Date.now() - ts) / 60000);
  return mins;
}

// ---------- Small inline icons ----------

const IconOverview = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16l4-6 3 3 5-8" /></svg>
);
const IconSignal = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
);
const IconStar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
);
const IconBriefcase = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
);
const IconTarget = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: IconOverview },
  { id: 'signal', label: 'Signal', icon: IconSignal },
  { id: 'picks', label: 'Top Picks', icon: IconStar },
  { id: 'portfolio', label: 'Portfolio', icon: IconBriefcase },
  { id: 'finder', label: 'Trade Finder', icon: IconTarget },
];

const PAGE_TITLES = {
  overview: 'Overview',
  signal: 'Investment Signal',
  picks: 'Top Picks',
  portfolio: 'Your Portfolio',
  finder: 'Trade Finder',
};

function InfoTip({ text }) {
  return (
    <span className="info-tip" tabIndex={0}>
      ?
      <span className="info-tip-bubble">{text}</span>
    </span>
  );
}

function isMarketOpenNow() {
  const now = new Date();
  const nyString = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const parts = nyString.split(' ');
  const weekday = parts[0].replace(',', '');
  const time = parts[parts.length - 1];
  const [h, m] = time.split(':').map(Number);
  const minutesNow = h * 60 + m;
  const isWeekday = !['Sat', 'Sun'].includes(weekday);
  return isWeekday && minutesNow >= 9 * 60 + 30 && minutesNow < 16 * 60;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
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
  const [macroData, setMacroData] = useState(() => cacheGet('ml_macro_data')?.data || null);
  const [newsData, setNewsData] = useState([]);
  const [marketData, setMarketData] = useState(() => cacheGet('ml_market_data')?.data || []);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState(() => cacheGet('ml_market_data')?.ts || null);
  const [marketIsFresh, setMarketIsFresh] = useState(false);
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [finderCapital, setFinderCapital] = useState('');
  const [finderProfitDollars, setFinderProfitDollars] = useState('');
  const [finderProfitPct, setFinderProfitPct] = useState('');
  const [finderTimeframe, setFinderTimeframe] = useState('week');
  const [finderRisk, setFinderRisk] = useState('medium');
  const [finderPreference, setFinderPreference] = useState('any');
  const [finderResult, setFinderResult] = useState(null);
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderCustomDays, setFinderCustomDays] = useState(7);
  const [topPicks, setTopPicks] = useState(() => cacheGet('ml_top_picks')?.data || []);
  const [topPicksUpdated, setTopPicksUpdated] = useState('');
  const [portfolio, setPortfolio] = useState([
    { ticker: '', shares: '', avg_cost: '' }
  ]);
  const [portfolioResults, setPortfolioResults] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const chartRef = useRef(null);

  // Splash screen: hide after first market data arrives, or after 8s max.
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setStockData(null);
    setSignalData(null);
    setHoverPrice(null);
    setHoverTime(null);
    fetch(`${API_URL}/stock/${ticker}?range=${range}`)
      .then(res => res.json())
      .then(data => setStockData(data));
  }, [ticker, range]);

  useEffect(() => {
    fetch(`${API_URL}/macro`)
      .then(res => res.json())
      .then(data => { setMacroData(data); cacheSet('ml_macro_data', data); });
  }, []);

  useEffect(() => {
    if (stockData) {
      fetch(`${API_URL}/news/${ticker}?company=${encodeURIComponent(stockData.company_name)}`)
        .then(res => res.json())
        .then(data => setNewsData((data.articles || []).slice(0, 5)));
    }
  }, [stockData, ticker]);

  useEffect(() => {
    // Immediately ping the backend on mount to wake a sleeping Render instance.
    const fetchMarket = () => {
      setMarketIsFresh(false);
      fetch(`${API_URL}/market-overview`)
        .then(res => res.json())
        .then(data => {
          const items = data.items || [];
          setMarketData(items);
          setMarketUpdatedAt(Date.now());
          setMarketIsFresh(true);
          cacheSet('ml_market_data', items);
          setShowSplash(false);
        })
        .catch(() => {});
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
      fetch(`${API_URL}/signal/${ticker}?horizon=${horizon}&days=${days}`)
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
        fetch(`${API_URL}/me`, {
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
    fetch(`${API_URL}/donate-clicks`)
      .then(res => res.json())
      .then(data => setDonateClicks(data.clicks || 0));
  }, []);

  useEffect(() => {
    if (activeTab === 'picks') {
      fetch(`${API_URL}/top-picks`)
        .then(res => res.json())
        .then(data => {
          const picks = data.picks || [];
          setTopPicks(picks);
          setTopPicksUpdated(data.last_updated || '');
          cacheSet('ml_top_picks', picks);
        });
    }
  }, [activeTab]);

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);
    if (val.length > 1) {
      fetch(`${API_URL}/search/${val}`)
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
    fetch(`${API_URL}/signal/${ticker}?horizon=${h}&days=${d}`)
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
    const url = authMode === 'login' ? `${API_URL}/login` : `${API_URL}/register`;
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
    await fetch(`${API_URL}/watchlist/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ticker: tickerSymbol, company_name: companyName })
    });
    setUserWatchlist(prev => [...prev.filter(w => w.ticker !== tickerSymbol.toUpperCase()), { ticker: tickerSymbol.toUpperCase(), company_name: companyName }]);
  };

  const handleRemoveFromWatchlist = async (tickerSymbol) => {
    const token = localStorage.getItem('macrolens_token');
    if (!token) return;
    await fetch(`${API_URL}/watchlist/remove/${tickerSymbol}`, {
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
        borderColor: '#a4391c',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Predicted',
        data: [...stockData.prices.map((_, i) => i === stockData.prices.length - 1 ? last : null), ...stockData.prediction.mid],
        borderColor: '#b08a3e',
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
        backgroundColor: 'rgba(164,57,28,0.08)',
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
      x: { grid: { display: false }, ticks: { color: '#9c8e82', font: { size: 11 } } },
      y: { grid: { color: 'rgba(26,21,16,0.05)' }, ticks: { color: '#9c8e82', font: { size: 11 }, callback: v => '$' + v } }
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
      const res = await fetch(`${API_URL}/portfolio`, {
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
      const res = await fetch(`${API_URL}/trade-finder`, {
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

  const marketOpen = isMarketOpenNow();
  const staleMinutes = minutesAgo(marketUpdatedAt);
  const isSaved = !!(stockData && userWatchlist.some(w => w.ticker === ticker.toUpperCase()));

  const SearchInput = ({ className }) => (
    <div className={className} style={{ position: 'relative' }}>
      <input
        placeholder="Search any stock, ETF, or index..."
        value={input}
        onChange={handleInput}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
      />
      {showDropdown && searchResults.length > 0 && (
        <div className="dropdown">
          {searchResults.map((r, i) => (
            <div key={i} className="dropdown-item" onMouseDown={() => { handleSelect(r.symbol); setMobileSearchOpen(false); }}>
              <span className="dropdown-symbol">{r.symbol}</span>
              <span className="dropdown-name">{r.name}</span>
              <span className="dropdown-type">{r.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="app">
      {showSplash && (
        <div className="splash" style={{ opacity: showSplash ? 1 : 0 }}>
          <img src="/shortley-shield.png" alt="MacroLens shield" className="splash-shield" />
          <div className="splash-brand">MacroLens</div>
          <div className="splash-status">
            Connecting to market data
            <span className="splash-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        </div>
      )}

      <div className="app-shell">
        <div className="sidebar">
          <div className="sidebar-logo">
            <img src="/shortley-shield.png" alt="Shortley shield" className="sidebar-shield" />
            <span className="sidebar-brand">MacroLens</span>
          </div>
          <div className="sidebar-tagline">Financial intelligence for everyone</div>

          <div className="sidebar-section-label">Explore</div>
          <div className="sidebar-nav">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="sidebar-section-label">Your Watchlist</div>
          <div className="sidebar-watchlist">
            {userWatchlist.length === 0 ? (
              <div className="sidebar-watchlist-empty">No saved tickers yet — click "Save" on any stock to add it here.</div>
            ) : (
              userWatchlist.map((w, i) => (
                <div key={i} className="sidebar-watchlist-item" onClick={() => { setTicker(w.ticker); setInput(w.ticker); setActiveTab('overview'); }}>
                  <span className="sidebar-watchlist-ticker">{w.ticker}</span>
                  <span className="sidebar-watchlist-name">{w.company_name}</span>
                  <span className="sidebar-watchlist-remove" onClick={(e) => { e.stopPropagation(); handleRemoveFromWatchlist(w.ticker); }}>✕</span>
                </div>
              ))
            )}
          </div>

          {user ? (
            <div className="sidebar-account">
              <div className="sidebar-account-avatar">{user.username[0].toUpperCase()}</div>
              <div className="sidebar-account-name">{user.username}</div>
              <button className="sidebar-account-signout" onClick={handleLogout}>Sign out</button>
            </div>
          ) : (
            <div className="sidebar-auth-buttons">
              <button className="auth-btn" style={{ flex: 1 }} onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Sign in</button>
              <button className="auth-btn primary" style={{ flex: 1 }} onClick={() => { setAuthMode('register'); setShowAuth(true); }}>Sign up</button>
            </div>
          )}

          <div className="sidebar-mission">
            Breaking down the walls of financial inequality, one insight at a time.
          </div>
        </div>

        <div className="main-area">
          <div className="topbar">
            <div className="topbar-title">{PAGE_TITLES[activeTab]}</div>
            <div className="topbar-search-wrap">
              <SearchInput className="topbar-search" />
            </div>
            <div className="topbar-right">
              <button className="mobile-search-toggle" onClick={() => setMobileSearchOpen(prev => !prev)}>
                <IconSearch />
              </button>
              <div className="market-status">
                <span className={`status-dot ${marketOpen ? 'live' : 'closed'}`}></span>
                <span>{marketOpen ? 'Market Open' : 'Market Closed'}</span>
              </div>
              <div className="market-status">
                <span className={`status-dot ${marketIsFresh ? 'live' : 'updating'}`}></span>
                <span>{marketIsFresh ? 'Live' : 'Updating...'}</span>
              </div>
              {!marketIsFresh && staleMinutes !== null && staleMinutes > 0 && (
                <span className="stale-badge">Data from {staleMinutes}m ago</span>
              )}
            </div>
          </div>

          {mobileSearchOpen && (
            <div className="mobile-search-bar">
              <SearchInput className="" />
            </div>
          )}

          {marketData.length > 0 && (
            <div className="ticker-bar">
              <div className="ticker-track">
                {[...marketData, ...marketData].map((item, i) => (
                  <div key={i} className="ticker-item">
                    <span className="ticker-name">{item.name}</span>
                    <span className="ticker-price">${item.price.toLocaleString()}</span>
                    <span className={item.change >= 0 ? 'ticker-up' : 'ticker-down'}>
                      {item.change >= 0 ? '+' : ''}{item.change_pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  <div style={{flex:1, height:'1px', background:'#e8e2d9'}}></div>
                  <span style={{fontSize:'11px', color:'#9c8e82'}}>or</span>
                  <div style={{flex:1, height:'1px', background:'#e8e2d9'}}></div>
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

          <div className="page">

            {activeTab === 'overview' && (
              <div className="overview-grid">
                <div>
                  <div className="hero-card">
                    <div className="hero-top">
                      <div>
                        <div className="hero-name">{stockData ? stockData.company_name : 'Loading...'}</div>
                        <div className="hero-ticker-tag">{ticker.toUpperCase()}</div>
                      </div>
                      {stockData && (
                        <button
                          className={`watchlist-save-btn ${isSaved ? 'saved' : ''}`}
                          onClick={() => isSaved ? handleRemoveFromWatchlist(ticker) : handleAddToWatchlist(ticker, stockData.company_name)}
                        >
                          {isSaved ? '★ Saved' : '☆ Save to watchlist'}
                        </button>
                      )}
                    </div>

                    {!stockData ? (
                      <div className="skeleton-text-block" style={{marginTop: '14px'}}>
                        <div className="skeleton skeleton-line" style={{height: '48px', width: '40%'}}></div>
                        <div className="skeleton skeleton-line" style={{width: '30%'}}></div>
                      </div>
                    ) : (
                      <>
                        <div className="hero-price">
                          ${hoverPrice ? hoverPrice.toFixed(2) : stockData.current}
                        </div>
                        <div className="hero-change-row">
                          <span className={`change-pill ${stockData.change >= 0 ? 'pos' : 'neg'}`}>
                            {stockData.change >= 0 ? '+' : ''}{stockData.change} ({stockData.change_pct}%)
                          </span>
                          <span className="hero-asof">
                            {hoverPrice ? hoverTime : 'as of latest close, NASDAQ/NYSE'}
                          </span>
                        </div>

                        <div className="quick-stats">
                          <div>
                            <div className="quick-stat-label">
                              Market Cap
                              <InfoTip text="The total value of all shares — like the company's price tag." />
                            </div>
                            <div className="quick-stat-value">{stockData?.sentiment?.market_cap || '--'}</div>
                          </div>
                          <div>
                            <div className="quick-stat-label">
                              P/E Ratio
                              <InfoTip text="Price divided by earnings per share. A simple way to see if a stock looks expensive relative to its profits." />
                            </div>
                            <div className="quick-stat-value">{stockData?.sentiment?.pe_ratio || '--'}</div>
                          </div>
                          <div>
                            <div className="quick-stat-label">Volume</div>
                            <div className="quick-stat-value">--</div>
                          </div>
                          <div>
                            <div className="quick-stat-label">52w Range</div>
                            <div className="quick-stat-value" style={{fontSize: '13px'}}>
                              {stockData?.sentiment?.fifty_two_low ? `$${stockData.sentiment.fifty_two_low} – $${stockData.sentiment.fifty_two_high}` : '--'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="card" style={{marginBottom: '16px'}} onMouseLeave={() => { setHoverPrice(null); setHoverTime(null); if(chartRef.current) { chartRef.current._crosshairX = null; chartRef.current.draw(); }}}>
                    <div className="chart-card-head">
                      <div className="card-title" style={{marginBottom: 0}}>Price History</div>
                      <div className="range-selector">
                        {ranges.map(r => (
                          <button key={r} className={`range-btn ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>
                            {r.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="chart-wrapper">
                      {stockData ? <Line ref={chartRef} data={priceData} options={chartOptions} /> : (
                        <div className="skeleton skeleton-chart"></div>
                      )}
                    </div>
                    <div className="chart-legend">
                      <span><span style={{width:'20px', height:'2px', background:'#a4391c', display:'inline-block'}}></span>Actual</span>
                      <span><span style={{width:'20px', height:'2px', background:'#b08a3e', display:'inline-block'}}></span>Predicted</span>
                      <span><span style={{width:'10px', height:'10px', background:'rgba(164,57,28,0.08)', display:'inline-block', borderRadius:'2px'}}></span>Confidence band</span>
                    </div>
                  </div>

                  <div className="card analysis-card">
                    <div className="card-title">What's moving this stock</div>
                    <div className="why-panel">
                      {stockData && stockData.analysis ? (
                        stockData.analysis.split('\n').filter(line => line.trim()).map((line, i) => (
                          <div key={i} className="why-item">
                            <span className="bullet">•</span>
                            <span>{line.replace(/^[•\-*]\s*/, '').replace(/\*\*/g, '')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="skeleton-text-block">
                          <div className="skeleton skeleton-line" style={{width:'100%'}}></div>
                          <div className="skeleton skeleton-line" style={{width:'90%'}}></div>
                          <div className="skeleton skeleton-line" style={{width:'75%'}}></div>
                          <div className="skeleton skeleton-line" style={{width:'85%'}}></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="right-col">
                  <div className="card signal-summary-card">
                    <div className="card-title">Signal</div>
                    <div className={`signal-summary-badge ${signalData?.signal === 'BUY' ? 'buy' : signalData?.signal === 'SELL' ? 'sell' : 'hold'}`}
                      style={{
                        background: signalData?.signal === 'BUY' ? 'var(--pos-soft)' : signalData?.signal === 'SELL' ? 'var(--neg-soft)' : 'var(--gold-soft)',
                        color: signalData?.signal === 'BUY' ? 'var(--pos)' : signalData?.signal === 'SELL' ? 'var(--neg)' : 'var(--gold)',
                      }}>
                      {signalData ? signalData.signal : '--'}
                    </div>
                    <div>
                      <span className="signal-summary-link" onClick={() => setActiveTab('signal')}>View full signal →</span>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">Market Pulse</div>
                    <div className="macro-row">
                      <span className="macro-name">Fed Funds Rate</span>
                      <span className="macro-val">
                        {macroData?.fed_rate ? `${macroData.fed_rate.value}%` : '--'}
                        <span className={`trend-arrow ${macroData?.fed_rate?.change === 0 ? 'flat' : macroData?.fed_rate?.change > 0 ? 'up' : 'down'}`}>
                          {macroData?.fed_rate ? (macroData.fed_rate.change === 0 ? '→' : macroData.fed_rate.change > 0 ? '↑' : '↓') : ''}
                        </span>
                      </span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-name">
                        CPI Inflation
                        <InfoTip text="Consumer Price Index — tracks how fast the prices of everyday goods are rising." />
                      </span>
                      <span className="macro-val">
                        {macroData?.cpi ? macroData.cpi.value : '--'}
                        <span className={`trend-arrow ${macroData?.cpi?.change > 0 ? 'up' : 'down'}`}>{macroData?.cpi ? (macroData.cpi.change > 0 ? '↑' : '↓') : ''}</span>
                      </span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-name">10Y Yield</span>
                      <span className="macro-val">
                        {macroData?.ten_year_yield ? `${macroData.ten_year_yield.value}%` : '--'}
                        <span className={`trend-arrow ${macroData?.ten_year_yield?.change > 0 ? 'up' : 'down'}`}>{macroData?.ten_year_yield ? (macroData.ten_year_yield.change > 0 ? '↑' : '↓') : ''}</span>
                      </span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-name">
                        VIX
                        <InfoTip text="The 'fear index' — measures how nervous the market is. Higher means more uncertainty." />
                      </span>
                      <span className="macro-val">
                        {macroData?.vix ? macroData.vix.value : '--'}
                        <span className={`trend-arrow ${macroData?.vix && parseFloat(macroData.vix.value) > 20 ? 'up' : 'down'}`}>{macroData?.vix ? (parseFloat(macroData.vix.value) > 20 ? '↑' : '↓') : ''}</span>
                      </span>
                    </div>
                    <div className="macro-row">
                      <span className="macro-name">Unemployment</span>
                      <span className="macro-val">
                        {macroData?.unemployment ? `${macroData.unemployment.value}%` : '--'}
                        <span className={`trend-arrow ${macroData?.unemployment?.change > 0 ? 'up' : 'down'}`}>{macroData?.unemployment ? (macroData.unemployment.change > 0 ? '↑' : '↓') : ''}</span>
                      </span>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">Latest News</div>
                    {newsData.length > 0 ? newsData.slice(0, 5).map((article, i) => (
                      <div key={i} className="news-item">
                        <a href={article.url} target="_blank" rel="noreferrer">
                          <div className="news-title">{article.title}</div>
                          <div className="news-meta">{article.source} · {article.publishedAt}</div>
                        </a>
                      </div>
                    )) : (
                      <div className="skeleton-text-block">
                        <div className="skeleton skeleton-line" style={{width:'100%'}}></div>
                        <div className="skeleton skeleton-line" style={{width:'60%'}}></div>
                        <div className="skeleton skeleton-line" style={{width:'95%'}}></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'signal' && (
              <div>
                <div className="page-header">
                  <h1>Investment Signal</h1>
                </div>
                <div className="horizon-selector">
                  <button className={`horizon-btn ${horizon === 'day' ? 'active' : ''}`} onClick={() => handleHorizon('day')}>
                    Day Trade
                    <div className="horizon-label">Same day entry/exit</div>
                  </button>
                  <button className={`horizon-btn ${horizon === 'week' ? 'active' : ''}`} onClick={() => handleHorizon('week')}>
                    Swing Trade
                    <div className="horizon-label">3-7 day hold</div>
                  </button>
                  <button className={`horizon-btn ${horizon === 'medium' ? 'active' : ''}`} onClick={() => handleHorizon('medium')}>
                    Position Trade
                    <div className="horizon-label">30 day hold</div>
                  </button>
                  <button className={`horizon-btn ${horizon === 'custom' ? 'active' : ''}`} onClick={() => handleHorizon('custom')}>
                    Custom
                    <div className="horizon-label">Set your timeframe</div>
                  </button>
                </div>

                {showCustom && (
                  <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px', background:'#faf8f4', border:'1px solid #e8e2d9', borderRadius:'10px', padding:'14px 16px'}}>
                    <span style={{fontSize:'13px', color:'#6b5e52'}}>Hold for</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customDays}
                      onChange={e => setCustomDays(parseInt(e.target.value))}
                      style={{width:'80px', background:'#ffffff', border:'1px solid #e8e2d9', borderRadius:'6px', padding:'6px 10px', color:'#1a1510', fontSize:'14px', fontWeight:'500', outline:'none'}}
                    />
                    <span style={{fontSize:'13px', color:'#6b5e52'}}>days</span>
                    <button
                      onClick={handleCustomSubmit}
                      style={{padding:'7px 16px', background:'#a4391c', border:'none', borderRadius:'6px', color:'#fff', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter, sans-serif'}}
                    >
                      Generate signal
                    </button>
                  </div>
                )}

                {signalLoading && (
                  <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
                    <div style={{fontSize:'14px', color:'#6b5e52'}}>Generating investment signal...</div>
                    <div style={{fontSize:'12px', color:'#9c8e82', marginTop:'8px', marginBottom:'20px'}}>Analysing momentum, macro environment, and historical patterns</div>
                    <div style={{width:'200px', height:'3px', background:'#e8e2d9', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
                      <div style={{height:'100%', background:'#a4391c', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
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
                          <div className="signal-stat-label">Entry Price</div>
                          <div className="signal-stat-value">${signalData.entry_price}</div>
                          <div className="signal-stat-sub">{signalData.entry_window}</div>
                        </div>
                        <div className="signal-stat">
                          <div className="signal-stat-label">Exit Target</div>
                          <div className="signal-stat-value pos">${signalData.exit_target}</div>
                          <div className="signal-stat-sub">{signalData.exit_timeframe}</div>
                        </div>
                        <div className="signal-stat">
                          <div className="signal-stat-label">
                            Stop Loss
                            <InfoTip text="The price at which you automatically sell to prevent bigger losses." />
                          </div>
                          <div className="signal-stat-value neg">${signalData.stop_loss}</div>
                          <div className="signal-stat-sub">Max loss protection</div>
                        </div>
                        <div className="signal-stat">
                          <div className="signal-stat-label">Potential Return</div>
                          <div className="signal-stat-value pos">+{signalData.potential_return}%</div>
                          <div className="signal-stat-sub">If target hit</div>
                        </div>
                        <div className="signal-stat">
                          <div className="signal-stat-label">Risk/Reward</div>
                          <div className="signal-stat-value warn">{signalData.risk_reward_ratio}</div>
                          <div className="signal-stat-sub">{signalData.position_size}</div>
                        </div>
                        <div className="signal-stat">
                          <div className="signal-stat-label">Confidence</div>
                          <div className="signal-stat-value">{signalData.confidence}%</div>
                          <div className="confidence-bar">
                            <div className="confidence-fill" style={{width:`${signalData.confidence}%`}}></div>
                          </div>
                        </div>
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px'}}>
                        <div className="signal-section">
                          <div className="signal-section-title">Risk Level</div>
                          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                            <span style={{fontSize:'13px', color:'#6b5e52'}}>Risk rating</span>
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
                        <div className="signal-section-title">Investment Rationale</div>
                        <div className="signal-rationale">
                          {signalData.rationale?.map((point, i) => (
                            <p key={i}><span className="rationale-dot"></span><span>{point}</span></p>
                          ))}
                        </div>
                      </div>

                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                        <div className="signal-section">
                          <div className="signal-section-title">Key Catalysts</div>
                          <div className="signal-rationale">
                            {signalData.catalysts?.map((c, i) => (
                              <p key={i}><span className="rationale-dot" style={{background:'#2d7a4f'}}></span><span>{c}</span></p>
                            ))}
                          </div>
                        </div>
                        <div className="signal-section">
                          <div className="signal-section-title">Key Risks</div>
                          <div className="signal-rationale">
                            {signalData.key_risks?.map((r, i) => (
                              <p key={i}><span className="rationale-dot" style={{background:'#c94545'}}></span><span>{r}</span></p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="disclaimer-signal">
                      This signal is a starting point for your research, not financial advice. Always understand what you're buying before you invest.
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'picks' && (
              <div>
                <div className="page-header">
                  <h1>Top Picks from the S&P 500</h1>
                  <p>Our algorithm scans all 500 stocks every 15 minutes and surfaces the ones with the strongest momentum. Click any to explore.</p>
                </div>
                {topPicksUpdated && <div style={{fontSize:'11px', color:'#9c8e82', marginBottom:'12px'}}>Updated {topPicksUpdated}</div>}

                {topPicks.length === 0 ? (
                  <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
                    <div style={{fontSize:'14px', color:'#6b5e52'}}>Scanning S&P 500...</div>
                    <div style={{width:'200px', height:'3px', background:'#e8e2d9', borderRadius:'2px', margin:'20px auto 0', overflow:'hidden'}}>
                      <div style={{height:'100%', background:'#a4391c', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
                    </div>
                  </div>
                ) : (
                  <div className="picks-grid">
                    {topPicks.map((pick, i) => (
                      <div key={i} className="pick-card" onClick={() => { setTicker(pick.ticker); setInput(pick.ticker); setActiveTab('overview'); }}>
                        <div className="pick-top-row">
                          <div className="pick-rank">#{i + 1}</div>
                          <div className="pick-sector-pill">{pick.sector}</div>
                        </div>
                        <div className="pick-ticker">{pick.ticker}</div>
                        <div className="pick-name">{pick.company_name}</div>
                        <div className="pick-price">${pick.price.toLocaleString()}</div>
                        <div className="pick-stats">
                          <span className={`pick-pill ${pick.mom_7d >= 0 ? 'pos' : 'neg'}`}>7D {pick.mom_7d >= 0 ? '+' : ''}{pick.mom_7d}%</span>
                          <span className={`pick-pill ${pick.mom_30d >= 0 ? 'pos' : 'neg'}`}>30D {pick.mom_30d >= 0 ? '+' : ''}{pick.mom_30d}%</span>
                          <span className="pick-pill score">Score {pick.score}</span>
                        </div>
                        <div className="pick-footer">Click to analyse →</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{fontSize:'11px', color:'#9c8e82', textAlign:'center', padding:'16px'}}>
                  Top picks are based on momentum scoring, not financial advice. Always do your own research.
                </div>
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div>
                <div className="page-header">
                  <h1>Your Portfolio</h1>
                  <p>Add your holdings below and we'll give you an institutional-grade analysis of your portfolio — the same analysis wealth managers charge thousands for.</p>
                </div>
                <div className="portfolio-input">
                  <div className="portfolio-input-title">Portfolio Analyser</div>
                  <div className="portfolio-input-sub">Enter your holdings to get analysis of your portfolio</div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:'8px', marginBottom:'8px'}}>
                    <div style={{fontSize:'10px', fontWeight:'700', letterSpacing:'0.8px', color:'#9c8e82', textTransform:'uppercase', padding:'0 12px'}}>Ticker</div>
                    <div style={{fontSize:'10px', fontWeight:'700', letterSpacing:'0.8px', color:'#9c8e82', textTransform:'uppercase', padding:'0 12px'}}>Shares</div>
                    <div style={{fontSize:'10px', fontWeight:'700', letterSpacing:'0.8px', color:'#9c8e82', textTransform:'uppercase', padding:'0 12px'}}>Avg cost ($)</div>
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
                    <div style={{fontSize:'14px', color:'#6b5e52'}}>Analysing your portfolio...</div>
                    <div style={{fontSize:'12px', color:'#9c8e82', marginTop:'8px', marginBottom:'20px'}}>Fetching live prices and generating insights</div>
                    <div style={{width:'200px', height:'3px', background:'#e8e2d9', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
                      <div style={{height:'100%', background:'#a4391c', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
                    </div>
                  </div>
                )}

                {portfolioResults && !portfolioLoading && (
                  <div className="portfolio-results">
                    <div className="portfolio-summary">
                      <div className="portfolio-stat">
                        <div className="portfolio-stat-label">Total Value</div>
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
                        <div className="portfolio-stat-label">Momentum Alerts</div>
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
                            <td>{p.ticker}</td>
                            <td style={{fontSize:'12px'}}>{p.company_name}</td>
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
                      <div className="portfolio-analysis-title">Portfolio Analysis</div>
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
                <div className="page-header">
                  <h1>Find Your Next Trade</h1>
                  <p>Tell us your budget and goals. We'll find the best opportunity from the S&P 500 right now.</p>
                </div>
                <div className="portfolio-input">
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
                      <span style={{fontSize:'13px', color:'#6b5e52'}}>Hold for</span>
                      <input type="number" min="1" max="365" value={finderCustomDays} onChange={e => setFinderCustomDays(parseInt(e.target.value))}
                        style={{width:'80px', background:'#ffffff', border:'1px solid #e8e2d9', borderRadius:'6px', padding:'6px 10px', color:'#1a1510', fontSize:'14px', fontWeight:'500', outline:'none'}} />
                      <span style={{fontSize:'13px', color:'#6b5e52'}}>days</span>
                    </div>
                  )}

                  <button className="auth-btn primary" style={{padding:'10px 24px'}} onClick={handleFindTrade} disabled={finderLoading}>
                    {finderLoading ? 'Finding best trade...' : 'Find best trade'}
                  </button>
                </div>

                {finderLoading && (
                  <div className="signal-card" style={{textAlign:'center', padding:'60px'}}>
                    <div style={{fontSize:'14px', color:'#6b5e52'}}>Scanning S&P 500 for your best trade...</div>
                    <div style={{fontSize:'12px', color:'#9c8e82', marginTop:'8px', marginBottom:'20px'}}>Matching your criteria against top momentum stocks</div>
                    <div style={{width:'200px', height:'3px', background:'#e8e2d9', borderRadius:'2px', margin:'0 auto', overflow:'hidden'}}>
                      <div style={{height:'100%', background:'#a4391c', borderRadius:'2px', animation:'loading-bar 2s ease-in-out infinite'}}></div>
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
                        <div className="signal-stat-label">Entry Price</div>
                        <div className="signal-stat-value">${finderResult.entry_price}</div>
                        <div className="signal-stat-sub">{finderResult.entry_window}</div>
                      </div>
                      <div className="signal-stat">
                        <div className="signal-stat-label">Exit Price</div>
                        <div className="signal-stat-value pos">${finderResult.exit_price}</div>
                        <div className="signal-stat-sub">{finderResult.exit_window}</div>
                      </div>
                      <div className="signal-stat">
                        <div className="signal-stat-label">
                          Stop Loss
                          <InfoTip text="The price at which you automatically sell to prevent bigger losses." />
                        </div>
                        <div className="signal-stat-value neg">${finderResult.stop_loss}</div>
                        <div className="signal-stat-sub">Max loss protection</div>
                      </div>
                      {finderResult.shares && (
                        <div className="signal-stat">
                          <div className="signal-stat-label">Shares to Buy</div>
                          <div className="signal-stat-value warn">{finderResult.shares}</div>
                          <div className="signal-stat-sub">Total cost ${finderResult.total_cost}</div>
                        </div>
                      )}
                      <div className="signal-stat">
                        <div className="signal-stat-label">Projected Profit</div>
                        <div className="signal-stat-value pos">${finderResult.projected_profit}</div>
                        <div className="signal-stat-sub">If exit hit</div>
                      </div>
                      <div className="signal-stat">
                        <div className="signal-stat-label">Projected Return</div>
                        <div className="signal-stat-value pos">+{finderResult.projected_return_pct}%</div>
                        <div className="signal-stat-sub">On this trade</div>
                      </div>
                    </div>

                    <div className="signal-section" style={{marginTop:'20px'}}>
                      <div className="signal-section-title">Why This Trade</div>
                      <div className="signal-rationale">
                        {finderResult.rationale?.map((r, i) => (
                          <p key={i}><span className="rationale-dot" style={{background:'#2d7a4f'}}></span><span>{r}</span></p>
                        ))}
                      </div>
                    </div>

                    <div className="signal-section" style={{marginTop:'16px'}}>
                      <div className="signal-section-title">Key Risks</div>
                      <div className="signal-rationale">
                        {finderResult.risks?.map((r, i) => (
                          <p key={i}><span className="rationale-dot" style={{background:'#c94545'}}></span><span>{r}</span></p>
                        ))}
                      </div>
                    </div>

                    <div className="disclaimer-signal" style={{marginTop:'16px'}}>
                      This recommendation is a starting point for your research, not financial advice. Always understand what you're buying before you invest.
                    </div>
                  </div>
                )}

                {finderResult?.error && !finderLoading && (
                  <div className="signal-card" style={{textAlign:'center', padding:'40px'}}>
                    <div style={{fontSize:'14px', color:'#c94545'}}>{finderResult.error}</div>
                  </div>
                )}
              </div>
            )}

            <div className="support-banner">
              <div className="support-banner-text">
                <strong>MacroLens is free, forever.</strong> Financial intelligence shouldn't be a privilege. If this has helped you, consider supporting financial literacy for students who need it most.
                {donateClicks > 0 && <span style={{color:'#2d7a4f', marginLeft:'8px', fontSize:'12px', whiteSpace:'nowrap'}}>♥ {donateClicks} people have supported so far</span>}
              </div>
              <a href="https://www.juniorachievement.org/web/ja-usa/donate"
                target="_blank"
                rel="noreferrer"
                className="support-btn"
                onClick={() => {
                  fetch(`${API_URL}/donate-click`, { method: 'POST' });
                }}
              >
                ♥ Donate to Junior Achievement
              </a>
            </div>
            <div className="disclaimer">MacroLens outputs are probabilistic signals for educational purposes only — not financial advice.</div>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
