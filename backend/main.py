from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import quote
from datetime import datetime, timedelta
import yfinance as yf
import anthropic
import os
import requests
import json
import time
import pandas as pd
from auth import hash_password, verify_password, create_token, get_current_user
from pydantic import BaseModel

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class WatchlistRequest(BaseModel):
    ticker: str
    company_name: str = ""
from database import init_db, get_db, Prediction, User, WatchlistItem
from dotenv import load_dotenv
from database import init_db, get_db, Prediction

load_dotenv()
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

cache = {}
CACHE_TTL = 300

def get_cached(key):
    if key in cache:
        data, timestamp = cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
    return None

def set_cached(key, data):
    cache[key] = (data, time.time())
    SP500_TICKERS = [
    "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","BRK-B","AVGO","JPM",
    "LLY","UNH","V","XOM","MA","COST","HD","PG","WMT","NFLX","CRM","BAC",
    "ORCL","CVX","KO","MRK","ABBV","PEP","TMO","ACN","MCD","CSCO","ABT",
    "GE","DHR","IBM","TXN","PM","ISRG","QCOM","VZ","NEE","INTU","CAT","NOW",
    "AMGN","RTX","SPGI","HON","AXP","LOW","MS","GS","BLK","SBUX","DE","ELV",
    "MDT","GILD","AMAT","ADI","PLD","T","C","REGN","VRTX","ZTS","MMC","CI",
    "PGR","SYK","TJX","CB","CME","NOC","PANW","LRCX","KLAC","MU","SNPS","CDNS",
    "APH","MCO","EOG","SLB","OXY","COP","PSA","AMT","CCI","EQIX","DLR","WM",
    "ECL","ITW","PH","EMR","FDX","NSC","UPS","GWW","ROK","ETN","ADP","PAYX",
    "FAST","VRSK","ODFL","CSX","CTAS","MSCI","ICE","NDAQ","CBOE","IEX","TT",
    "PWR","CARR","OTIS","IR","XYL","ROP","IDXX","A","MTD","WAT","FMC","CF",
    "MOS","NUE","STLD","RS","ATI","HWM","TDG","LHX","BAH","CACI","SAIC","DRS",
    "HII","GD","LMT","BA","RHI","MAN","PAYC","WDAY","ANSS","EPAM","FTNT","CRWD",
    "ZS","OKTA","DDOG","NET","SNOW","MDB","COUP","HUBS","TEAM","DOCU","TWLO",
    "UBER","LYFT","ABNB","DASH","RBLX","COIN","SQ","PYPL","SOFI","AFRM","UPST",
    "WFC","USB","PNC","TFC","RF","CFG","HBAN","KEY","CMA","ZION","MTB","FITB",
    "STT","BK","NTRS","SIVB","ALLY","COF","DFS","SYF","AIG","MET","PRU","AFL",
    "ALL","PFG","UNM","LNC","GL","RGA","AIZ","CINF","HIG","TRV","WRB","RE",
    "CVS","WBA","MCK","CAH","ABC","ANTM","HUM","MOH","CNC","WELL","VTR","PEAK",
    "HR","DOC","OHI","NHI","SBAC","SBA","AMH","INVH","MAA","UDR","CPT","EQR",
    "AVB","ESS","NLY","AGNC","TWO","IVR","PMT","RWT","EARN","DX","WD","RITM"
]

top_picks_cache = {"data": [], "last_updated": None}

