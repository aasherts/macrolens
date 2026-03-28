from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./macrolens.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    watchlist = relationship("WatchlistItem", back_populates="user", cascade="all, delete")

class WatchlistItem(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ticker = Column(String, nullable=False)
    company_name = Column(String, nullable=True)
    added_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="watchlist")

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    company_name = Column(String, nullable=True)
    predicted_at = Column(DateTime, default=datetime.utcnow)
    price_at_prediction = Column(Float)
    predicted_price = Column(Float)
    predicted_pct = Column(Float)
    predicted_direction = Column(String)
    check_date = Column(String)
    actual_price = Column(Float, nullable=True)
    actual_pct = Column(Float, nullable=True)
    outcome = Column(String, nullable=True)
    error_pct = Column(Float, nullable=True)
    ai_reasoning = Column(String, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    return SessionLocal()