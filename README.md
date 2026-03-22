# BolBot — Voice-First AI Tutor for Bharat 🇮🇳

> *"Har sawaal ka jawab, WhatsApp pe — Hindi mein."*  
> Every question answered, on WhatsApp — in Hindi.

![Node.js](https://img.shields.io/badge/Node.js-24-green?logo=node.js)
![Claude AI](https://img.shields.io/badge/AI-Claude%203.5%20Haiku-orange?logo=anthropic)
![Twilio](https://img.shields.io/badge/WhatsApp-Twilio-red?logo=twilio)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)
![Replit](https://img.shields.io/badge/Hosted%20on-Replit-purple?logo=replit)
![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

---

## What is BolBot?

India's 9th-10th grade students are failing not because they lack intelligence — but because they have no one to ask their doubts to at 11 PM. Tuition is expensive. Google is in English. Their textbooks don't talk back.

BolBot does. Students send a voice note, a photo of their textbook, or a typed question in Hindi, Hinglish, or Bhojpuri — and get a warm, patient explanation back within seconds. No app to download. No English required. Just WhatsApp, the way Bharat already communicates.

---

## Demo

🌐 **Web App:** [bol-bot-tutor.replit.app](https://bol-bot-tutor.replit.app)

📱 **WhatsApp:** Save `+1 415 523 8886` → Send *"join correct-flat"* → Ask anything in Hindi

---

## Key Features

| Feature | Description |
|--------|-------------|
| 🎤 **Voice Notes** | Send audio in Hindi — Gemini transcribes, Claude explains |
| 📸 **Photo of Textbook** | Snap any question, get a step-by-step solution |
| 💬 **Hindi/Hinglish/Bhojpuri** | Responds naturally in the student's own dialect |
| 🔥 **Streaks & Points** | Daily streaks, XP points, and badges to build habits |
| 🏆 **Leaderboard** | School/region leaderboard to spark healthy competition |
| 🔔 **Evening Reminders** | 8 PM nudge if a student hasn't asked a doubt that day |
| 🌐 **Multi-platform** | Works on WhatsApp, Telegram, and the web app |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI (Text & Images)** | Claude 3.5 Haiku via Anthropic API |
| **AI (Voice Transcription)** | Google Gemini Flash 2.0 |
| **WhatsApp** | Twilio + polling (no webhook required) |
| **Telegram** | Telegram Bot API |
| **Backend** | Node.js 24, Express 5, TypeScript |
| **Database** | PostgreSQL + Drizzle ORM |
| **Frontend** | React + Vite + Tailwind CSS |
| **Hosting** | Replit (dev + production) |
| **Monorepo** | pnpm workspaces |

---

## How It Works

```
Student sends WhatsApp message
        │
        ▼
Twilio receives → BolBot polls every 3 seconds
        │
        ▼
Voice? → Gemini transcribes audio to Hindi text
Image? → Claude reads the photo + explains
Text?  → Claude answers directly in Hindi
        │
        ▼
Gamification: +5 to +15 XP, streak check, badge unlock
        │
        ▼
WhatsApp reply sent in Hindi within ~10 seconds
```

1. **Student sends** a voice note, photo, or text on WhatsApp
2. **BolBot picks it up** via 3-second polling (no webhook needed)
3. **AI explains** in simple Hindi with examples and analogies
4. **Points & badges** are awarded to reinforce the habit of asking

---

## Try It Yourself

### WhatsApp (Recommended)
1. Save this number: **+1 415 523 8886**
2. Send the message: `join correct-flat` (Twilio sandbox join code)
3. Ask anything: *"Bhaisahab, Newton ka doosra niyam kya hai?"*

### Web App
Visit [bol-bot-tutor.replit.app](https://bol-bot-tutor.replit.app) and type or speak your question directly in the browser.

### Telegram
Search for `@BolBotTutor` and start chatting.

---

## The Founding Insight

> **9 out of 20 IIT-JEE aspirants** drop out not because they lack ability — but because they hit a wall at night when no teacher is available, and feel too ashamed to ask the same doubt twice.

Tier 2/3 students in Bihar, UP, and MP have smartphones. They have WhatsApp. What they don't have is a judgment-free tutor who speaks their language and is available at midnight before an exam. BolBot is that tutor.

---

## Roadmap

- [ ] **Subject detection** — Auto-detect Physics / Chemistry / Maths / Biology from question
- [ ] **Class curriculum mapping** — Align answers to NCERT syllabus by grade
- [ ] **Voice replies** — Send audio explanations back (Google TTS)
- [ ] **Group support** — WhatsApp group bot for school classrooms
- [ ] **Regional languages** — Bhojpuri, Maithili, Awadhi native support
- [ ] **Offline-first PWA** — Works on 2G with cached responses
- [ ] **Teacher dashboard** — Aggregate doubt analytics per school

---

## Project Structure

```
bolbot/
├── artifacts/
│   ├── api-server/          # Express 5 backend (routes, AI, WhatsApp, Telegram)
│   │   └── src/
│   │       ├── routes/      # whatsapp.ts, telegram.ts, chat.ts, gamification.ts
│   │       └── services/    # whatsapp_poller.ts, gemini.ts, gamification.ts
│   └── bolbot/              # React + Vite frontend
├── lib/
│   ├── db/                  # PostgreSQL schema (users, interactions, conversations)
│   ├── api-spec/            # OpenAPI spec
│   └── api-client-react/    # Generated React Query hooks
└── pnpm-workspace.yaml
```

---

## Self-Hosting

### Prerequisites
- Node.js 24+
- pnpm 9+
- PostgreSQL database
- Twilio account (WhatsApp sandbox)
- Anthropic API key
- Google Gemini API key

### Setup

```bash
git clone https://github.com/4gop/bolbot.git
cd bolbot
pnpm install
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# AI
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# WhatsApp
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
WHATSAPP_NUMBER=+14155238886   # Twilio sandbox number

# Telegram
TELEGRAM_BOT_TOKEN=...

# Admin
ADMIN_DASHBOARD_TOKEN=your-secret-token
```

### Run

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start web frontend (separate terminal)
pnpm --filter @workspace/bolbot run dev
```

---

## Contributing

BolBot is early-stage and built for impact. Contributions welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/voice-replies`
3. Commit your changes: `git commit -m 'Add Google TTS voice replies'`
4. Push and open a Pull Request

**Good first issues:**
- Add subject detection to the Claude prompt
- Build an NCERT chapter-to-topic mapping JSON
- Write unit tests for the gamification logic
- Add Maithili language support

---

## License

MIT © 2026  BolBot. Built with ❤️ for Bharat's students.
