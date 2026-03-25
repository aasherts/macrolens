from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import quote
import yfinance as yf
import anthropic
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

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

@app.get("/stock/{ticker:path}")
def get_stock(ticker: str, range: str = "1mo"):
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

    prompt = f"""
    You are a financial analyst. Analyze this stock data and provide two things:

    1. In 2-3 bullet points explain why this stock is currently moving the way it is.
    2. In 1-2 bullet points explain specifically why you predict {direction} movement of {abs(pct_predicted)}% over the next 7 days, referencing the momentum and any macro factors.

    Do not include any headings or titles. Start directly with the first bullet point.

    Company: {company_name}
    Ticker: {ticker.upper()}
    Sector: {sector}
    Current price: ${current}
    Today's change: ${change} ({change_pct}%)
    Recent 7-day trend: {direction} with avg daily move of ${round(avg_daily_change, 2)}
    Price range (30d): ${min(prices[-30:] if len(prices) >= 30 else prices)} - ${max(prices[-30:] if len(prices) >= 30 else prices)}
    7-day predicted price: ${pred_mid[-1]} ({pct_predicted}%)

    Be specific and data-driven. Write for a general audience.
    """

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )

    analysis = message.content[0].text

    return {
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
        }
    }
    