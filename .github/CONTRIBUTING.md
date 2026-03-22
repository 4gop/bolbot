# Contributing to BolBot

Thank you for helping build AI tutoring for Bharat's students.

## Repository

**GitHub:** https://github.com/4gop/bolbot  
**Live app:** https://bol-bot-tutor.replit.app  
**Branch:** `main`

## Setup

```bash
git clone https://github.com/4gop/bolbot.git
cd bolbot
pnpm install
```

Copy `.env.example` to `.env` and fill in your API keys (see README).

## Workflow

1. Fork the repo on GitHub
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes, commit: `git commit -m "feat: description"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request against `main`

## Code Style

- TypeScript everywhere (strict mode)
- pnpm for package management
- Drizzle ORM for all database access — no raw SQL
- Never commit `.env` or any file with API keys

## Good First Issues

- Subject detection from student questions
- NCERT syllabus mapping JSON
- Unit tests for gamification logic
- Maithili / Bhojpuri language improvements
