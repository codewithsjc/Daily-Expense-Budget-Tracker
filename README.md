# Daily Expense & Budget Tracker

A production-ready full-stack mobile application for tracking daily expenses and managing budgets.

## Tech Stack

### Frontend
- React Native with Expo
- TypeScript
- expo-router for file-based navigation
- Light & Dark theme support
- Cross-platform (iOS, Android, Web)

### Backend
- Python FastAPI
- MongoDB (Motor async driver)
- JWT-based authentication
- REST APIs

## Features

### 1. Authentication
- Email & password signup/login
- Secure JWT authentication
- Logout functionality
- Forgot password flow (API-ready)

### 2. Expense Management
- Add, edit, delete daily expenses
- Categories: Food, Travel, Rent, Shopping, Health, Entertainment, Utilities, Other
- Date selection with quick buttons
- Optional notes

### 3. Budget Management
- Set monthly budget
- Visual progress indicator
- Budget status (On track, Warning, Exceeded)
- Automatic monthly reset

### 4. Analytics & Insights
- Monthly summary
- Category-wise breakdown with progress bars
- Daily spending bar chart
- Highest spending category highlight

### 5. Settings
- Dark/Light mode toggle
- Currency selection (USD, EUR, GBP, INR, JPY, CAD, AUD)
- Data reset option
- Profile info display

### 6. Monetization Ready
- Ad placeholder (AdMob-ready)
- Premium feature flags

## Project Structure

```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx          # Root layout
│   │   ├── auth/                # Auth screens
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── (tabs)/              # Main tab navigation
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx        # Expenses
│   │   │   ├── budget.tsx
│   │   │   ├── analytics.tsx
│   │   │   └── settings.tsx
│   │   └── expense/             # Expense modals
│   │       ├── _layout.tsx
│   │       ├── add.tsx
│   │       └── edit.tsx
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── constants/
│   │       └── categories.ts
│   ├── .env
│   ├── app.json
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| PUT | `/api/auth/settings` | Update user settings |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | Get expenses (with month/year filter) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/{id}` | Get single expense |
| PUT | `/api/expenses/{id}` | Update expense |
| DELETE | `/api/expenses/{id}` | Delete expense |

### Budget
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets` | Get budget for month/year |
| POST | `/api/budgets` | Create/update budget |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | Get monthly summary |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | Get expense categories |
| DELETE | `/api/data/reset` | Reset all user data |
| GET | `/api/health` | Health check |

## MongoDB Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  currency: String (default: "USD"),
  created_at: Date
}
```

### Expenses Collection
```javascript
{
  _id: ObjectId,
  user_id: String,
  amount: Number,
  category: String,
  date: Date,
  notes: String,
  created_at: Date
}
```

### Budgets Collection
```javascript
{
  _id: ObjectId,
  user_id: String,
  amount: Number,
  month: Number (1-12),
  year: Number,
  created_at: Date
}
```

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=expense_tracker
JWT_SECRET=your-secret-key
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

## Setup Instructions

### Backend
1. Create virtual environment: `python -m venv venv`
2. Activate: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
3. Install dependencies: `pip install -r requirements.txt`
4. Start MongoDB
5. Run server: `uvicorn server:app --reload --port 8001`

### Frontend
1. Install dependencies: `yarn install` or `npm install`
2. Start Expo: `expo start`
3. Scan QR code with Expo Go app or run in browser

## Security Features
- Password hashing with bcrypt
- JWT tokens with expiration
- Input validation
- CORS configuration
- Protected API routes

## Performance Optimizations
- Async MongoDB operations
- Efficient list rendering with FlatList
- Lazy loading of screens
- Optimized state management
