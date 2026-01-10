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
import secrets   # ✅ NEW

# ===================== ENV =====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env" if (ROOT_DIR / ".env").exists() else None)

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

app = FastAPI(
    title="Expense & Budget Tracker API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

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

# ✅ Forgot password models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

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

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        user = await db.users.find_one(
            {"_id": ObjectId(payload["user_id"])}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def expense_to_response(expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=str(expense["_id"]),
        user_id=expense["user_id"],
        amount=expense["amount"],
        category=expense["category"],
        date=expense["date"],
        notes=expense.get("notes", ""),
        created_at=expense["created_at"],
    )

# ===================== AUTH =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = {
        "email": data.email.lower(),
        "password": hash_password(data.password),
        "name": data.name,
        "currency": "INR",
        "created_at": datetime.utcnow(),
    }

    result = await db.users.insert_one(user)
    token = create_token(str(result.inserted_id))

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(result.inserted_id),
            email=user["email"],
            name=user["name"],
            currency=user["currency"],
            created_at=user["created_at"],
        ),
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
            currency=user.get("currency", "INR"),
            created_at=user["created_at"],
        ),
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def me(user=Depends(get_current_user)):
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        currency=user.get("currency", "INR"),
        created_at=user["created_at"],
    )

# ===================== FORGOT PASSWORD =====================

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email.lower()})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "reset_password_token": token,
                "reset_password_expires": expires_at,
            }
        },
    )

    # Temporary: log token (later send email)
    reset_link = f"http://localhost:8081/auth/reset-password?token={token}"
    logger.info(f"RESET PASSWORD LINK: {reset_link}")

    return {"message": "Password reset link generated"}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    user = await db.users.find_one({
        "reset_password_token": data.token,
        "reset_password_expires": {"$gt": datetime.utcnow()},
    })

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    new_hashed_password = hash_password(data.new_password)

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password": new_hashed_password,
            },
            "$unset": {
                "reset_password_token": "",
                "reset_password_expires": "",
            }
        },
    )

    return {"message": "Password reset successful"}

# ===================== EXPENSES =====================

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(
    data: ExpenseCreate,
    user=Depends(get_current_user),
):
    expense = {
        "user_id": str(user["_id"]),
        "amount": data.amount,
        "category": data.category,
        "date": data.date,
        "notes": data.notes or "",
        "created_at": datetime.utcnow(),
    }

    result = await db.expenses.insert_one(expense)
    expense["_id"] = result.inserted_id

    return expense_to_response(expense)

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def list_expenses(user=Depends(get_current_user)):
    expenses = []
    cursor = db.expenses.find(
        {"user_id": str(user["_id"])}
    ).sort("date", -1)

    async for exp in cursor:
        expenses.append(expense_to_response(exp))

    return expenses

@api_router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    user=Depends(get_current_user),
):
    expense = await db.expenses.find_one({
        "_id": ObjectId(expense_id),
        "user_id": str(user["_id"]),
    })

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = {
        k: v for k, v in data.dict().items() if v is not None
    }

    await db.expenses.update_one(
        {"_id": expense["_id"]},
        {"$set": update_data},
    )

    expense.update(update_data)
    return expense_to_response(expense)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    user=Depends(get_current_user),
):
    result = await db.expenses.delete_one({
        "_id": ObjectId(expense_id),
        "user_id": str(user["_id"]),
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")

    return {"message": "Expense deleted"}

# ===================== HEALTH =====================

@api_router.get("/")
async def api_root():
    return {"message": "Expense Tracker API", "status": "healthy"}

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