def run_sp500_screen():
    global top_picks_cache
    tickers = [
        "MMM","ABT","ABBV","ACN","ADBE","AMD","AFL","AIG","APD","AKAM",
        "ALGN","ALLE","LNT","ALL","GOOGL","MO","AMZN","AEE","AAL","AEP",
        "AXP","AMT","AWK","AMP","AME","AMGN","APH","ADI","ANSS","AON",
        "AAPL","AMAT","APTV","ADM","ANET","AJG","T","ATO","ADSK","ADP",
        "AZO","AVB","BKR","BALL","BAC","BAX","BDX","BRK-B","BBY","BIIB",
        "BLK","BX","BA","BSX","BMY","AVGO","BR","BRO","BG","CDNS","CPT",
        "CPB","COF","CAH","KMX","CCL","CARR","CAT","CBOE","CBRE","CDW",
        "CE","COR","CNC","CF","SCHW","CHTR","CVX","CMG","CB","CHD","CI",
        "CINF","CTAS","CSCO","C","CFG","CLX","CME","CMS","KO","CTSH",
        "CL","CMCSA","CAG","COP","ED","STZ","COO","CPRT","GLW","COST",
        "CTRA","CCI","CSX","CMI","CVS","DHI","DHR","DRI","DE","DAL",
        "DVN","DXCM","FANG","DLR","DFS","DG","DLTR","D","DPZ","DOV",
        "DOW","DTE","DUK","DD","EMN","ETN","EBAY","ECL","EIX","EW",
        "EA","ELV","LLY","EMR","ENPH","ETR","EOG","EQT","EFX","EQIX",
        "EQR","ESS","EL","ETSY","EG","EVRG","ES","EXC","EXPE","EXPD",
        "EXR","XOM","FDS","FICO","FAST","FRT","FDX","FIS","FITB","FSLR",
        "FE","FI","FLT","FMC","F","FTNT","FTV","BEN","FCX","GRMN","IT",
        "GE","GD","GIS","GPC","GILD","GPN","GL","GS","HAL","HIG","HAS",
        "HCA","HSY","HES","HPE","HLT","HOLX","HD","HON","HRL","HST",
        "HWM","HPQ","HUBB","HUM","HBAN","HII","IBM","IEX","IDXX","ITW",
        "INCY","IR","INTC","ICE","IFF","IP","IPG","INTU","ISRG","IVZ",
        "INVH","IQV","IRM","JBHT","JBL","J","JNJ","JCI","JPM","K",
        "KDP","KEY","KEYS","KMB","KIM","KMI","KLAC","KHC","KR","LHX",
        "LH","LRCX","LW","LVS","LDOS","LEN","LIN","LYV","LKQ","LMT",
        "L","LOW","LULU","LYB","MTB","MRO","MPC","MKTX","MAR","MMC",
        "MLM","MAS","MA","MKC","MCD","MCK","MDT","MRK","META","MET",
        "MTD","MGM","MCHP","MU","MSFT","MAA","MRNA","MOH","MDLZ","MPWR",
        "MNST","MCO","MS","MOS","MSI","MSCI","NDAQ","NTAP","NFLX","NEM",
        "NEE","NKE","NI","NDSN","NSC","NTRS","NOC","NRG","NUE","NVDA",
        "NVR","NXPI","ORLY","OXY","ODFL","OMC","ON","OKE","ORCL","OTIS",
        "PCAR","PKG","PANW","PARA","PH","PAYX","PAYC","PYPL","PNR","PEP",
        "PFE","PCG","PM","PSX","PNW","PNC","POOL","PPG","PPL","PFG",
        "PG","PGR","PLD","PRU","PEG","PTC","PSA","PHM","PWR","QCOM",
        "DGX","RL","RJF","RTX","O","REG","REGN","RF","RSG","RMD",
        "ROK","ROL","ROP","ROST","RCL","SPGI","CRM","SBAC","SLB","STX",
        "SRE","NOW","SHW","SPG","SWKS","SJM","SNA","SO","LUV","SWK",
        "SBUX","STT","STLD","STE","SYK","SYF","SNPS","SYY","TMUS","TROW",
        "TTWO","TPR","TRGP","TGT","TEL","TDY","TFX","TER","TSLA","TXN",
        "TXT","TMO","TJX","TSCO","TT","TDG","TRV","TRMB","TFC","TYL",
        "TSN","USB","UBER","UDR","ULTA","UNP","UAL","UPS","URI","UNH",
        "UHS","VLO","VTR","VRSN","VRSK","VZ","VRTX","VTRS","VICI","V",
        "VST","VMC","WRB","GWW","WAB","WBA","WMT","WM","WAT","WEC",
        "WFC","WELL","WST","WDC","WY","WMB","WTW","WYNN","XEL","XYL",
        "YUM","ZBRA","ZBH","ZTS"
    ]
    try:
        print("Running S&P 500 screen...")
        all_scores = []
        batch_size = 50
        
        for i in range(0, len(tickers), batch_size):
            batch = tickers[i:i+batch_size]
            try:
                import time as time_module
                data = yf.download(batch, period="35d", interval="1d", group_by="ticker", auto_adjust=True, progress=False)
                time_module.sleep(5)
                
                for t in batch:
                    try:
                        if len(batch) == 1:
                            closes = data["Close"].dropna()
                        elif t in data.columns.get_level_values(0):
                            closes = data[t]["Close"].dropna()
                        else:
                            continue
                        
                        if len(closes) < 10:
                            continue
                        
                        prices = closes.values
                        mom_7d = (prices[-1] - prices[-7]) / prices[-7] * 100 if len(prices) >= 7 else 0
                        mom_30d = (prices[-1] - prices[-30]) / prices[-30] * 100 if len(prices) >= 30 else 0
                        volatility = (max(prices[-20:]) - min(prices[-20:])) / min(prices[-20:]) * 100 if len(prices) >= 20 else 0
                        score = (mom_7d * 0.4) + (mom_30d * 0.3) - (volatility * 0.1)
                        all_scores.append({"ticker": t, "score": score, "mom_7d": round(float(mom_7d), 2), "mom_30d": round(float(mom_30d), 2), "price": round(float(prices[-1]), 2)})
                    except:
                        continue
            except Exception as e:
                print(f"Batch error: {e}")
                continue
        
        all_scores.sort(key=lambda x: x["score"], reverse=True)
        top15 = all_scores[:15]
        
        results = []
        for s in top15[:10]:
            try:
                stock = yf.Ticker(s["ticker"])
                info = stock.info
                company_name = info.get("shortName", s["ticker"])
                sector = info.get("sector", "N/A")
                results.append({
                    "ticker": s["ticker"],
                    "company_name": company_name,
                    "sector": sector,
                    "price": s["price"],
                    "mom_7d": s["mom_7d"],
                    "mom_30d": s["mom_30d"],
                    "score": round(s["score"], 2),
                })
            except:
                continue
        
        top_picks_cache["data"] = results
        top_picks_cache["last_updated"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        print(f"Screen complete — {len(results)} top picks found")
    except Exception as e:
        print(f"Screen error: {e}")

import threading

def _background_screen():
    import time
    import os
    if os.getenv("RENDER"):
        time.sleep(30)
        while True:
            try:
                run_sp500_screen()
            except Exception as e:
                print(f"Background screen error: {e}")
            time.sleep(900)
    else:
        time.sleep(10)
        run_sp500_screen()

threading.Thread(target=_background_screen, daemon=True).start()

@app.get("/search/{query}")
def search_tickers(query: str):
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={quote(query)}&quotesCount=6&newsCount=0"
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    data = response.json()
    results = []
    for quote_result in data.get("quotes", []):
        if quote_result.get("quoteType") in ["EQUITY", "ETF", "INDEX", "MUTUALFUND", "CRYPTOCURRENCY", "CURRENCY", "FUTURE"]:
            results.append({
                "symbol": quote_result.get("symbol", ""),
                "name": quote_result.get("longname") or quote_result.get("shortname", ""),
                "type": quote_result.get("quoteType", ""),
                "exchange": quote_result.get("exchange", ""),
            })
    return {"results": results}

@app.get("/macro")
def get_macro():
    cached = get_cached("macro")
    if cached:
        return cached
    fred_key = os.getenv("FRED_API_KEY")
    series = {
        "fed_rate": "FEDFUNDS",
        "cpi": "CPIAUCSL",
        "gdp": "GDP",
        "unemployment": "UNRATE",
        "ten_year_yield": "GS10",
        "vix": "VIXCLS",
    }
    results = {}
    for name, series_id in series.items():
        url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={fred_key}&file_type=json&sort_order=desc&limit=2"
        response = requests.get(url)
        data = response.json()
        observations = data.get("observations", [])
        if observations:
            latest = observations[0]["value"]
            previous = observations[1]["value"] if len(observations) > 1 else latest
            results[name] = {
                "value": latest,
                "previous": previous,
                "change": round(float(latest) - float(previous), 3) if latest != "." and previous != "." else 0
            }
    set_cached("macro", results)
    return results

@app.get("/news/{ticker}")
def get_news(ticker: str, company: str = ""):
    news_key = os.getenv("NEWS_API_KEY")
    query = company if company else ticker
    url = f"https://newsapi.org/v2/everything?q={query}&sortBy=publishedAt&pageSize=5&language=en&apiKey={news_key}"
    response = requests.get(url)
    data = response.json()
    articles = []
    for article in data.get("articles", []):
        if article.get("title") and article.get("title") != "[Removed]":
            articles.append({
                "title": article.get("title"),
                "source": article.get("source", {}).get("name", ""),
                "url": article.get("url"),
                "publishedAt": article.get("publishedAt", "")[:10],
            })
    return {"articles": articles}

@app.get("/market-overview")
def get_market_overview():
    cached = get_cached("market-overview")
    if cached:
        return cached
    tickers = {
        "S&P 500": "^GSPC",
        "NASDAQ": "^IXIC",
        "DOW": "^DJI",
        "BTC": "BTC-USD",
        "GOLD": "GC=F",
        "VIX": "^VIX",
        "OIL": "CL=F",
    }
    results = []
    for name, symbol in tickers.items():
        try:
            stock = yf.Ticker(symbol)
            hist = stock.history(period="2d")
            if len(hist) >= 2:
                current = round(hist["Close"].iloc[-1], 2)
                previous = round(hist["Close"].iloc[-2], 2)
                change = round(current - previous, 2)
                change_pct = round((change / previous) * 100, 2)
                results.append({
                    "name": name,
                    "price": current,
                    "change": change,
                    "change_pct": change_pct,
                })
        except:
            pass
    result = {"items": results}
    set_cached("market-overview", result)
    return result

@app.post("/register")
def register(req: RegisterRequest):
    db = get_db()
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        email=req.email,
        username=req.username,
        hashed_password=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": str(user.id)})
    return {"token": token, "username": user.username, "email": user.email}

@app.post("/login")
def login(req: LoginRequest):
    db = get_db()
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"sub": str(user.id)})
    return {"token": token, "username": user.username, "email": user.email}

