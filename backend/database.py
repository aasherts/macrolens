from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

engine = create_engine('sqlite:///macrolens.db')
Base = declarative_base()
SessionLocal = sessionmaker(bind=engine)

class Prediction(Base):
    __tablename__ = 'predictions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String, nullable=False)
    company_name = Column(String)
    predicted_at = Column(DateTime, default=datetime.utcnow)
    price_at_prediction = Column(Float)
    predicted_price = Column(Float)
    predicted_pct = Column(Float)
    predicted_direction = Column(String)
    timeframe_days = Column(Integer, default=7)
    check_date = Column(String)
    actual_price = Column(Float, nullable=True)
    actual_pct = Column(Float, nullable=True)
    outcome = Column(String, nullable=True)
    error_pct = Column(Float, nullable=True)
    ai_reasoning = Column(Text)

def init_db():
    Base.metadata.create_all(engine)

def get_db():
    db = SessionLocal()
    try:
        return db
    finally:
        pass
        