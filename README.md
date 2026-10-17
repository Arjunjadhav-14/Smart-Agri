# AgriSmart AI 🌱

> **Smart farming assistant for price prediction, weather impact analysis, and crop health detection.**

AgriSmart AI empowers farmers and agricultural stakeholders with real-time agronomic insights, mandi rate analysis, weather impact forecasts, and instant crop disease diagnostics.

---

## Features

- 🌾 **AI Crop Health Detection**: Upload or photograph crop leaves (Onion, Tomato, Wheat) to instantly detect diseases, view symptom breakdowns, and receive actionable organic & chemical treatment plans.
- 📈 **Market Price & Mandi Trends**: Real-time mandi records across major APMCs (Lasalgaon, Azadpur, Narayangaon, Kolar, etc.) with trend forecasting and buy/sell/wait recommendations.
- 🌦️ **Agricultural Weather Impact**: 5-day weather forecasting paired with tailored advice on irrigation, spraying schedules, and crop protection.
- 🌐 **Multilingual Interface**: Full support for English, Hindi (हिंदी), and Marathi (मराठी).
- 👤 **Farmer Profile & Land Records**: Manage farm size, regional location, primary crops, and preferences.

---

## Quickstart (Run on Localhost)

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env` (or configure the existing `.env`):
```bash
# Optional: Add your Gemini API key (from https://aistudio.google.com/apikey)
# If left blank, AgriSmart AI runs in smart demo mode with built-in agronomic intelligence.
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 4. Start Development Server
```bash
npm run dev
```

The application will start at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## Available Scripts

- `npm run dev`: Starts the local Express + Vite development server on port 3000.
- `npm run build`: Compiles the React + Vite frontend for production into `dist/`.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Checks TypeScript types with `tsc --noEmit`.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Motion (Framer Motion)
- **Backend**: Node.js, Express, tsx
- **AI / Data**: Google GenAI SDK (`gemini-3.8-flash`), APMC Mandi Data
- **Authentication**: Firebase Auth (with instant Guest / Demo access)