@app.get("/me")
def get_me(current_user_id: str = Depends(get_current_user)):
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()

    if current_user_id.startswith("firebase:"):
        parts = current_user_id.split(":", 2)
        firebase_uid = parts[1]
        email = parts[2] if len(parts) > 2 else ""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            username = email.split("@")[0] if email else firebase_uid[:8]
            user = User(
                email=email,
                username=username,
                hashed_password=hash_password(firebase_uid)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        watchlist = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).all()
        return {
            "username": user.username,
            "email": user.email,
            "watchlist": [{"ticker": w.ticker, "company_name": w.company_name} for w in watchlist]
        }

    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    watchlist = db.query(WatchlistItem).filter(WatchlistItem.user_id == user.id).all()
    return {
        "username": user.username,
        "email": user.email,
        "watchlist": [{"ticker": w.ticker, "company_name": w.company_name} for w in watchlist]
    }

@app.post("/watchlist/add")
def add_to_watchlist(req: WatchlistRequest, current_user_id: str = Depends(get_current_user)):
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()

    if current_user_id.startswith("firebase:"):
        parts = current_user_id.split(":", 2)
        email = parts[2] if len(parts) > 2 else ""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user.id
    else:
        user_id = int(current_user_id)

    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == user_id,
        WatchlistItem.ticker == req.ticker.upper()
    ).first()
    if existing:
        return {"message": "Already in watchlist"}
    item = WatchlistItem(
        user_id=user_id,
        ticker=req.ticker.upper(),
        company_name=req.company_name
    )
    db.add(item)
    db.commit()
    return {"message": "Added to watchlist"}

