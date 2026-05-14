# LifePilot — Architecture Overview

**Version:** 1.0  
**Date:** 2026-05-14  
**Scope:** Phase 1 MVP (Web App)

---

## 1. System Architecture

LifePilot is built as a **fullstack monolith** using Next.js. The frontend, API, and background job triggers live in a single codebase deployed to Vercel. External services (database, LLM, email, job scheduler) are managed SaaS — no self-hosted infrastructure in MVP.

```mermaid
graph TD
    User["👤 User (Browser)"]

    subgraph Vercel["Vercel — Hosting"]
        FE["Next.js App\n/app — React UI\n(Server + Client Components)"]
        API["Next.js API Routes\n/app/api — REST Handlers\n(Serverless Functions)"]
    end

    subgraph Supabase["Supabase — Data Layer"]
        AUTH["Auth\n(Email / Magic Link)"]
        DB["PostgreSQL\n(Row Level Security)"]
        STORE["Storage\n(Data Exports)"]
    end

    subgraph External["External Services"]
        CLAUDE["Anthropic\nClaude API\n(Haiku / Sonnet)"]
        RESEND["Resend\n(Email Delivery)"]
        INNGEST["Inngest\n(Scheduled Jobs)"]
    end

    User -->|HTTPS| FE
    FE -->|Server Actions / fetch| API
    API -->|JWT auth| AUTH
    API -->|SQL + RLS| DB
    API -->|Prompt + context| CLAUDE
    API -->|Send briefing email| RESEND
    API -->|Store exports| STORE
    INNGEST -->|Cron trigger| API
```

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | React UI with server components |
| Styling | Tailwind CSS + shadcn/ui | Component library, rapid UI development |
| Backend | Next.js Route Handlers (serverless) | REST API co-located with frontend |
| Database | Supabase — PostgreSQL | Persistent storage with Row Level Security |
| Auth | Supabase Auth | Email/password, magic link, JWT sessions |
| LLM | Anthropic Claude API | Daily briefing generation and coaching |
| Email | Resend | Transactional email (briefings, nudges) |
| Background Jobs | Inngest | Scheduled briefing generation with retries |
| File Storage | Supabase Storage | User data exports |
| Hosting | Vercel | Serverless deployment, preview environments |

---

## 3. Application Layers

```mermaid
graph LR
    subgraph Client["Client Layer"]
        UI["React Components\n(shadcn/ui + Tailwind)"]
        SC["Server Components\n(data fetching)"]
    end

    subgraph Server["Server Layer (Vercel Serverless)"]
        ROUTES["API Route Handlers\n/api/briefing\n/api/checkin\n/api/profile\n/api/goals"]
        BL["Business Logic\n/lib/briefing\n/lib/goals\n/lib/notifications"]
        LLM_C["LLM Client\n/lib/claude\n(prompt builder + cache)"]
        DB_C["DB Client\n/lib/supabase\n(typed queries)"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL\nusers · goals · briefings\ncheckins · notifications"]
        RLS["Row Level Security\n(per-user isolation)"]
    end

    UI --> ROUTES
    SC --> DB_C
    ROUTES --> BL
    BL --> LLM_C
    BL --> DB_C
    DB_C --> PG
    PG --- RLS
```

---

## 4. Database Schema (Core Tables)

```mermaid
erDiagram
    users {
        uuid id PK
        text email
        text name
        jsonb profile
        timestamptz created_at
    }

    goals {
        uuid id PK
        uuid user_id FK
        text domain
        text title
        jsonb target
        text status
        timestamptz created_at
    }

    briefings {
        uuid id PK
        uuid user_id FK
        date briefing_date
        jsonb content
        text email_status
        timestamptz generated_at
    }

    checkins {
        uuid id PK
        uuid user_id FK
        date checkin_date
        int mood_score
        jsonb metrics
        timestamptz logged_at
    }

    users ||--o{ goals : "has"
    users ||--o{ briefings : "receives"
    users ||--o{ checkins : "logs"
```

---

## 5. Daily Briefing Flow

The core agent loop — runs once per day per active user.

