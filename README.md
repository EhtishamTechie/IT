# International Tijarat - E-Commerce Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account
- Redis (optional, for caching)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/MuhammadTaha1038/International-Tijarat.git
cd International-Tijarat
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

3. **Environment Setup**
```bash
# Copy environment template
cp .env.template .env

# Update .env with your actual values:
# - MongoDB Atlas connection string
# - JWT secrets
# - Email configuration
```

4. **Run the application**
```bash
# Backend (Terminal 1)
cd backend
npm start

# Frontend (Terminal 2) 
cd frontend
npm run dev
```

## 🌐 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Set Environment Variables** in Vercel Dashboard:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: Strong random string
- `SESSION_SECRET`: Strong random string

### Deploy to Render/Railway/Netlify

See deployment guides in `/docs` folder.

## 📊 Features

- ✅ E-commerce platform with vendor system
- ✅ Admin panel and vendor dashboard  
- ✅ Order management system
- ✅ Commission tracking
- ✅ Product catalog with categories
- ✅ User authentication & authorization
- ✅ Shopping cart functionality
- ✅ Redis caching for performance
- ✅ Production security hardening
- ✅ Load tested (450+ RPS)

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Redis
**Frontend:** React, Vite, TailwindCSS  
**Database:** MongoDB Atlas
**Caching:** Redis + Memory Cache Hybrid
**Security:** JWT, Helmet, Rate Limiting

## 📁 Project Structure

```
International-Tijarat/
├── backend/          # Node.js API server
├── frontend/         # React application  
├── vercel.json       # Vercel deployment config
└── .env.template     # Environment variables template
```

## 🔧 Configuration

See `.env.template` for all required environment variables.

## 📈 Performance

- Average response time: 7.6ms
- Cache hit ratio: 85%+
- Load tested: 450 RPS sustained
- Database optimized with strategic indexing

## 🔒 Security

- Production security headers (Helmet)
- Rate limiting (100 req/15min)
- Input validation and sanitization  
- Secure JWT token handling
- CORS protection

## 📞 Support

For deployment support, contact the development team.