@app.delete("/watchlist/remove/{ticker}")
def remove_from_watchlist(ticker: str, current_user_id: str = Depends(get_current_user)):
    if not current_user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    db = get_db()

    if current_user_id.startswith("firebase:"):
        parts = current_user_id.split(":", 2)
        email = parts[2] if len(parts) > 2 else ""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = user.id
    else:
        user_id = int(current_user_id)

    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == user_id,
        WatchlistItem.ticker == ticker.upper()
    ).first()
    if item:
        db.delete(item)
        db.commit()
    return {"message": "Removed from watchlist"}

@app.get("/top-picks")
def get_top_picks():
    return {
        "picks": top_picks_cache["data"],
        "last_updated": top_picks_cache["last_updated"]
    }

@app.post("/portfolio/analyze")
def analyze_portfolio(holdings: list = None):
    from fastapi import Body
    return {"message": "Use POST body"}

@app.post("/portfolio")
def analyze_portfolio_post(body: dict = Body(...)):
    holdings = body.get("holdings", [])
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings provided")
    
    portfolio_data = []
    total_value = 0
    
    for h in holdings:
        try:
            ticker_sym = h.get("ticker", "").upper()
            shares = float(h.get("shares", 0))
            avg_cost = float(h.get("avg_cost", 0))
            
            stock = yf.Ticker(ticker_sym)
            hist = stock.history(period="1mo")
            info = stock.info
            
            current_price = round(hist["Close"].iloc[-1], 2)
            company_name = info.get("shortName", ticker_sym)
            sector = info.get("sector", "N/A")
            
            position_value = current_price * shares
            cost_basis = avg_cost * shares
            pnl = position_value - cost_basis
            pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0 else 0
            
            prices = hist["Close"].tolist()
            mom_7d = (prices[-1] - prices[-7]) / prices[-7] * 100 if len(prices) >= 7 else 0
            
            total_value += position_value
            
            portfolio_data.append({
                "ticker": ticker_sym,
                "company_name": company_name,
                "sector": sector,
                "shares": shares,
                "avg_cost": avg_cost,
                "current_price": current_price,
                "position_value": round(position_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "mom_7d": round(mom_7d, 2),
            })
        except Exception as e:
            print(f"Error processing {h}: {e}")
            continue
    
    for p in portfolio_data:
        p["weight"] = round(p["position_value"] / total_value * 100, 2) if total_value > 0 else 0
    
    sectors = {}
    for p in portfolio_data:
        s = p["sector"]
        sectors[s] = sectors.get(s, 0) + p["weight"]
    
    winners = sorted([p for p in portfolio_data if p["pnl_pct"] > 0], key=lambda x: x["pnl_pct"], reverse=True)[:3]
    losers = sorted([p for p in portfolio_data if p["pnl_pct"] < 0], key=lambda x: x["pnl_pct"])[:3]
    momentum_alerts = [p for p in portfolio_data if p["mom_7d"] < -3]
    
    holdings_summary = "\n".join([
        f"- {p['ticker']} ({p['company_name']}): {p['shares']} shares @ ${p['avg_cost']} avg cost, "
        f"now ${p['current_price']}, P&L: ${p['pnl']} ({p['pnl_pct']}%), "
        f"7d momentum: {p['mom_7d']}%, portfolio weight: {p['weight']}%"
        for p in portfolio_data
    ])
    
    sector_summary = ", ".join([f"{k}: {round(v, 1)}%" for k, v in sectors.items()])
    
    prompt = (
        "You are a senior portfolio manager. Analyze this investment portfolio and provide actionable insights.\n\n"
        f"Total portfolio value: ${round(total_value, 2)}\n"
        f"Number of positions: {len(portfolio_data)}\n"
        f"Sector allocation: {sector_summary}\n\n"
        f"Holdings:\n{holdings_summary}\n\n"
        "Provide a concise analysis covering:\n"
        "1. Overall portfolio health (2-3 sentences)\n"
        "2. Top concerns or risks (2-3 bullet points)\n"
        "3. Opportunities — positions to add to or consider selling (2-3 bullet points)\n"
        "4. Diversification assessment (1-2 sentences)\n\n"
        "Be specific, data-driven, and actionable. Write for a retail investor."
    )
    
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}]
    )
    
    analysis = message.content[0].text
    
    return {
        "total_value": round(total_value, 2),
        "positions": portfolio_data,
        "sectors": sectors,
        "winners": winners,
        "losers": losers,
        "momentum_alerts": momentum_alerts,
        "analysis": analysis
    }

