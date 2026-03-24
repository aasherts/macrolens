from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import anthropic
import os
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

@app.get("/stock/{ticker}")
def get_stock(ticker: str):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="1mo")

    prices = hist["Close"].round(2).tolist()
    dates = hist.index.strftime("%b %d").tolist()
    current = prices[-1]
    previous = prices[-2]
    change = round(current - previous, 2)
    change_pct = round((change / previous) * 100, 2)

    info = stock.info
    market_cap = info.get("marketCap", "N/A")
    sector = info.get("sector", "N/A")
    company_name = info.get("shortName", ticker)

    prompt = f"""
    You are a financial analyst. Analyze this stock data and explain in 3-4 concise bullet points why this stock is moving and what the outlook is.

    Company: {company_name}
    Ticker: {ticker.upper()}
    Sector: {sector}
    Current price: ${current}
    Today's change: ${change} ({change_pct}%)
    1 month price range: ${min(prices)} - ${max(prices)}

    Be specific, data-driven, and write for a general audience. Each bullet point should be one sentence.
    """

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=300,
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
    }
    