# REASONTRACE — Hackathon Build Specification

## 0. IMPORTANT: READ THIS FIRST

You are building the complete working MVP for the Horizon hackathon.

**Do not just explain the solution. Build it.**

The final result must be a polished, runnable web application that can be pushed directly to GitHub and deployed.

The product name is:

# ReasonTrace

### Tagline
**Debug how you learn.**

### One-line pitch
ReasonTrace is an AI-powered learning diagnosis tool that analyzes a student's solution process, identifies recurring reasoning mistakes, delivers a targeted micro-intervention, and verifies whether the misconception was actually resolved.

---

# 1. HACKATHON CONTEXT

Hackathon:
**Horizon by Hoollow**

Round 1 theme:
**AI with Education**

Submission requires:
- Working MVP
- Project description
- 2–3 minute demo video
- GitHub repository
- Live demo if available

The product must feel like a real startup-quality MVP, not an AI-generated template.

---

# 2. CORE PRODUCT IDEA

Do NOT build a generic:
- AI chatbot
- AI tutor
- PDF question-answering tool
- ChatGPT wrapper
- generic quiz generator

The core experience must be:

```text
Student solves a question
        ↓
ReasonTrace analyzes the solution process
        ↓
Finds the exact reasoning error
        ↓
Checks previous attempts
        ↓
Detects recurring misconception
        ↓
Explains WHY the mistake happened
        ↓
Creates a short targeted intervention
        ↓
Student retries similar questions
        ↓
ReasonTrace checks whether the misconception is resolved
```

The important distinction is:

> We don't only detect a wrong answer.
> We trace the reasoning behind the answer.

---

# 3. PRIMARY MVP DEMO

The main demo should use a simple Mathematics example because it is easy for judges to understand quickly.

Example question:

```text
Solve:
2x + 6 = 14
```

Student solution:

```text
2x + 6 = 14
2x = 14 + 6
2x = 20
x = 20
```

The answer is wrong.

ReasonTrace should identify:

```text
Reasoning error:
The student added 6 instead of subtracting 6
when isolating the variable.
```

Then, after looking at previous attempts:

```text
Attempt 1 → same reasoning error
Attempt 2 → same reasoning error
Attempt 3 → same reasoning error

Recurring misconception detected.
```

Then show:

```text
MISCONCEPTION
Inverse-operation confusion

Confidence
91%

Evidence
Found in 3 previous attempts
```

Then give a short intervention:

```text
When you move +6 away from 2x,
you need to undo the +6 operation.

The opposite of +6 is -6.

2x + 6 = 14
2x = 14 - 6
2x = 8
x = 4
```

Then generate 3 targeted questions.

After successful answers:

```text
Before intervention
Linear equations: 43%

After intervention
Linear equations: 78%

+35% improvement
```

This before/after moment is essential to the demo.

---

# 4. MVP FEATURES

Build these features properly.

## Feature 1 — Diagnostic Session

A student starts a short diagnostic.

Show 5–8 questions.

For MVP, use a curated question bank instead of generating every question dynamically.

Questions should have:
- question text
- subject
- concept
- expected answer
- optional solution steps
- known misconception tags

Example:

```json
{
  "id": "alg-01",
  "subject": "Mathematics",
  "concept": "Linear Equations",
  "question": "Solve 2x + 6 = 14",
  "answer": "4",
  "misconceptions": [
    "inverse_operation_confusion",
    "variable_isolation"
  ]
}
```

---

# 5. SOLUTION INPUT

Allow the student to submit a solution in two ways:

### A. Typed solution
A clean textarea where students can enter their steps.

### B. Handwritten solution upload
Allow image upload.

For MVP:
- implement the upload UI
- support image preview
- process OCR if practical
- if OCR is not reliable, provide a graceful fallback to typed reasoning

Do NOT fake OCR.

---

# 6. REASONING ANALYSIS ENGINE

