from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId

# ===================== ENV SETUP =====================

ROOT_DIR = Path(__file__).parent
if (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
else:
    load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "expense_tracker")
JWT_SECRET = os.getenv("JWT_SECRET")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL not set")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET not set")

# ===================== DB =====================

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ===================== JWT =====================

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

# ===================== APP =====================

app = FastAPI(title="Expense & Budget Tracker API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===================== LOGGING =====================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("expense-tracker")

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    currency: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    date: datetime
    notes: Optional[str] = ""

class ExpenseUpdate(BaseModel):
    amount: Optional[float]
    category: Optional[str]
    date: Optional[datetime]
    notes: Optional[str]

class ExpenseResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    category: str
    date: datetime
    notes: str
    created_at: datetime

class BudgetCreate(BaseModel):
    amount: float
    month: int
    year: int

class BudgetResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    month: int
    year: int
    created_at: datetime

class UserSettingsUpdate(BaseModel):
    name: Optional[str]
    currency: Optional[str]

# ===================== HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["user_id"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ===================== AUTH =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "name": data.name,
        "currency": "USD",
        "created_at": datetime.utcnow(),
    }

    result = await db.users.insert_one(user)
    token = create_token(str(result.inserted_id))

    return TokenResponse(
        access_token=token,
        user=UserResponse(id=str(result.inserted_id), **user),
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(str(user["_id"]))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            currency=user.get("currency", "USD"),
            created_at=user["created_at"],
        ),
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        currency=user.get("currency", "USD"),
        created_at=user["created_at"],
    )

@api_router.delete("/auth/delete-account")
async def delete_account(user=Depends(get_current_user)):
    uid = str(user["_id"])
    await db.expenses.delete_many({"user_id": uid})
    await db.budgets.delete_many({"user_id": uid})
    await db.users.delete_one({"_id": user["_id"]})
    return {"message": "Account deleted"}

# ===================== HEALTH =====================

@api_router.get("/")
async def api_root():
    return {"message": "Expense & Budget Tracker API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ===================== FINAL =====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:19006",
        "https://expense-tracker-api-td.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