```mermaid
sequenceDiagram
    participant CRON as Inngest Cron
    participant API as Next.js API
    participant DB as Supabase
    participant LLM as Claude API
    participant EMAIL as Resend

    CRON->>API: Trigger /api/briefing/generate (07:00 user local time)
    API->>DB: Fetch user profile + active goals
    DB-->>API: Profile + goals + last 7 days check-ins
    API->>API: Build prompt (system prompt cached)
    API->>LLM: POST /messages (Claude Haiku)
    LLM-->>API: Generated briefing content
    API->>DB: Store briefing record
    API->>EMAIL: Send briefing email (Resend)
    EMAIL-->>API: Delivery confirmation
    API->>DB: Update briefing email_status = delivered
```

---

## 6. DevSecOps Pipeline

```mermaid
flowchart LR
    subgraph Dev["Development"]
        CODE["AI Agent\nwrites code"]
        PR["GitHub PR"]
        CODE --> PR
    end

    subgraph CI["CI — GitHub Actions"]
        LINT["Lint +\nType Check"]
        TEST["Unit Tests\n(Vitest)"]
        SEC["Security Scan\n(npm audit + Snyk)"]
        PR --> LINT --> TEST --> SEC
    end

    subgraph Preview["Preview"]
        PREV["Vercel Preview\nDeploy"]
        REVIEW["Human Review\n(unique URL)"]
        SEC --> PREV --> REVIEW
    end

    subgraph CD["CD — Production"]
        MERGE["Merge to main"]
        DEPLOY["Vercel Auto-Deploy\n(zero downtime)"]
        REVIEW --> MERGE --> DEPLOY
    end

    subgraph Security["Security Controls"]
        S1["Branch Protection\n(no direct push)"]
        S2["Secret Scanning\n(GitHub)"]
        S3["Dependabot\n(weekly dep updates)"]
        S4["RLS\n(Supabase)"]
        S5["Env Vars\n(Vercel dashboard)"]
    end
```

**Security controls in place:**

| Control | Tool | What it prevents |
|---|---|---|
| Branch protection | GitHub | Direct pushes to `main`; all changes via PR |
| Secret scanning | GitHub | Accidental API key commits |
| Dependency scanning | Dependabot | Known CVEs in npm packages |
| Security audit | npm audit + Snyk | Vulnerable dependencies in CI |
| Row Level Security | Supabase | Users accessing other users' data |
| Environment secrets | Vercel dashboard | Secrets never in source code |
| TLS everywhere | Vercel (automatic) | Data in transit interception |

---

## 7. Environments

| Environment | Trigger | URL | Purpose |
|---|---|---|---|
| Preview | Every PR | `*.vercel.app` | Test features before merge |
| Production | Merge to `main` | `lifepilot.app` | Live application |

Preview environments are ephemeral — created on PR open, destroyed on merge or close. Each preview has a unique URL and shares the Supabase dev project.

---

## 8. Cost Profile (MVP — 0 to 50 users)

| Service | Tier | Monthly cost |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Supabase | Free (500MB, 2 projects) | $0 |
| Inngest | Free (50k steps/month) | $0 |
| Resend | Free (3,000 emails/month) | $0 |
| Claude Haiku API | Pay-per-use (~50 briefings/day) | ~$1–3 |
| Domain | Namecheap / Cloudflare | ~$1 |
| **Total** | | **~$2–5/month** |

**LLM cost control:**
- System prompt cached via Anthropic prompt caching (90% input token cost reduction on cached portion)
- Claude Haiku used for all routine briefings
- Hard spend alert set at $10/month in Anthropic console
- Claude Sonnet reserved for Phase 2 cross-domain reasoning

---

## 9. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monolith vs microservices | Monolith (Next.js) | Solo AI-assisted build; no ops overhead; fastest to iterate |
| Separate backend vs co-located API | Co-located (Next.js API routes) | One deployment, one codebase, simpler for AI agents to reason about |
| Self-hosted DB vs managed | Managed (Supabase) | Zero ops, built-in auth + RLS, free tier sufficient for MVP |
| Custom job queue vs managed | Managed (Inngest) | Visual dashboard, retries, no Redis/queue infra to manage |
| REST vs GraphQL | REST | Simpler, sufficient for MVP data needs, better AI code generation |
| CSS framework | Tailwind + shadcn/ui | Best AI code generation support; accessible components out of the box |