Create a backend endpoint such as:

```text
POST /api/analyze-solution
```

Input:

```json
{
  "question": "...",
  "expectedAnswer": "...",
  "studentSolution": "...",
  "previousAttempts": []
}
```

Output:

```json
{
  "correct": false,
  "errorType": "conceptual",
  "concept": "Linear Equations",
  "misconception": "Inverse operation confusion",
  "confidence": 0.91,
  "errorStep": 2,
  "explanation": "...",
  "evidence": [
    "Same operation error found in previous attempt"
  ]
}
```

The system should distinguish between:

- Correct
- Arithmetic error
- Procedural error
- Conceptual error
- Misread question
- Incomplete reasoning

Do not claim certainty when the evidence is weak.

---

# 7. MISCONCEPTION ENGINE

This is the heart of the project.

Create a structured misconception model.

Example:

```text
Linear Equations
├── Inverse Operation Confusion
├── Variable Isolation
├── Sign Error
├── Distribution Error
└── Combining Like Terms
```

Each misconception should contain:

```json
{
  "id": "inverse_operation_confusion",
  "name": "Inverse Operation Confusion",
  "description": "...",
  "commonSignals": [],
  "remediationStrategy": "...",
  "practiceTemplates": []
}
```

The AI should map observed reasoning errors to these concepts.

Do not allow the LLM to invent arbitrary labels every time.

Normalize the result against the predefined misconception taxonomy.

---

# 8. RECURRING ERROR DETECTION

A single mistake is not automatically a misconception.

The system should consider:

- previous attempts
- same concept
- similar error pattern
- frequency
- confidence

Example:

```text
1 occurrence
→ Possible mistake

2 occurrences
→ Pattern emerging

3+ occurrences
→ Recurring misconception
```

Display this clearly.

Example:

```text
Possible mistake
vs.
Recurring misconception
```

This distinction is important to the product story.

---

# 9. PERSONALIZED INTERVENTION

When a misconception is detected, generate:

1. A short explanation
2. One worked example
3. Three targeted questions
4. A quick confidence check

Do NOT create a long lecture.

The intervention should take approximately 60–120 seconds.

Example structure:

```text
WHAT WENT WRONG?

You correctly identified the equation,
but when isolating x you used +6 instead of -6.

REMEMBER

To undo an operation, use its inverse.

TRY IT

1. x + 4 = 9
2. 2x + 4 = 12
3. 3x - 5 = 16
```

---

# 10. VERIFICATION LOOP

This is a major differentiator.

After intervention, do not simply say:

```text
Great job!
```

Actually test the student again.

Require 2–3 similar questions.

Then calculate:

```text
preInterventionScore
postInterventionScore
```

Example:

```text
Before: 43%
After: 78%

Improvement: +35%
```

Then classify:

```text
Resolved
Improving
Needs more practice
```

A misconception should only be marked "Resolved" when the student demonstrates consistent improvement.

---

# 11. STUDENT DASHBOARD

Create a dashboard that feels like a normal modern education product.

Do NOT make it look like a futuristic AI control panel.

Dashboard should contain:

### Header

```text
Good evening, Tanya

Here's what you're working on today.
```

### Progress summary

```text
Overall mastery       68%
Questions completed   24
Concepts improved     6
Current focus         Linear Equations
```

### Concept cards

```text
Linear Equations       43%
Fractions              84%
Graphs                 78%
Arithmetic              91%
```

Use simple progress bars.

### Learning focus

```text
Your current focus

Inverse Operation Confusion

We've seen this pattern in
3 recent attempts.

[Practice this]
```

### Recent activity

```text
Linear equations       Improved
Fractions               Strong
Quadratics              Needs practice
```

---

# 12. DIAGNOSTIC RESULT SCREEN

This screen should be one of the strongest screens in the application.

Structure:

```text
Your diagnostic results

68%
Overall mastery

2 patterns worth working on

--------------------------------

01
Inverse Operation Confusion

High priority

Detected in 3 attempts

[See why]

--------------------------------

02
Variable Isolation

Moderate

Detected in 2 attempts

[Practice]
```

When the user clicks "See why", show actual evidence from their submitted attempts.

This makes the AI feel explainable.

---

# 13. MISCONCEPTION DETAIL SCREEN

Show:

```text
Inverse Operation Confusion

What we noticed

You repeatedly added a constant
instead of subtracting it when
isolating the variable.

Evidence

Attempt 1
2x + 6 = 14
2x = 20

Attempt 2
3x + 4 = 13
3x = 17

Attempt 3
5x + 2 = 22
5x = 24

What to work on

Use the inverse operation
to undo a term.
```

Then:

```text
[Start 2-minute practice]
```

---

# 14. TEACHER / CLASS VIEW

This can be simpler than the student experience.

Add a small "Class View" section.

Example:

```text
Class overview

32 students
76% average mastery

Most common learning gaps

Inverse Operations       42%
Fractions                28%
Variable Isolation       21%
Graphs                    9%
```

Clicking a misconception:

```text
Inverse Operations

13 students affected

Recommended intervention:
5-minute targeted activity
```

Do not overbuild this.

---

# 15. UI / VISUAL DESIGN

THIS IS EXTREMELY IMPORTANT.

The user explicitly wants the UI to NOT look obviously AI-generated.

Avoid:
- excessive gradients
- purple/blue AI glow
- neon borders
- glassmorphism everywhere
- floating blobs
- huge animated backgrounds
- excessive rounded cards
- excessive emojis
- "AI magic" copy
- robot graphics
- generic SaaS landing page templates
- huge hero text with gradient letters
- unnecessary animations

The UI should look like a **real education product designed by a human product designer**.

### Visual direction

Think:

- clean
- calm
- editorial
- academic
- modern
- trustworthy
- slightly warm
- minimal

Use a mostly neutral palette.

Suggested colors:

```text
Background: #F7F7F4
Surface: #FFFFFF
Primary text: #202124
Secondary text: #6B6B67
Border: #E5E5E0
Accent: muted green or muted blue
Warning: soft amber
Error: restrained red
Success: muted green
```

Do not use saturated neon colors.

### Typography

Use a clean font such as:

- Inter
- Geist
- DM Sans

Use strong hierarchy but not oversized typography.

### Border radius

Use moderate radius:

```text
8px–12px
```

Avoid 24–32px pill-shaped everything.

### Shadows

Use very subtle shadows.

Prefer borders over dramatic shadows.

---

# 16. LAYOUT

Desktop-first, but responsive.

Main application layout:

```text
┌─────────────────────────────────────────────┐
│ ReasonTrace                  Tanya     ◯    │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Overview     │                              │
│ Diagnose     │       Main content           │
│ Practice     │                              │
│ Progress     │                              │
│              │                              │
│ Class View   │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

Sidebar should be compact.

Do not use a giant dashboard sidebar.

---

# 17. LANDING PAGE

Keep it simple.

Hero:

```text
Understand the mistake.
Not just the answer.

ReasonTrace finds recurring reasoning
patterns in student work and turns them
into targeted practice.

[Try a diagnostic]
```

Below:

```text
A simple loop

01
Solve

02
Trace

03
Practice

04
Verify
```

Then a real product screenshot/mockup.

Avoid:
"Revolutionizing education with next-generation AI..."

No buzzword-heavy marketing.

---

# 18. DEMO MODE

For the hackathon demo, create a seeded demo account.

Example:

```text
Demo Student: Tanya
```

The demo should already contain:

- 3 previous attempts
- one recurring misconception
- baseline mastery
- one completed intervention
- improvement data

But also allow a fresh diagnostic.

Add a subtle:

```text
Try demo data
```

button.

Do not make fake data misleading. Clearly label seeded examples as demo data.

---

# 19. AI INTEGRATION

Use an LLM through a server-side API.

Never expose the API key in frontend code.

Use environment variables:

```text
OPENAI_API_KEY=
```

or another supported provider if required.

Create a clean abstraction:

```text
lib/ai/
  analyzeSolution.ts
  generateIntervention.ts
  generatePractice.ts
