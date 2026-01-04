from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent

if (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "expense_tracker")
JWT_SECRET = os.environ.get("JWT_SECRET")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL not set")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET not set")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="Expense & Budget Tracker API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
    currency: str = "USD"
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ExpenseCategory(BaseModel):
    name: str
    icon: str = "receipt"
    color: str = "#6366f1"

EXPENSE_CATEGORIES = [
    {"name": "Food", "icon": "restaurant", "color": "#ef4444"},
    {"name": "Travel", "icon": "flight", "color": "#3b82f6"},
    {"name": "Rent", "icon": "home", "color": "#8b5cf6"},
    {"name": "Shopping", "icon": "shopping-cart", "color": "#f59e0b"},
    {"name": "Health", "icon": "local-hospital", "color": "#10b981"},
    {"name": "Entertainment", "icon": "movie", "color": "#ec4899"},
    {"name": "Utilities", "icon": "flash-on", "color": "#06b6d4"},
    {"name": "Other", "icon": "more-horiz", "color": "#6b7280"}
]

class ExpenseCreate(BaseModel):
    amount: float
    category: str
    date: datetime
    notes: Optional[str] = ""

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    category: str
    date: datetime
    notes: str = ""
    created_at: datetime

class BudgetCreate(BaseModel):
    amount: float
    month: int  # 1-12
    year: int

class BudgetUpdate(BaseModel):
    amount: float

class BudgetResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    month: int
    year: int
    created_at: datetime

class UserSettingsUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'exp': expiration,
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_doc = {
        "email": user_data.email.lower(),
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "currency": "USD",
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create token
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_doc['email'],
            name=user_doc['name'],
            currency=user_doc['currency'],
            created_at=user_doc['created_at']
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user['_id'])
    token = create_token(user_id)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user['email'],
            name=user['name'],
            currency=user.get('currency', 'USD'),
            created_at=user['created_at']
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user = Depends(get_current_user)):
    return UserResponse(
        id=str(user['_id']),
        email=user['email'],
        name=user['name'],
        currency=user.get('currency', 'USD'),
        created_at=user['created_at']
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    # API-ready stub - in production would send reset email
    user = await db.users.find_one({"email": request.email.lower()})
    # Always return success to prevent email enumeration
    return {"message": "If an account exists with this email, a reset link will be sent."}

@api_router.put("/auth/settings", response_model=UserResponse)
async def update_settings(settings: UserSettingsUpdate, user = Depends(get_current_user)):
    update_data = {}
    if settings.name:
        update_data['name'] = settings.name
    if settings.currency:
        update_data['currency'] = settings.currency
    
    if update_data:
        await db.users.update_one(
            {"_id": user['_id']},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": user['_id']})
    return UserResponse(
        id=str(updated_user['_id']),
        email=updated_user['email'],
        name=updated_user['name'],
        currency=updated_user.get('currency', 'USD'),
        created_at=updated_user['created_at']
    )
    
@api_router.delete("/auth/delete-account")
async def delete_account(user=Depends(get_current_user)):
    user_id = str(user["_id"])

    # Delete user data
    await db.expenses.delete_many({"user_id": user_id})
    await db.budgets.delete_many({"user_id": user_id})
    await db.users.delete_one({"_id": user["_id"]})

    return {"message": "Account and all data deleted successfully"}

# ===================== EXPENSE ROUTES =====================

@api_router.get("/categories")
async def get_categories():
    return EXPENSE_CATEGORIES

@api_router.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, user = Depends(get_current_user)):
    expense_doc = {
        "user_id": str(user['_id']),
        "amount": expense.amount,
        "category": expense.category,
        "date": expense.date,
        "notes": expense.notes or "",
        "created_at": datetime.utcnow()
    }
    
    result = await db.expenses.insert_one(expense_doc)
    expense_doc['id'] = str(result.inserted_id)
    
    return ExpenseResponse(**expense_doc)

@api_router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    user = Depends(get_current_user)
):
    query = {"user_id": str(user['_id'])}
    
    if month and year:
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        query['date'] = {'$gte': start_date, '$lt': end_date}
    
    if category:
        query['category'] = category
    
    expenses = await db.expenses.find(query).sort('date', -1).to_list(1000)
    
    return [
        ExpenseResponse(
            id=str(exp['_id']),
            user_id=exp['user_id'],
            amount=exp['amount'],
            category=exp['category'],
            date=exp['date'],
            notes=exp.get('notes', ''),
            created_at=exp['created_at']
        )
        for exp in expenses
    ]

@api_router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: str, user = Depends(get_current_user)):
    try:
        expense = await db.expenses.find_one({
            "_id": ObjectId(expense_id),
            "user_id": str(user['_id'])
        })
    except:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return ExpenseResponse(
        id=str(expense['_id']),
        user_id=expense['user_id'],
        amount=expense['amount'],
        category=expense['category'],
        date=expense['date'],
        notes=expense.get('notes', ''),
        created_at=expense['created_at']
    )