@app.get("/predictions")
def get_predictions():
    db = get_db()
    predictions = db.query(Prediction).order_by(Prediction.predicted_at.desc()).limit(20).all()
    return [{
        "id": p.id,
        "ticker": p.ticker,
        "company_name": p.company_name,
        "predicted_at": str(p.predicted_at),
        "price_at_prediction": p.price_at_prediction,
        "predicted_price": p.predicted_price,
        "predicted_pct": p.predicted_pct,
        "predicted_direction": p.predicted_direction,
        "check_date": p.check_date,
        "actual_price": p.actual_price,
        "actual_pct": p.actual_pct,
        "outcome": p.outcome,
        "error_pct": p.error_pct,
    } for p in predictions]

@app.get("/signal/{ticker:path}")
def get_signal(ticker: str, horizon: str = "medium", days: int = 30):
    cache_key = f"signal_{ticker}_{horizon}_{days}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    stock = yf.Ticker(ticker)
    hist = stock.history(period="3mo")
    info = stock.info

    prices = hist["Close"].round(2).tolist()
    current = prices[-1]
    company_name = info.get("shortName", ticker)
    sector = info.get("sector", "N/A")
    fifty_two_high = info.get("fiftyTwoWeekHigh", current)
    fifty_two_low = info.get("fiftyTwoWeekLow", current)
    target_price = info.get("targetMeanPrice", None)
    recommendation = info.get("recommendationKey", "none")
    pe_ratio = info.get("trailingPE", None)
    beta = info.get("beta", None)

    recent_7 = prices[-7:] if len(prices) >= 7 else prices
    recent_30 = prices[-30:] if len(prices) >= 30 else prices
    momentum_7d = round((recent_7[-1] - recent_7[0]) / recent_7[0] * 100, 2)
    momentum_30d = round((recent_30[-1] - recent_30[0]) / recent_30[0] * 100, 2)
    volatility = round((max(recent_30) - min(recent_30)) / min(recent_30) * 100, 2)
    distance_from_52h = round((current - fifty_two_high) / fifty_two_high * 100, 2)
    distance_from_52l = round((current - fifty_two_low) / fifty_two_low * 100, 2)

    past_accuracy = ""
    try:
        db = get_db()
        past = db.query(Prediction).filter(
            Prediction.ticker == ticker.upper(),
            Prediction.outcome != None
        ).order_by(Prediction.predicted_at.desc()).limit(10).all()
        if past:
            correct = sum(1 for p in past if p.outcome in ["excellent", "good", "correct_direction"])
            accuracy = round(correct / len(past) * 100)
            past_accuracy = f"Historical prediction accuracy for {ticker.upper()}: {accuracy}% ({correct}/{len(past)} correct)."
    except:
        pass

    horizon_instructions = {
        "day": "This is a DAY TRADE signal for same-day entry and exit. Focus on intraday momentum and tight levels. Entry window is today. Stop loss should be 0.5-1.5% max. Exit target 0.5-2% upside. Position size should be larger since timeframe is short.",
        "week": f"This is a SWING TRADE signal for a {days}-day hold. Focus on short-term momentum, technical breakouts, support/resistance levels. Entry window in next 1-2 days. Stop loss 2-4%. Exit target 3-8%.",
        "medium": f"This is a POSITION TRADE for a {days}-day hold. Focus on fundamentals, macro environment, and medium-term catalysts. Wider stop loss 5-8%. Exit target 10-20%.",
        "custom": f"This is a CUSTOM timeframe signal for exactly {days} days. Calibrate ALL price targets, stop losses, position sizing, and rationale specifically and precisely for a {days}-day holding period. Be very specific about the {days}-day timeframe throughout.",
    }

    horizon_text = horizon_instructions.get(horizon, horizon_instructions["medium"])

    prompt = (
        f"You are a senior Wall Street analyst. {horizon_text}\n\n"
        "Generate a precise investment signal as a JSON object.\n\n"
        f"Company: {company_name} ({ticker.upper()})\n"
        f"Sector: {sector}\n"
        f"Current price: ${current}\n"
        f"7-day momentum: {momentum_7d}%\n"
        f"30-day momentum: {momentum_30d}%\n"
        f"30-day volatility: {volatility}%\n"
        f"52-week high: ${fifty_two_high} ({distance_from_52h}% from high)\n"
        f"52-week low: ${fifty_two_low} ({distance_from_52l}% from low)\n"
        f"Analyst consensus: {recommendation}\n"
        f"Analyst price target: ${target_price}\n"
        f"P/E ratio: {pe_ratio}\n"
        f"Beta: {beta}\n"
        f"{past_accuracy}\n\n"
        "Return ONLY a raw JSON object with these exact fields: "
        "signal (BUY/SELL/HOLD), confidence (0-100), entry_price, entry_window, "
        "exit_target, exit_timeframe, stop_loss, potential_return, max_risk, "
        "risk_reward_ratio, position_size, risk_level (LOW/MEDIUM/HIGH), "
        "time_horizon (SHORT/MEDIUM/LONG), rationale (array of 4 strings), "
        "key_risks (array of 3 strings), catalysts (array of 2 strings). "
        "No markdown, no backticks, no explanation. Raw JSON only."
    )

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        signal_data = json.loads(raw)
    except:
        signal_data = {"signal": "HOLD", "confidence": 50, "error": "Could not generate signal"}

    set_cached(cache_key, signal_data)
    return signal_data