```

Do not scatter API calls across UI components.

If no API key is configured:

- application must still run
- demo mode must work
- show a clear development fallback
- never crash

---

# 20. PROMPTING

The reasoning analysis prompt should instruct the model:

```text
You are an educational reasoning analyst.

Your job is NOT simply to mark an answer correct or incorrect.

Analyze the student's solution step by step.

Identify:
1. The first incorrect reasoning step.
2. Whether the error is arithmetic, procedural, conceptual,
   interpretation, or incomplete reasoning.
3. The most likely misconception from the provided taxonomy.
4. Evidence from the student's work.
5. Confidence from 0 to 1.

Do not invent evidence.
Do not diagnose a misconception from a single weak signal
unless the evidence is strong.

Return strict JSON.
```

The taxonomy should be supplied to the model.

---

# 21. TECH STACK

Preferred:

### Frontend
Next.js
TypeScript
Tailwind CSS

### Backend
Next.js API routes OR FastAPI

Use whichever produces the cleanest single-repo MVP.

### Database
Supabase/PostgreSQL OR local JSON for MVP if database setup becomes unnecessary.

### Charts
Recharts only where useful.

### Icons
Lucide icons.

Do not use giant icon libraries unnecessarily.

---

# 22. REPOSITORY STRUCTURE

Prefer:

```text
reasontrace/
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   ├── diagnostic/
│   ├── results/
│   ├── practice/
│   └── class/
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── diagnostic/
│   ├── results/
│   └── practice/
├── lib/
│   ├── ai/
│   ├── analysis/
│   ├── data/
│   └── utils/
├── public/
├── types/
├── .env.example
├── README.md
├── package.json
└── ...
```

Keep components modular.

Do not put the entire application into one giant component.

---

# 23. DATA MODEL

At minimum:

### Student

```text
id
name
email
overallMastery
```

### Attempt

```text
id
studentId
questionId
solution
correct
errorType
misconceptionId
confidence
createdAt
```

### Misconception

```text
id
name
description
subject
concept
remediationStrategy
```

### Intervention

```text
id
studentId
misconceptionId
baselineScore
postScore
status
createdAt
```

---

# 24. ACCESSIBILITY

Include:

- semantic HTML
- keyboard navigation
- readable contrast
- visible focus states
- alt text for images
- accessible form labels
- do not rely on color alone

This is an education product.

---

# 25. ERROR HANDLING

Every AI/API call must have:

- loading state
- error state
- retry
- fallback/demo state

Never leave the user staring at a blank screen.

Example:

```text
We couldn't analyze this attempt right now.

Your work is saved.

[Try again]
```

---

# 26. RESPONSIVENESS

Must work on:

- desktop
- laptop
- tablet
- mobile

The primary hackathon demo will likely be desktop, but the interface should not break on smaller screens.

---

# 27. PERFORMANCE

Avoid unnecessary dependencies.

Avoid huge images.

Avoid heavy animation libraries unless genuinely needed.

The app should feel fast.

Use skeleton/loading states where appropriate.

---

# 28. WHAT MAKES THIS DIFFERENT

The product positioning should always communicate:

```text
Most learning tools:
Question → Answer → Score

