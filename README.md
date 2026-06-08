# ⚡ PortfolioAI — Resume to Portfolio in 30 Seconds

> Turn your resume into a professional portfolio website instantly. No coding. No React. No design skills. AI rewrites your projects to sound 10× better.

---

## 🏗 Project Structure

```
portfolioai/
├── backend/          ← FastAPI (Python) — deployed on Render.com
│   ├── main.py       ← All API routes + AI logic + PDF parsing
│   ├── requirements.txt
│   └── render.yaml   ← Render deployment config
│
└── frontend/         ← React — deployed on Vercel
    ├── src/
    │   ├── App.js        ← Full UI (upload, generate, preview)
    │   └── utils/api.js  ← API calls to backend
    ├── public/index.html
    └── vercel.json
```

---

## 🚀 DEPLOYMENT GUIDE (Do this tonight)

### Step 1 — Get your Anthropic API Key
1. Go to https://console.anthropic.com
2. Create an account (free credits included)
3. Go to API Keys → Create key
4. Copy it — you'll need it in Step 3

---

### Step 2 — Push to GitHub

```bash
# In your terminal:
git init
git add .
git commit -m "Initial PortfolioAI commit"
# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/portfolioai.git
git push -u origin main
```

---

### Step 3 — Deploy Backend on Render.com (Free)

1. Go to https://render.com → Sign up with GitHub
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Set these settings:
   - **Root Directory:** `backend`
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your key from Step 1)
6. Click **Deploy**
7. Wait ~3 minutes → Copy your Render URL (e.g., `https://portfolioai-backend.onrender.com`)

---

### Step 4 — Deploy Frontend on Vercel (Free)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **New Project** → Import your repo
3. Set **Root Directory** to `frontend`
4. Under **Environment Variables**, add:
   - Key: `REACT_APP_API_URL`
   - Value: `https://portfolioai-backend.onrender.com` (your Render URL from Step 3)
5. Click **Deploy**
6. Your site is live at `portfolioai.vercel.app` 🎉

---

## 💻 Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-your-key-here
uvicorn main:app --reload --port 8000
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
# Create .env file:
echo "REACT_APP_API_URL=http://localhost:8000" > .env
npm start
# App running at http://localhost:3000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-from-text` | Generate portfolio from pasted text |
| POST | `/api/generate-from-pdf` | Generate portfolio from PDF upload |
| POST | `/api/download-zip` | Download portfolio as ZIP |
| GET | `/api/health` | Health check |
| GET | `/docs` | Swagger API docs |

---

## 💰 Monetization Plan

### Free Tier
- 1 template (Noir)
- PortfolioAI watermark in footer
- Download HTML only

### Pro (₹99/month)
- All 4 templates
- No watermark
- AI project rewriter
- Priority generation

### Premium (₹199/month)
- Everything in Pro
- Custom domain linking
- "Roast my portfolio" AI feature
- LinkedIn optimization score

**Recommended:** Add Razorpay (Indian) or Stripe for payments.

---

## 🔥 Features

- ✅ PDF resume upload + text parsing
- ✅ AI-powered data extraction (Claude Sonnet)
- ✅ Professional project description rewriting
- ✅ 4 premium portfolio templates
- ✅ Live preview
- ✅ Download HTML (deploy anywhere)
- ✅ Mobile-responsive portfolios
- ✅ Template switching

### Coming Next
- [ ] GitHub integration (auto-import repos)
- [ ] One-click Netlify deploy
- [ ] "Recruiter Readiness Score"
- [ ] LinkedIn URL input
- [ ] Custom domain support

---

## 🎯 Target Users
- CSE/IT students during placement season
- Freshers with no web dev experience  
- Anyone who needs a portfolio yesterday

---

## 📣 Distribution Channels
- Indian college Discord servers
- Placement Telegram groups
- LinkedIn posts with demo GIFs
- Reddit: r/developersIndia, r/india
- Twitter/X with before/after screenshots

**Hook:** "POV: You need a portfolio tonight for placements."

---

Built with ❤️ using FastAPI + React + Claude AI
