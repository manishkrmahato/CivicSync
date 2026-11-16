# CivicSync: Engineering & Design Directives (AGENTS.md)

> This document is the permanent single source of truth for all engineering, architectural, design, and quality standards for CivicSync. Every autonomous agent, developer, and contributor must strictly follow these instructions.

---

## 1. Product Identity & Design Philosophy

CivicSync is a civic infrastructure platform for municipal governance and public service delivery. It must project the trust, permanence, and clarity of a public utility combined with the precision of high-end software.

### Visual & Design Directives
- **Aesthetic Core:** Minimalist editorial civic technology. High typographic restraint, generous whitespace, deliberate visual hierarchy.
- **Color System:**
  - **Canvas & Backgrounds:** Warm neutral surfaces. Use Tailwind `stone` scale (`stone-50` `#FBFBFA` canvas, `stone-100` card fills, `stone-200` structural borders). Never use harsh cold blue-grays or pure pitch `#000000` backgrounds.
  - **Primary Brand Accents:** Deep Forest Green (`#1B4332`, `#2D6A4F`, hover: `#081C15`). Represents civic stewardship, civic growth, and institutional stability.
  - **Muted Semantic Status Colors:**
    - *Reported / Triage:* Warm Slate (`stone-500` / `stone-700`)
    - *Under Review / Assigned:* Amber (`amber-600` / `amber-800` on `amber-50`)
    - *In Progress:* Indigo / Steel Slate (`slate-600` / `slate-800` on `slate-50`)
    - *Resolved:* Deep Pine / Emerald (`emerald-700` on `emerald-50`)
    - *Escalated / Overdue:* Crimson Terracotta (`rose-700` on `rose-50`)
- **Typography:**
  - Standard sans body: Clean, legible system sans (`Inter`, `Plus Jakarta Sans`, or `-apple-system`).
  - Editorial touches: Serif accent headings (`Newsreader`, `Playfair`, or `serif` font tokens) for narrative titles and public dashboard statistics.
  - Numerical data: Always use tabular numerals (`font-mono tabular-nums`) for ticket numbers, dates, coordinates, and metric counters.
- **Strict Anti-Patterns (NEVER DO):**
  - **NO** generic AI-template dashboard aesthetics.
  - **NO** glossy glassmorphism, glowing backdrop blurs, or heavy neon borders.
  - **NO** flashy multi-color gradient text or pulsating decorative badges.
  - **NO** gratuitous animations that delay user interaction or consume device cycles.
  - **NO** repetitive card grids with zero content density. Use structured tables and split-pane inspection views for administrative workflows.

---

## 2. Architecture & Modular Structure

We follow a modular, feature-oriented React architecture built on Vite.

```
src/
├── app/                  # Application routing, shell layouts, and providers
│   ├── routes/           # Declarative React Router route definitions
│   └── layout/           # AppShell, Navbar, Footer, Sidebar components
├── assets/               # Static assets, SVG icons, and typography tokens
├── components/           # Reusable global design system components
│   └── ui/               # shadcn/ui primitives (button, dialog, input, etc.)
├── features/             # Domain-specific feature modules
│   ├── auth/             # Login, signup, role-context, session hooks
│   ├── issues/           # Issue reporting, listing, detail view, status chips
│   ├── map/              # Leaflet/OSM map container, pin cluster, location picker
│   ├── verification/     # Community verification widget and consensus score
│   ├── prioritization/   # Upvoting and crowd-prioritization mechanisms
│   ├── triage/           # Official management queue, deduplication merge modal
│   ├── departments/      # Department assignment, routing rules, staff roster
│   ├── escalation/       # SLA timers, escalation badges, notification triggers
│   └── transparency/     # Public dashboard, Recharts analytics, export tools
├── hooks/                # Global React hooks (useGeolocation, useDebounce, etc.)
├── lib/                  # Third-party wrappers (supabaseClient, utils)
├── services/             # Direct Supabase API queries, mutations, and storage
└── types/                # Strict TypeScript interfaces, enums, database models
```

---

## 3. Strict TypeScript Standards

1. **No `any` or loose typing:** `noImplicitAny: true` and `strict: true` in `tsconfig.json`. Every component prop, API response, and hook return value must be typed explicitly.
2. **Database Types:** Generated directly from Supabase or defined as strict interfaces matching PostgreSQL tables.
3. **Domain Enums:**
   ```typescript
   export type UserRole = 'public' | 'citizen' | 'official' | 'department_staff' | 'admin';
   
   export type IssueCategory = 
     | 'pothole' 
     | 'garbage' 
     | 'water_leakage' 
     | 'street_lighting' 
     | 'drainage' 
     | 'other';
     
   export type IssueStatus = 
     | 'reported' 
     | 'verified' 
     | 'under_review' 
     | 'assigned' 
     | 'in_progress' 
     | 'resolved' 
     | 'rejected' 
     | 'duplicate';
     
   export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
   ```
4. **Validation Schemas:** Every form submission (Issue Report, Verification, Assignment, Resolution) must be validated via **Zod** before sending to Supabase.

---

## 4. Security & Data Protection Rules

1. **Row Level Security (RLS) is Non-Negotiable:** Every table in Supabase must have RLS enabled. No client can execute direct unauthorized writes or deletes.
2. **Role Verification:** Client-side role checks provide UI convenience; server-side/RLS checks guarantee security. Always verify the authenticated user's role against the `profiles` table via Supabase Auth claims or secure functions.
3. **Public Privacy Protection:** Anonymize public queries. Do not expose `citizen_id`, email, or phone numbers in public endpoints or `transparency` queries.
4. **Storage Rules:** Issue evidence uploads must be scanned for file type (JPG/PNG/WebP only) and capped at 5MB per upload. Bucket policies must restrict file mutation to the original uploader or authorized officials.

---

## 5. Testing & Verification Standards

1. **Workflow Validation:** Every critical user flow must have automated test coverage using **Vitest** and **React Testing Library**:
   - `ReportForm.test.tsx`: Validates required fields, image attachments, coordinate selection, and form submission.
   - `DuplicateDetection.test.ts`: Tests the spatial distance formula (Haversine/Cartesian) and categorization matching.
   - `SLACalculation.test.ts`: Tests deadline assignment and overdue escalation flagging.
   - `RoleGuards.test.tsx`: Tests route protection preventing unauthenticated or citizen users from accessing official triage views.
2. **Zero Mocked Functionality in Production:** The application must bind to real Supabase tables and storage. Fallback mock adapters are permitted strictly for automated CI tests.

---

## 6. Dependency & Bloat Control

- Do not install heavyweight CSS animation libraries (e.g. Framer Motion is unnecessary when standard Tailwind CSS transitions suffice).
- Do not install redundant UI packages or conflicting icon packs. Use `lucide-react` exclusively.
- Use native browser capabilities (e.g. HTML5 Geolocation API, FormData, URLSearchParams) instead of third-party wrappers.