ReasonTrace:
Question → Reasoning → Error Pattern → Intervention → Verification
```

This is the core product story.

Do not describe the project as simply:

"An AI tutor."

---

# 29. DEMO SCRIPT TO DESIGN AROUND

The final application should support this 2–3 minute demo:

### Scene 1 — Problem

Student gets a question wrong.

### Scene 2 — Reasoning

Show their actual steps.

### Scene 3 — Detection

ReasonTrace highlights the first incorrect step.

### Scene 4 — Pattern

Show 3 previous attempts with the same pattern.

### Scene 5 — Diagnosis

Show:

```text
Recurring misconception detected
Inverse Operation Confusion
91% confidence
```

### Scene 6 — Intervention

Show a 60–120 second targeted explanation.

### Scene 7 — Re-test

Student answers 3 similar questions.

### Scene 8 — Proof

Show:

```text
43% → 78%
+35% improvement
```

### Scene 9 — Closing

```text
ReasonTrace
Debug how you learn.
```

---

# 30. DO NOT OVERBUILD

The most important working flow is:

```text
Diagnostic
→ Analyze
→ Detect misconception
→ Intervention
→ Re-test
→ Improvement
```

Everything else is secondary.

If time is limited, prioritize this flow over:
- authentication
- complex teacher management
- fancy landing page
- profile customization
- social features
- gamification
- leaderboards

---

# 31. REALISM REQUIREMENT

The UI must not look like it was generated by an AI website builder.

Use:
- restrained copy
- realistic spacing
- realistic educational data
- consistent visual hierarchy
- subtle interaction
- human-feeling empty states
- no unnecessary gradients
- no fake futuristic AI imagery

The app should look like a student startup built a serious product.

---

# 32. NO FAKE CLAIMS

Do not write claims such as:

- "95% more effective"
- "proven to improve learning"
- "scientifically validated"
- "revolutionary"

unless actual evidence is provided.

The demo improvement numbers should be clearly based on the demo student's attempts.

---

# 33. README.md

Create a professional GitHub README.

Include:

1. Project name
2. Tagline
3. Problem
4. Solution
5. Key features
6. Product flow
7. Screenshots section
8. Tech stack
9. Architecture
10. Local setup
11. Environment variables
12. Demo instructions
13. Future scope
14. Hackathon context

Keep it concise and readable.

Do not write a giant marketing essay.

---

# 34. .ENV.EXAMPLE

Create:

```text
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If Supabase is used:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Never commit real secrets.

---

# 35. GIT / GITHUB REQUIREMENT

The project must be Git-ready.

Before finishing:

```bash
npm install
npm run build
npm run lint
```

Fix all build/lint errors.

Create a clean `.gitignore`.

Do NOT commit:
- `.env`
- API keys
- node_modules
- build output
- personal data
- temporary files

Create a meaningful initial commit such as:

```text
feat: build ReasonTrace MVP
```

If the environment has GitHub authentication and a remote repository available, initialize Git, create/attach the remote, commit, and push to the default branch.

If authentication or repository access is unavailable, do not fabricate a successful push. Instead:
- finish the complete repository locally
- provide the exact commands needed to push it
- report the limitation clearly

---

# 36. QUALITY BAR

Before declaring the project complete, test:

### Student flow

```text
Landing
→ Dashboard
→ Diagnostic
→ Answer
→ Analysis
→ Results
→ Intervention
→ Practice
→ Improvement
```

### Demo flow

The seeded demo must work without an API key.

### Mobile

No major overflow.

### Errors

No uncaught runtime errors.

### Build

```text
npm run build
```

must succeed.

---

# 37. FINAL DELIVERABLE

At the end, provide:

1. Working application
2. Complete source code
3. README.md
4. .env.example
5. Clean Git history
6. GitHub-ready repository
7. Exact run commands
8. Demo credentials if needed
9. Short explanation of architecture
10. List of implemented features
11. Known limitations

Most importantly:

**BUILD THE PRODUCT, NOT A MOCKUP.**

The application must be functional enough that a judge can open it, run a diagnostic, see a reasoning error being analyzed, receive a targeted intervention, complete the re-test, and see measurable improvement.

---

# 38. FINAL DESIGN PRINCIPLE

