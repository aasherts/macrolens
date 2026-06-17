import React, { useState } from 'react';

const PROFILES = {
  conservative: {
    label: 'Conservative',
    strategy: "Focus on stability: broad index funds and well-established, profitable companies that pay dividends. Your priority is protecting what you have while still growing steadily.",
    picks: [
      { ticker: 'JNJ', name: 'Johnson & Johnson', why: "A century-old healthcare company with a long history of steady dividends." },
      { ticker: 'KO', name: 'Coca-Cola', why: "A globally dominant, highly profitable consumer brand with decades of stable returns." },
      { ticker: 'PG', name: 'Procter & Gamble', why: "Makes everyday essentials people buy in every economic environment." },
    ],
  },
  balanced: {
    label: 'Balanced',
    strategy: "A mix of stable, established companies and a few quality growth names. You're comfortable with some ups and downs in exchange for better long-term growth.",
    picks: [
      { ticker: 'AAPL', name: 'Apple', why: "A profitable, well-known company with a loyal customer base and steady growth." },
      { ticker: 'MSFT', name: 'Microsoft', why: "Diversified across software, cloud, and AI with consistently strong earnings." },
      { ticker: 'V', name: 'Visa', why: "Benefits from the steady long-term shift toward digital payments worldwide." },
    ],
  },
  growth: {
    label: 'Growth',
    strategy: "Lean into companies expected to grow revenue and earnings quickly. Expect more volatility along the way in exchange for higher long-term return potential.",
    picks: [
      { ticker: 'NVDA', name: 'Nvidia', why: "At the center of the AI and computing hardware boom, with rapid earnings growth." },
      { ticker: 'AMZN', name: 'Amazon', why: "Continues to expand aggressively across e-commerce, cloud, and advertising." },
      { ticker: 'GOOGL', name: 'Alphabet (Google)', why: "Dominant in search and advertising with major bets on AI for future growth." },
    ],
  },
  aggressive: {
    label: 'Aggressive',
    strategy: "Pursue the highest growth potential, accepting significant volatility and risk of loss. Position sizes should be smaller since swings can be large in either direction.",
    picks: [
      { ticker: 'TSLA', name: 'Tesla', why: "High growth ambitions in EVs and energy, but known for large price swings." },
      { ticker: 'COIN', name: 'Coinbase', why: "Tied closely to the highly volatile cryptocurrency market." },
      { ticker: 'RBLX', name: 'Roblox', why: "A fast-growing but not yet consistently profitable gaming platform." },
    ],
  },
};

const RISK_OPTIONS = [
  { id: 'conservative', label: 'Conservative', desc: "I want to protect my money first" },
  { id: 'balanced', label: 'Balanced', desc: "Some growth, some stability" },
  { id: 'growth', label: 'Growth', desc: "I'm investing for the long run" },
  { id: 'aggressive', label: 'Aggressive', desc: "I can handle big swings for big upside" },
];

const AMOUNT_OPTIONS = ['Under $100', '$100 – $1,000', '$1,000 – $10,000', 'Over $10,000'];
const TIMEFRAME_OPTIONS = ['Less than 1 year', '1 – 3 years', '3 – 10 years', '10+ years'];

export default function Onboarding({ onComplete, onAnalyse }) {
  const [step, setStep] = useState(1);
  const [risk, setRisk] = useState(null);
  const [amount, setAmount] = useState(null);
  const [timeframe, setTimeframe] = useState(null);

  const profile = risk ? PROFILES[risk] : null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`onboarding-dot ${s <= step ? 'active' : ''}`}></div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2>What kind of investor are you?</h2>
            <p className="onboarding-sub">There's no wrong answer — this just helps us tailor suggestions to you.</p>
            <div className="onboarding-options">
              {RISK_OPTIONS.map(opt => (
                <button key={opt.id} className={`onboarding-option ${risk === opt.id ? 'selected' : ''}`} onClick={() => setRisk(opt.id)}>
                  <strong>{opt.label}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-actions">
              <button className="auth-btn" onClick={onComplete}>Skip for now</button>
              <button className="auth-btn primary" disabled={!risk} onClick={() => setStep(2)}>Continue</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>How much are you thinking of investing?</h2>
            <p className="onboarding-sub">Just a rough idea — you can always change this later.</p>
            <div className="onboarding-options">
              {AMOUNT_OPTIONS.map(opt => (
                <button key={opt} className={`onboarding-option ${amount === opt ? 'selected' : ''}`} onClick={() => setAmount(opt)}>
                  <strong>{opt}</strong>
                </button>
              ))}
            </div>
            <div className="onboarding-actions">
              <button className="auth-btn" onClick={() => setStep(1)}>Back</button>
              <button className="auth-btn primary" disabled={!amount} onClick={() => setStep(3)}>Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>How long can you leave the money invested?</h2>
            <p className="onboarding-sub">Money you won't need for years can usually take on more risk.</p>
            <div className="onboarding-options">
              {TIMEFRAME_OPTIONS.map(opt => (
                <button key={opt} className={`onboarding-option ${timeframe === opt ? 'selected' : ''}`} onClick={() => setTimeframe(opt)}>
                  <strong>{opt}</strong>
                </button>
              ))}
            </div>
            <div className="onboarding-actions">
              <button className="auth-btn" onClick={() => setStep(2)}>Back</button>
              <button className="auth-btn primary" disabled={!timeframe} onClick={() => setStep(4)}>Continue</button>
            </div>
          </>
        )}

        {step === 4 && profile && (
          <>
            <h2>Your starting strategy</h2>
            <div className="onboarding-strategy">{profile.strategy}</div>
            <div className="onboarding-actions">
              <button className="auth-btn" onClick={() => setStep(3)}>Back</button>
              <button className="auth-btn primary" onClick={() => setStep(5)}>See stock ideas →</button>
            </div>
          </>
        )}

        {step === 5 && profile && (
          <>
            <h2>A few stocks that fit a {profile.label.toLowerCase()} profile</h2>
            <p className="onboarding-sub">These are educational starting points, not personalized financial advice — always do your own research.</p>
            <div className="onboarding-picks">
              {profile.picks.map(p => (
                <div key={p.ticker} className="onboarding-pick">
                  <div className="onboarding-pick-ticker">{p.ticker}</div>
                  <div className="onboarding-pick-name">{p.name}</div>
                  <div className="onboarding-pick-why">{p.why}</div>
                  <button className="auth-btn primary" onClick={() => onAnalyse(p.ticker)}>Analyse this stock</button>
                </div>
              ))}
            </div>
            <div className="onboarding-actions">
              <button className="auth-btn primary" style={{ width: '100%' }} onClick={onComplete}>Start exploring MacroLens</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
