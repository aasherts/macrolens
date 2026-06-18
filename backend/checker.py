from database import get_db, Prediction, SignalRecord, init_db
import yfinance as yf
from datetime import datetime

def check_predictions():
    init_db()
    db = get_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    pending = db.query(Prediction).filter(
        Prediction.check_date <= today,
        Prediction.outcome == None
    ).all()

    print(f"Checking {len(pending)} predictions...")

    for p in pending:
        try:
            stock = yf.Ticker(p.ticker)
            hist = stock.history(period="2d")
            if len(hist) == 0:
                continue

            actual_price = round(hist["Close"].iloc[-1], 2)
            actual_pct = round((actual_price - p.price_at_prediction) / p.price_at_prediction * 100, 2)
            error_pct = round(abs(actual_pct - p.predicted_pct), 2)

            predicted_up = p.predicted_direction == "upward"
            actual_up = actual_pct > 0

            if predicted_up == actual_up:
                if error_pct < 1:
                    outcome = "excellent"
                elif error_pct < 3:
                    outcome = "good"
                else:
                    outcome = "correct_direction"
            else:
                outcome = "wrong_direction"

            p.actual_price = actual_price
            p.actual_pct = actual_pct
            p.error_pct = error_pct
            p.outcome = outcome

            print(f"{p.ticker}: predicted {p.predicted_pct}%, actual {actual_pct}% — {outcome}")

        except Exception as e:
            print(f"Error checking {p.ticker}: {e}")

    db.commit()
    print("Done.")

def classify_signal_outcome(signal, pct_move):
    """A signal 'plays out as expected' if the direction it implied
    matches what actually happened. HOLD is correct if the price stayed
    roughly flat (within 3%)."""
    if signal == "BUY":
        return "correct" if pct_move > 0 else "wrong"
    if signal == "SELL":
        return "correct" if pct_move < 0 else "wrong"
    return "correct" if abs(pct_move) < 3 else "wrong"

def check_signals():
    init_db()
    db = get_db()
    today = datetime.utcnow().strftime("%Y-%m-%d")

    pending = db.query(SignalRecord).filter(
        SignalRecord.check_date <= today,
        SignalRecord.outcome == None
    ).all()

    print(f"Checking {len(pending)} signals...")

    for s in pending:
        try:
            stock = yf.Ticker(s.ticker)
            hist = stock.history(period="2d")
            if len(hist) == 0:
                continue

            actual_price = round(float(hist["Close"].iloc[-1]), 2)
            actual_pct = round((actual_price - s.price_at_prediction) / s.price_at_prediction * 100, 2) if s.price_at_prediction else 0
            outcome = classify_signal_outcome(s.signal, actual_pct)

            s.actual_price = actual_price
            s.actual_pct = actual_pct
            s.outcome = outcome

            print(f"{s.ticker}: signal {s.signal}, actual move {actual_pct}% — {outcome}")

        except Exception as e:
            print(f"Error checking signal {s.ticker}: {e}")

    db.commit()
    print("Done.")

if __name__ == "__main__":
    check_predictions()
    check_signals()