If you have to choose between:

**more features**

and

**a more polished core experience**

choose the polished core experience.

The product should feel like:

> A thoughtful education startup product.

Not:

> An AI-generated hackathon dashboard.

Build something that a judge can understand in 30 seconds and remember after seeing 49 other submissions.


---

# 39. TOKEN-EFFICIENT EXECUTION PROTOCOL — STRICT

**This section overrides any tendency to build everything at once.**

Claude must work in controlled phases. The goal is to minimize token usage, avoid random work, and keep the implementation focused.

## PHASE ORDER

### PHASE 1 — Repository Inspection
ONLY:
- inspect the repository
- inspect `package.json`
- inspect existing app structure
- identify framework/version
- identify existing components
- identify existing styling system
- identify available dependencies
- identify whether Git is initialized
- identify whether a remote exists

Then produce a **very short report**:
```text
Stack:
Existing structure:
Reusable code:
Potential conflicts:
Recommended implementation order:
```

**STOP AFTER PHASE 1.**

Do not create the complete application in Phase 1.
Do not redesign the project.
Do not install unnecessary packages.

---

### PHASE 2 — Core Data + Diagnostic Flow

Implement ONLY the minimum foundation required for:

```text
Dashboard
→ Diagnostic
→ Question
→ Student solution
→ Submit
→ Analysis result
```

Prioritize functionality over visual polish.

Use seeded local data first if this avoids unnecessary backend complexity.

After implementation:
- run the relevant checks
- briefly report changed files
- report test status

**STOP.**

---

### PHASE 3 — Reasoning Analysis

Implement:

```text
student solution
→ first incorrect reasoning step
→ error type
→ misconception mapping
→ confidence
→ evidence
```

Create the misconception taxonomy.

Do not yet build advanced teacher features.

Use deterministic/demo fallback data when AI credentials are unavailable.

**STOP.**

---

### PHASE 4 — Intervention + Verification

Implement:

```text
Detected misconception
→ explanation
→ targeted practice
→ retest
→ before/after score
→ resolution status
```

The resolution status must be evidence-based:

```text
Resolved
Improving
Needs more practice
```

**STOP.**

---

### PHASE 5 — Product UI

Now build/refine:
- dashboard
- result screen
- misconception detail
- intervention screen
- progress
- navigation
- responsive layout

Do not rebuild working business logic just to change the UI.

**STOP.**

---

### PHASE 6 — Real AI Integration

Connect the server-side LLM integration.

Requirements:
- API key only on server
- structured JSON output
- validation of model output
- graceful failure
- demo fallback
- loading state
- retry state

Do not make the entire app dependent on a live API for the hackathon demo.

**STOP.**

---

### PHASE 7 — Final Polish

Only after the complete core flow works:

- typography
- spacing
- empty states
- loading states
- error states
- subtle transitions
- mobile responsiveness
- accessibility
- visual consistency

No decorative redesign unless it improves usability.

**STOP.**

---

### PHASE 8 — QA + GitHub Readiness

Run:

```bash
npm run lint
npm run build
```

Also manually test the primary flow:

```text
Landing
→ Dashboard
→ Diagnostic
→ Submit reasoning
→ Diagnosis
→ Intervention
→ Retest
→ Improvement
```

Fix real errors.

Then prepare:
- README
- `.env.example`
- `.gitignore`
- Git status
- clean commit if Git is available

If GitHub authentication/remote is available, push.

If not, do not pretend it was pushed.

**STOP.**

---

# 40. TOKEN DISCIPLINE — NON-NEGOTIABLE

Claude must follow all of these:

### Do not:
- generate the entire project in one response
- repeatedly explain the same architecture
- print huge code blocks when files can be edited directly
- create files without a clear purpose
- install libraries for features that can be implemented with existing dependencies
- rewrite unrelated files
- refactor working code without a reason
- build future-phase features early
- create duplicate components
- create multiple competing design systems
- spend tokens on unnecessary animations
- create fake AI features
- claim testing was done without actually running tests