@api_router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, expense: ExpenseUpdate, user = Depends(get_current_user)):
    try:
        existing = await db.expenses.find_one({
            "_id": ObjectId(expense_id),
            "user_id": str(user['_id'])
        })
    except:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = {}
    if expense.amount is not None:
        update_data['amount'] = expense.amount
    if expense.category is not None:
        update_data['category'] = expense.category
    if expense.date is not None:
        update_data['date'] = expense.date
    if expense.notes is not None:
        update_data['notes'] = expense.notes
    
    if update_data:
        await db.expenses.update_one(
            {"_id": ObjectId(expense_id)},
            {"$set": update_data}
        )
    
    updated = await db.expenses.find_one({"_id": ObjectId(expense_id)})
    return ExpenseResponse(
        id=str(updated['_id']),
        user_id=updated['user_id'],
        amount=updated['amount'],
        category=updated['category'],
        date=updated['date'],
        notes=updated.get('notes', ''),
        created_at=updated['created_at']
    )

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user = Depends(get_current_user)):
    try:
        result = await db.expenses.delete_one({
            "_id": ObjectId(expense_id),
            "user_id": str(user['_id'])
        })
    except:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": "Expense deleted successfully"}

# ===================== BUDGET ROUTES =====================

@api_router.post("/budgets", response_model=BudgetResponse)
async def create_or_update_budget(budget: BudgetCreate, user = Depends(get_current_user)):
    user_id = str(user['_id'])
    
    # Check if budget exists for this month/year
    existing = await db.budgets.find_one({
        "user_id": user_id,
        "month": budget.month,
        "year": budget.year
    })
    
    if existing:
        # Update existing budget
        await db.budgets.update_one(
            {"_id": existing['_id']},
            {"$set": {"amount": budget.amount}}
        )
        updated = await db.budgets.find_one({"_id": existing['_id']})
        return BudgetResponse(
            id=str(updated['_id']),
            user_id=updated['user_id'],
            amount=updated['amount'],
            month=updated['month'],
            year=updated['year'],
            created_at=updated['created_at']
        )
    
    # Create new budget
    budget_doc = {
        "user_id": user_id,
        "amount": budget.amount,
        "month": budget.month,
        "year": budget.year,
        "created_at": datetime.utcnow()
    }
    
    result = await db.budgets.insert_one(budget_doc)
    budget_doc['id'] = str(result.inserted_id)
    
    return BudgetResponse(**budget_doc)

@api_router.get("/budgets", response_model=Optional[BudgetResponse])
async def get_budget(
    month: int,
    year: int,
    user = Depends(get_current_user)
):
    budget = await db.budgets.find_one({
        "user_id": str(user['_id']),
        "month": month,
        "year": year
    })
    
    if not budget:
        return None
    
    return BudgetResponse(
        id=str(budget['_id']),
        user_id=budget['user_id'],
        amount=budget['amount'],
        month=budget['month'],
        year=budget['year'],
        created_at=budget['created_at']
    )

# ===================== ANALYTICS ROUTES =====================

@api_router.get("/analytics/summary")
async def get_monthly_summary(
    month: int,
    year: int,
    user = Depends(get_current_user)
):
    user_id = str(user['_id'])
    
    # Get date range
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    # Get expenses for the month
    expenses = await db.expenses.find({
        "user_id": user_id,
        "date": {'$gte': start_date, '$lt': end_date}
    }).to_list(1000)
    
    # Calculate totals
    total_spent = sum(exp['amount'] for exp in expenses)
    
    # Category breakdown
    category_totals = {}
    for exp in expenses:
        cat = exp['category']
        category_totals[cat] = category_totals.get(cat, 0) + exp['amount']
    
    # Find highest spending category
    highest_category = None
    highest_amount = 0
    for cat, amount in category_totals.items():
        if amount > highest_amount:
            highest_amount = amount
            highest_category = cat
    
    # Get budget
    budget = await db.budgets.find_one({
        "user_id": user_id,
        "month": month,
        "year": year
    })
    
    budget_amount = budget['amount'] if budget else 0
    remaining = budget_amount - total_spent if budget else 0
    
    # Budget status
    budget_status = "no_budget"
    if budget:
        if total_spent >= budget_amount:
            budget_status = "exceeded"
        elif total_spent >= budget_amount * 0.8:
            budget_status = "warning"
        else:
            budget_status = "good"
    
    # Category data for charts
    category_data = [
        {
            "category": cat,
            "amount": amount,
            "percentage": round((amount / total_spent * 100), 1) if total_spent > 0 else 0
        }
        for cat, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]
    
    # Daily spending for bar chart
    daily_totals = {}
    for exp in expenses:
        day = exp['date'].day
        daily_totals[day] = daily_totals.get(day, 0) + exp['amount']
    
    daily_data = [
        {"day": day, "amount": amount}
        for day, amount in sorted(daily_totals.items())
    ]
    
    return {
        "month": month,
        "year": year,
        "total_spent": total_spent,
        "budget_amount": budget_amount,
        "remaining": remaining,
        "budget_status": budget_status,
        "expense_count": len(expenses),
        "highest_category": highest_category,
        "highest_category_amount": highest_amount,
        "category_data": category_data,
        "daily_data": daily_data
    }

@api_router.delete("/data/reset")
async def reset_user_data(user = Depends(get_current_user)):
    user_id = str(user['_id'])
    
    # Delete all expenses
    await db.expenses.delete_many({"user_id": user_id})
    
    # Delete all budgets
    await db.budgets.delete_many({"user_id": user_id})
    
    return {"message": "All data has been reset successfully"}

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "Expense & Budget Tracker API", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:19006",
        "exp://127.0.0.1:*",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