@app.get("/stock/{ticker:path}")
def get_stock(ticker: str, range: str = "1mo"):
    cache_key = f"{ticker}_{range}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    range_map = {
        "1d": ("1d", "5m"),
        "1w": ("5d", "30m"),
        "1mo": ("1mo", "1d"),
        "6mo": ("6mo", "1d"),
        "1y": ("1y", "1d"),
        "ytd": ("ytd", "1d"),
        "5y": ("5y", "1wk"),
    }

    period, interval = range_map.get(range, ("1mo", "1d"))
    stock = yf.Ticker(ticker)
    hist = stock.history(period=period, interval=interval, prepost=True)

    prices = hist["Close"].round(2).tolist()

    if range == "1d":
        dates = hist.index.strftime("%H:%M").tolist()
    elif range == "1w":
        dates = hist.index.strftime("%a %H:%M").tolist()
    else:
        dates = hist.index.strftime("%b %d").tolist()

    current = prices[-1]
    previous = prices[-2]
    change = round(current - previous, 2)
    change_pct = round((change / previous) * 100, 2)

    recent = prices[-7:] if len(prices) >= 7 else prices
    avg_daily_change = (recent[-1] - recent[0]) / len(recent)
    volatility = max(prices[-30:]) - min(prices[-30:]) if len(prices) >= 30 else max(prices) - min(prices)
    band = round(volatility * 0.15, 2)

    pred_dates = ["Forecast +2d", "Forecast +4d", "Forecast +7d"]
    pred_mid = [
        round(current + avg_daily_change * 2, 2),
        round(current + avg_daily_change * 4, 2),
        round(current + avg_daily_change * 7, 2),
    ]
    pred_high = [round(p + band, 2) for p in pred_mid]
    pred_low = [round(p - band, 2) for p in pred_mid]

    direction = "upward" if avg_daily_change > 0 else "downward"
    pct_predicted = round((pred_mid[-1] - current) / current * 100, 2)

    info = stock.info
    sector = info.get("sector", "N/A")
    company_name = info.get("shortName", ticker)
    recommendation = info.get("recommendationKey", "none").capitalize()
    target_price = info.get("targetMeanPrice", None)
    short_ratio = info.get("shortRatio", None)
    fifty_two_high = info.get("fiftyTwoWeekHigh", None)
    fifty_two_low = info.get("fiftyTwoWeekLow", None)
    pe_ratio = info.get("trailingPE", None)
    market_cap = info.get("marketCap", None)

    def format_market_cap(mc):
        if not mc:
            return "N/A"
        if mc >= 1_000_000_000_000:
            return f"${mc/1_000_000_000_000:.2f}T"
        if mc >= 1_000_000_000:
            return f"${mc/1_000_000_000:.2f}B"
        return f"${mc/1_000_000:.2f}M"

    past_predictions = []
    try:
        db = get_db()
        past = db.query(Prediction).filter(
            Prediction.ticker == ticker.upper(),
            Prediction.outcome != None
        ).order_by(Prediction.predicted_at.desc()).limit(5).all()
        for p in past:
            past_predictions.append(f"Predicted {p.predicted_direction} {p.predicted_pct}%, actual was {p.actual_pct}% — {p.outcome}")
    except:
        pass

    accuracy_context = ""
    if past_predictions:
        accuracy_context = "\n\nYour past predictions for " + ticker.upper() + ": " + "; ".join(past_predictions) + "\nUse this to calibrate your current prediction."

    prompt = (
        "You are a financial analyst. Analyze this stock data and provide 2-3 bullet points explaining "
        "why this stock is moving and 1-2 bullet points on the predicted outlook. "
        "No headings. Start directly with the first bullet point.\n\n"
        f"Company: {company_name}\n"
        f"Ticker: {ticker.upper()}\n"
        f"Sector: {sector}\n"
        f"Current price: ${current}\n"
        f"Today's change: ${change} ({change_pct}%)\n"
        f"Recent 7-day trend: {direction} with avg daily move of ${round(avg_daily_change, 2)}\n"
        f"Price range (30d): ${min(prices[-30:] if len(prices) >= 30 else prices)} - ${max(prices[-30:] if len(prices) >= 30 else prices)}\n"
        f"7-day predicted price: ${pred_mid[-1]} ({pct_predicted}%)"
        f"{accuracy_context}"
    )

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )

    analysis = message.content[0].text

    try:
        db = get_db()
        check_date = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        new_prediction = Prediction(
            ticker=ticker.upper(),
            company_name=company_name,
            price_at_prediction=current,
            predicted_price=pred_mid[-1],
            predicted_pct=pct_predicted,
            predicted_direction=direction,
            check_date=check_date,
            ai_reasoning=analysis,
        )
        db.add(new_prediction)
        db.commit()
    except Exception as e:
        print(f"DB error: {e}")

    result = {
        "ticker": ticker.upper(),
        "company_name": company_name,
        "current": current,
        "change": change,
        "change_pct": change_pct,
        "prices": prices,
        "dates": dates,
        "analysis": analysis,
        "prediction": {
            "dates": pred_dates,
            "mid": pred_mid,
            "high": pred_high,
            "low": pred_low,
            "direction": direction,
            "pct": pct_predicted,
        },
        "sentiment": {
            "recommendation": recommendation,
            "target_price": round(target_price, 2) if target_price else None,
            "short_ratio": round(short_ratio, 1) if short_ratio else None,
            "fifty_two_high": fifty_two_high,
            "fifty_two_low": fifty_two_low,
            "pe_ratio": round(pe_ratio, 1) if pe_ratio else None,
            "market_cap": format_market_cap(market_cap),
        }
    }
    set_cached(cache_key, result)
    return result