### Do:
- inspect before modifying
- reuse existing code
- make the smallest sensible change
- keep business logic separate from UI
- use seeded data for reliable demo behavior
- test at meaningful milestones
- report only concise progress
- stop at phase boundaries

### Response format after each phase

Use ONLY:

```text
PHASE X COMPLETE

Implemented:
- ...
- ...

Files changed:
- ...
- ...

Validation:
- Build: PASS/FAIL/NOT RUN
- Lint: PASS/FAIL/NOT RUN

Blockers:
- None / ...

NEXT: PHASE X+1
```

No long explanation unless there is a blocker.

---

# 41. ANTI-BLOAT RULE

The MVP is NOT a full EdTech platform.

Do not add unless explicitly requested:

- social feed
- leaderboard
- chat system
- complex authentication
- payment system
- notification center
- gamification
- badges
- parent portal
- school administration
- calendar
- community
- AI voice tutor
- animated AI avatar
- complex analytics
- unnecessary settings pages

The hackathon-winning story is the reasoning diagnosis loop.

---

# 42. CORE PRODUCT PRIORITY

If time or token budget becomes constrained, use this priority order:

```text
1. Reasoning analysis
2. Misconception detection
3. Targeted intervention
4. Retest + verification
5. Clean student UI
6. Dashboard
7. Teacher view
8. Landing page
9. Extra polish
```

Never sacrifice the core learning loop for visual decoration.

---

# 43. DESIGN GUARDRAIL — AVOID "AI GENERATED" LOOK

The final interface should pass this test:

> If the word "AI" disappeared from the interface, would this still look like a credible education product?

If not, simplify it.

Avoid:
- gradient-heavy hero sections
- glowing AI effects
- purple-blue futuristic palettes
- excessive glass cards
- excessive pills
- giant rounded rectangles
- floating 3D objects
- generic dashboard templates
- stock AI illustrations
- robot imagery
- excessive sparkle icons
- unnecessary animated counters
- meaningless charts

Prefer:
- editorial spacing
- subtle borders
- restrained colors
- useful whitespace
- clear hierarchy
- practical interactions
- realistic copy
- consistent component sizing

---

# 44. DEMO-FIRST RELIABILITY

The hackathon demo must never depend entirely on:
- live LLM availability
- OCR availability
- external database availability
- external API uptime

The application must have a reliable seeded demo path.

Recommended:

```text
[Try Demo]
    ↓
Seeded student
    ↓
Known diagnostic
    ↓
Known reasoning examples
    ↓
Known misconception detection
    ↓
Known intervention
    ↓
Retest
    ↓
Known improvement calculation
```

The live AI path should enhance the product, not make the demo fragile.

---

# 45. DO NOT OVER-COMPLICATE THE AI

For the MVP, use a hybrid approach:

```text
Question metadata
+
Student reasoning
+
Misconception taxonomy
+
Previous attempts
+
LLM analysis
```

Do NOT attempt to train a custom ML model unless the existing project already requires one.

The hackathon value comes from the product workflow and reasoning analysis, not from pretending to have a huge proprietary model.

---

# 46. IMPLEMENTATION DECISION RULE

When there are multiple technically valid approaches:

Choose the option that is:

1. simplest
2. reliable
3. easy to demo
4. easy to explain to judges
5. easy to extend during the 24-hour Round 2

Do not choose an architecture merely because it sounds more advanced.

---

# 47. STARTING INSTRUCTION

When this specification is first given to Claude:

**DO NOT START CODING IMMEDIATELY.**

First inspect the repository and environment.

Then complete **PHASE 1 ONLY**.

After Phase 1, stop and wait for the next instruction.

The user will explicitly authorize the next phase.

This is intentional and must not be bypassed.
