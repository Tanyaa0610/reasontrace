# ReasonTrace

**Debug how you learn.**

## Problem

Most learning tools follow one loop: *Question → Answer → Score*. A student gets a problem wrong, sees a red X, and moves on. Nobody looks at *why* they got it wrong, so the same mistake resurfaces next week under a different problem number.

## Solution

ReasonTrace follows a different loop: *Question → Reasoning → Error Pattern → Intervention → Verification*. It reads a student's actual solution steps (not just their final answer), identifies the first incorrect reasoning step, checks whether that same error has shown up in previous attempts, and — only once a pattern is confirmed — delivers a short, targeted intervention. Then it re-tests the student and reports whether the misconception actually resolved.

## Key features

- **Diagnostic session** — a curated question bank (Linear Equations, Fractions, Arithmetic) with known answers and tagged misconceptions.
- **Reasoning analysis engine** — parses step-by-step solutions, classifies errors (arithmetic / procedural / conceptual / unclassified), and never claims a diagnosis from weak evidence.
- **Misconception taxonomy** — a fixed, normalized set of misconceptions (e.g. *Inverse Operation Confusion*, *Variable Isolation*). The engine maps observed errors onto this taxonomy; it never invents new labels.
- **Recurring-error detection** — a single mistake is a "possible mistake"; the same error twice is "pattern emerging"; three or more times is a "recurring misconception," with confidence that scales with evidence.
- **Personalized intervention** — a short explanation, one worked example, and three targeted practice questions. No lectures.
- **Verification loop** — the student re-attempts similar questions; before/after scores are computed from real attempt data and classified as *Resolved*, *Improving*, or *Needs more practice*.
- **Optional AI-backed diagnosis** — when an OpenAI API key is configured, the reasoning explanation for incorrect answers can come from an LLM (constrained to the same taxonomy, with the objective correct/incorrect fact always decided deterministically). Without a key, the app runs entirely on the deterministic rule engine — no feature is lost.

## Product flow

```
Diagnostic → Analyze → Detect misconception → Intervention → Re-test → Improvement
```

## Screenshots

Not included in this repository. The fastest way to see the product is to run it locally (below) and walk through: `/` → `/dashboard` → `/diagnostic` → `/results` → `/practice/[misconceptionId]`.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | FastAPI (Python) |
| AI | OpenAI API (server-side only, optional) |
| Data | Seeded local TypeScript modules — no database for this MVP |

## Architecture

```
reasontrace/
├── app/                        Next.js pages (landing, dashboard, diagnostic, results, practice)
├── components/layout/          Shared shell (nav, header)
├── lib/
│   ├── data/                   Seeded question bank, demo student, practice questions
│   ├── utils/                  API client, session storage, scoring, pattern grouping
│   └── ui/                     Shared button/link style constants
├── types/                      Shared TypeScript data model
└── backend/
    └── app/
        ├── main.py             FastAPI routes (/api/analyze-solution, /api/misconceptions)
        └── analysis/
            ├── engine.py       Deterministic reasoning engine (rule-based)
            ├── llm.py          Optional OpenAI-backed diagnosis, with strict validation
            └── taxonomy.py     Fixed misconception taxonomy
```

The frontend never talks to OpenAI directly — all AI calls happen server-side in FastAPI, gated by whether `OPENAI_API_KEY` is set. Session data (diagnostic attempts, intervention outcomes) lives in the browser's `sessionStorage` for this MVP — there is no backend persistence layer yet.

## Local setup

Requires Node.js and Python 3.9+.

```bash
# Backend
cd backend
python3 -m venv venv          # if venv doesn't already exist
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optionally add OPENAI_API_KEY
uvicorn app.main:app --port 8000

# Frontend (new terminal, from repo root)
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

**Root `.env.local`** (frontend):
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**`backend/.env`** (backend, never exposed to the browser):
```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Leaving `OPENAI_API_KEY` empty is fully supported — the app runs on the deterministic reasoning engine and every feature still works.

## Demo instructions

1. Start both servers (above).
2. Go to `/diagnostic` and choose a topic (e.g. Linear Equations).
3. For each question, solve it on paper, then upload a photo of your handwritten work (JPG/PNG/WEBP). You can optionally type your final answer — this is what the deterministic engine uses to decide correct/incorrect with certainty; the image is the reasoning evidence.
4. Without an `OPENAI_API_KEY` configured, image-based reasoning diagnosis isn't available — you'll be prompted to type a final answer to continue, and the app will still tell you correct/incorrect from that. With a key configured, incorrect answers get a full reasoning diagnosis read from the photo itself.
5. Repeat the same mistake (or type the same wrong final answer) on a couple of questions to see the recurring-pattern detection kick in.
6. On `/results`, the recurring pattern appears with a confidence score and evidence from your actual attempts ("See why").
7. Click "Practice" to see the intervention (what went wrong, worked example, 3 questions — still typed, not image-based), complete the retest, and see the before/after score with a resolution status.

## Future scope

- Persist attempts/interventions server-side (currently session-only)
- Expand the deterministic engine and taxonomy beyond linear equations
- Teacher / class-level view (aggregate misconceptions across students)
- Handwritten-solution OCR upload
- Authentication and multi-student accounts

## Hackathon context

Built for **Horizon by Hoollow**, Round 1 ("AI with Education"). The core deliverable is the reasoning-diagnosis loop (diagnose → detect pattern → intervene → verify) working end-to-end and demo-safe without requiring a live AI key.
