# MacroLens

**Live:** [macrolens.shortley.com](https://macrolens.shortley.com) · [macrolens-sigma.vercel.app](https://macrolens-sigma.vercel.app)

An AI-powered macroeconomic market analysis dashboard that gives retail investors access to the kind of multi-signal analysis usually reserved for institutional traders. Built entirely from scratch by a 17-year-old student.

---

## What it does

MacroLens takes any publicly traded stock, ETF, index, commodity, or cryptocurrency and synthesises real-time market data, macroeconomic indicators, and AI reasoning into a single dashboard.

**Overview tab**
- Live price chart with pre/post-market data and time ranges from 1D to 5Y
- AI-generated analysis explaining why the stock is moving, powered by the Claude API
- 7-day price prediction with confidence band overlay on the chart
- Live Federal Reserve macro indicators (Fed rate, CPI, GDP, unemployment, VIX, 10Y yield) pulled from the FRED API
- Real-time news feed for the searched company via NewsAPI
- Live analyst ratings, price targets, 52-week range, P/E ratio, and short interest from Yahoo Finance

**AI Signal tab**
- Full institutional-grade investment signal: entry price, exit target, stop loss, position sizing, risk/reward ratio
- Four timeframe modes: Day trade, Swing trade, Position trade, and Custom (user sets exact number of days)
- Confidence score and risk rating for every signal
- Investment rationale, key catalysts, and key risks — all AI-generated from live data

**Fundamentals tab**
- Company fundamentals and macro environment side by side

**Live market ticker bar**
- S&P 500, NASDAQ, DOW, BTC, Gold, VIX, and Oil — all live at the top of every page

**Self-improving prediction system**
- Every prediction is saved to a SQLite database with the ticker, price, direction, and check date
- A feedback loop checker runs after 7 days, compares the prediction to actual price movement, and logs accuracy
- Past accuracy is fed back into the Claude prompt to calibrate future predictions

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Chart.js |
| Backend | Python, FastAPI |
| Market data | yfinance (Yahoo Finance) |
| Macro data | FRED API (Federal Reserve) |
| News | NewsAPI |
| AI analysis | Anthropic Claude API |
| Database | SQLite + SQLAlchemy |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Architecture

The React frontend is deployed on Vercel and communicates with a Python FastAPI backend deployed on Render. The backend fetches live data from Yahoo Finance, FRED, and NewsAPI, passes it to the Claude API for analysis, caches results for 5 minutes to reduce latency, and returns everything to the frontend in a single response.

Every prediction is stored in a SQLite database. A checker script compares predictions to actual outcomes after their timeframe expires, building a historical accuracy record that feeds back into future predictions.

---

## Features in development

- User accounts with saved watchlists
- Price alerts via email
- Portfolio analysis — upload your holdings and get AI analysis on the whole portfolio
- Mobile responsive design

---

## Local development

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm start
```

---

## Disclaimer

MacroLens outputs are probabilistic signals for educational purposes only. Nothing on this platform constitutes financial advice. Always do your own research before making investment decisions.

---

*Built by Aasher Shortley · March 2026*