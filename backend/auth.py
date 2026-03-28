from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import os

SECRET_KEY = "macrolens-secret-key-2026-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)

# Initialize Firebase Admin
if not firebase_admin._apps:
    service_account_path = os.path.join(os.path.dirname(__file__), "firebase-service-account.json")
    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
    else:
        import json
        service_account_info = json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT", "{}"))
        cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

def verify_firebase_token(token: str) -> Optional[dict]:
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception:
        return None

def get_current_user(token: str = Depends(oauth2_scheme)) -> Optional[str]:
    if not token:
        return None
    
    # Try our custom JWT first
    user_id = decode_token(token)
    if user_id:
        return user_id
    
    # Try Firebase token
    firebase_data = verify_firebase_token(token)
    if firebase_data:
        return f"firebase:{firebase_data.get('uid')}:{firebase_data.get('email', '')}"
    
    return None