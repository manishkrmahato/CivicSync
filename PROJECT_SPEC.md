# CivicSync: Project Specification & Functional Requirements

> **Document Version:** 1.0  
> **Source Documents:** CivicSync Project Proposal & Detailed Use Case Specification (Group-10)  
> **Status:** Approved Baseline Specification  

---

## 1. Executive Summary & Problem Domain

CivicSync is a civic technology platform engineered to bridge communication between citizens and municipal authorities. Public infrastructure failures—such as unrepaired potholes, overflowing waste bins, broken streetlights, ruptured water mains, and clogged drainage systems—often languish due to fragmented communication, opaque prioritization, and lack of departmental accountability.

CivicSync provides an end-to-end operational pipeline:
1. **Citizen Reporting & Evidence Gathering:** Geo-tagged, photo-verified issue submission.
2. **Crowd-Verification & Prioritization:** Community consensus and voting to surface critical neighborhood emergencies.
3. **Automated Triage & Deduplication:** Proximity-based duplicate detection to prevent workload inflation.
4. **Accountable Municipal Operations:** Strict department routing, time-to-resolution (SLA) deadlines, and escalation triggers.
5. **Radical Public Transparency:** Real-time citywide performance metrics, open complaint tracking, and SLA compliance analytics.

---

## 2. System Actors & Access Hierarchy

| Actor | Role Code | Authentication Level | Core Capabilities & Permissions |
| :--- | :--- | :--- | :--- |
| **Public Viewer** | `public` | None (Unauthenticated) | Views city transparency dashboards, aggregate resolution statistics, public issue map, and anonymized resolution feeds. PII strictly redacted. |
| **Citizen / Community Member** | `citizen` | Authenticated (Supabase Auth) | *Note: "Community Member" in original use cases maps directly to the authenticated `citizen` role.* Submits civic complaints with GPS coordinates and photos; verifies neighbor-reported issues (distinct from voting); upvotes to prioritize local issues; tracks own submissions. |
| **Authorized Official (Triage/Admin)** | `official` | Authenticated (Role: `official`) | Full complaint management: reviews submissions, evaluates potential duplicates, assigns/reassigns municipal departments, sets/overrides deadlines, handles escalations. |
| **Municipal Department Staff** | `department_staff` | Authenticated (Role: `department_staff`) | Department-scoped dashboard: updates progress (`IN_PROGRESS`, `UNDER_INSPECTION`), uploads resolution proof photos, records resolution notes, closes complaints. |
| **System Automation Engine** | `system` | Server-Side Scheduled Job / Database Triggers | Runs PostGIS spatial deduplication algorithms, runs scheduled server-side SLA escalation checks (`pg_cron`/Edge Function), logs state changes. |

---

## 3. Core Business Rules & Operating Invariants

1. **Authentication & Role Authorization (BR-01):**
   - User authentication is powered by **Supabase Auth (Email/Password)**.
   - Demo accounts (`citizen@civicsync.org`, `official@civicsync.org`, `roads.dept@civicsync.org`) use standard email/password authentication and **must never bypass role authorization or Row Level Security (RLS)**.
   - Lifecycle mutations (`ASSIGN`, `ESCALATE`, `REJECT`, `RESOLVE`) strictly require verified `official` or `department_staff` roles enforced at the database level via RLS.
2. **Separation of Voting and Verification (BR-02):**
   - Voting and Community Verification are distinct, independent mechanisms:
     - **Voting (Prioritization):** Exactly one vote per citizen per issue (toggleable upvote).
     - **Verification (Ground-truth validation):** Exactly one verification assessment per authenticated community member per issue (`Still Exists`, `Resolved`, `Not Found`).
3. **PostGIS Geographic Duplicate Detection (BR-03):**
   - Proximity deduplication uses a configurable **75-metre radius** evaluated using PostGIS geographic distance (`ST_DWithin` on `geography(Point, 4326)` backed by a GiST spatial index).
   - Detects active issues in the same category within 75m and links them in `duplicate_candidates` for official review. Legitimate reports are never silently discarded.
4. **Non-Silent Priority Boost & Audit Logging (BR-04):**
   - Configurable thresholds (**$\ge 5$ upvotes** or **$\ge 3$ community verifications**) elevate issue priority from `low`/`medium` to `high`.
   - **No silent priority changes:** Any automated priority escalation must create an explicit record in `issue_activity_log` with actor `system` and remarks documenting the exact trigger condition (e.g., *"Priority escalated to high due to community voting threshold (5 votes reached)"*).
5. **Configurable Department SLAs in Calendar Hours (BR-05):**
   - SLA targets are defined initially in **calendar hours** and are configurable per department/category:
     - *Water Leakage & Drainage:* 48 calendar hours
     - *Garbage & Waste Accumulation:* 48 calendar hours
     - *Street Lighting & Electrical:* 72 calendar hours
     - *Potholes & Road Damage:* 96 calendar hours
     - *Other Municipal Concerns:* 120 calendar hours
6. **Server-Side Scheduled SLA Overdue Escalation (BR-06):**
   - Overdue escalation is executed strictly via a **scheduled server-side job** (Supabase `pg_cron` / scheduled Edge Function), **never client-side timers or frontend polling**.
   - If `now() > deadline` on an unresolved issue, the scheduled job sets `is_escalated = true`, sets `escalation_level = 1`, and inserts an escalation event into `issue_activity_log`.
7. **Resolution Proof Mandate (BR-07):**
   - Transitioning an issue to `RESOLVED` requires **mandatory resolution text remarks** and **at least one post-resolution verification photograph** uploaded to the `resolution-proofs` bucket.
8. **Public Privacy Protection & RLS (BR-08):**
   - Public transparency views and public map endpoints sanitize all Personally Identifiable Information (reporter name, phone, email).
   - Enforced by PostgreSQL RLS policies where unauthenticated/public queries only receive non-sensitive issue attributes.

---

## 4. Complete 11-Use-Case Implementation Checklist & Specifications

The following table and detailed sub-specifications preserve all 11 original use cases, their actors, preconditions, postconditions, normal flows, alternative flows, and exceptions.

| UC ID | Use Case Name | Primary Actor | Priority | Preconditions | Core Workflow | Exceptions Handled | Implementation Status |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **UC-01** | **Authenticate User** | Citizen / Official | `High` | System accessible; user registered. | Login via Supabase Auth $\rightarrow$ Extract role $\rightarrow$ Route to Citizen or Official portal. | 1.EX.1, 1.EX.2 | `[ ] Pending` |
| **UC-02** | **Report Civic Issue** | Citizen | `Critical` | Citizen authenticated; reporting live. | Form input $\rightarrow$ Attach location/media $\rightarrow$ Validate $\rightarrow$ Generate ticket & confirmation. | 2.EX.1, 2.EX.2 | `[ ] Pending` |
| **UC-03** | **Upload Location & Evidence** | Citizen | `High` | Report draft in progress. | Capture map pin (Leaflet) + reverse geocode $\rightarrow$ Upload photo to Supabase Storage $\rightarrow$ Associate. | 3.EX.1, 3.EX.2 | `[ ] Pending` |
| **UC-04** | **Manage Complaint** | Authorized Official | `Critical` | Official authenticated; complaints exist. | Open queue $\rightarrow$ Filter $\rightarrow$ Inspect details & evidence $\rightarrow$ Update status/notes $\rightarrow$ Save. | 4.EX.1, 4.EX.2 | `[ ] Pending` |
| **UC-05** | **Verify Civic Issue** | Community Member (Citizen) | `Critical` | Complaint open; user has not yet verified. | Community feed $\rightarrow$ Inspect issue $\rightarrow$ Submit verification response $\rightarrow$ Increment counter. | 5.EX.1, 5.EX.2 | `[ ] Pending` |
| **UC-06** | **Detect Duplicate Complaint** | System / Official | `High` | New issue submitted; existing issues indexed. | PostGIS $\le 75\text{m}$ spatial scan + category match $\rightarrow$ Flag candidate $\rightarrow$ Official review & merge. | 6.EX.1, 6.EX.2 | `[ ] Pending` |
| **UC-07** | **Vote and Prioritize Issue** | Community Member (Citizen) | `Critical` | Issue active; user authenticated. | Community feed $\rightarrow$ Toggle Upvote $\rightarrow$ Validate single-vote rule $\rightarrow$ Update priority score. | 7.EX.1, 7.EX.2 | `[ ] Pending` |
| **UC-08** | **Assign Complaint to Department** | Authorized Official | `Critical` | Complaint reviewed; departments active. | Triage queue $\rightarrow$ Select municipal department $\rightarrow$ Calculate SLA $\rightarrow$ Save assignment. | 8.EX.1, 8.EX.2 | `[ ] Pending` |
| **UC-09** | **Track Deadline & Escalate** | Official / System | `Critical` | Complaint assigned; SLA deadline set. | Scheduled job checks deadline $\rightarrow$ Flag overdue escalation $\rightarrow$ Alert supervisor dashboard. | 9.EX.1, 9.EX.2 | `[ ] Pending` |
| **UC-10** | **View Transparency Dashboard** | Public Viewer | `High` | Endpoint live; public metrics generated. | Public loads `/transparency` $\rightarrow$ View Recharts KPI metrics (SLA compliance, avg turnaround, map). | 10.EX.1, 10.EX.2 | `[ ] Pending` |
| **UC-11** | **Update Status & Resolve Issue** | Municipal Dept / Official | `Critical` | Complaint assigned; staff authorized. | Staff opens queue $\rightarrow$ Transition status $\rightarrow$ Enter remarks + upload photo proof $\rightarrow$ Resolve. | 11.EX.1, 11.EX.2 | `[ ] Pending` |

### Detailed Use Case Flows & Exception Specifications

- **UC-01: Authenticate User**
  - *Actors:* Citizen / Authorized Official.
  - *Normal Flow:* User opens app $\rightarrow$ System displays login $\rightarrow$ User submits credentials $\rightarrow$ Supabase Auth validates $\rightarrow$ Role determined from `profiles` $\rightarrow$ Redirect to authorized dashboard.
  - *Alternative Flows:* **1.1** User accesses registration if account does not exist. **1.2** User with valid session proceeds directly to appropriate dashboard.
  - *Exceptions:* **1.EX.1** Invalid credentials: System rejects and requests valid credentials. **1.EX.2** Unauthorized role: System denies access to restricted features.

- **UC-02: Report Civic Issue**
  - *Actors:* Citizen (Authenticated).
  - *Normal Flow:* Citizen selects report option $\rightarrow$ System displays form $\rightarrow$ Citizen enters title/description/category $\rightarrow$ Provides location & evidence $\rightarrow$ Submits $\rightarrow$ System validates and issues confirmation ticket.
  - *Alternative Flows:* **2.1** Citizen edits information before submission. **2.2** Citizen cancels report before submission; system terminates without recording.
  - *Exceptions:* **2.EX.1** Missing or invalid required info: System prompts for correction. **2.EX.2** Submission failure: System informs citizen complaint could not be recorded.

- **UC-03: Upload Location and Evidence**
  - *Actors:* Citizen.
  - *Normal Flow:* Citizen opens location/evidence section $\rightarrow$ Selects location on Leaflet map $\rightarrow$ Uploads photo $\rightarrow$ System validates format/size $\rightarrow$ Stores file in Supabase Storage $\rightarrow$ Confirms association.
  - *Alternative Flows:* **3.1** Citizen provides only location info when photographic evidence is unavailable. **3.2** Citizen provides additional photographs before submitting.
  - *Exceptions:* **3.EX.1** Invalid or unavailable evidence: System alerts user and allows correction or omission if permitted. **3.EX.2** Location cannot be recorded: System prompts for valid location.

- **UC-04: Manage Complaint**
  - *Actors:* Authorized Official.
  - *Normal Flow:* Official opens dashboard $\rightarrow$ Views available complaints $\rightarrow$ Selects complaint $\rightarrow$ Inspects evidence, location, status $\rightarrow$ Updates complaint status or management notes $\rightarrow$ System validates and saves update.
  - *Alternative Flows:* **4.1** Official returns complaint requesting additional information. **4.2** Official resolves complaint after handling is complete.
  - *Exceptions:* **4.EX.1** Official lacks permission: System blocks action. **4.EX.2** Complaint cannot be updated: System reports error and retains previous state.

- **UC-05: Verify Civic Issue**
  - *Actors:* Community Member (Authenticated Citizen).
  - *Normal Flow:* Community member reviews nearby issue $\rightarrow$ Evaluates details and evidence $\rightarrow$ Submits verification response (`Still Exists` / `Resolved` / `Not Found`) $\rightarrow$ System records verification and updates verification count.
  - *Alternative Flows:* **5.1** Community member chooses not to verify. **5.2** Community member reviews another issue.
  - *Exceptions:* **5.EX.1** Complaint is closed/unavailable: System informs user. **5.EX.2** Verification submission fails or duplicate verification attempted: System rejects duplicate and reports status.

- **UC-06: Detect Duplicate Complaint**
  - *Actors:* System (PostGIS Engine) / Authorized Official.
  - *Normal Flow:* System receives newly submitted complaint $\rightarrow$ Executes spatial query ($ST\_DWithin \le 75\text{m}$) and category match against active complaints $\rightarrow$ Flags potential duplicate candidates in `duplicate_candidates` $\rightarrow$ Official reviews side-by-side $\rightarrow$ Official merges child ticket or marks as independent.
  - *Alternative Flows:* **6.1** No duplicate found: Complaint proceeds normally. **6.2** Duplicate identified: Official merges ticket into parent issue.
  - *Exceptions:* **6.EX.1** Spatial analysis fails: System retains submitted issue and flags for manual review. **6.EX.2** Insufficient comparison data: System leaves complaint available for manual triage.

- **UC-07: Vote and Prioritize Issue**
  - *Actors:* Community Member (Authenticated Citizen).
  - *Normal Flow:* Citizen opens issue $\rightarrow$ Toggles upvote $\rightarrow$ System validates single-vote rule $\rightarrow$ Records vote $\rightarrow$ Updates upvote count and recalculates priority score.
  - *Alternative Flows:* **7.1** User views issue without voting. **7.2** User retracts previous vote (toggle off).
  - *Exceptions:* **7.EX.1** Voting not permitted on closed issue: System informs user. **7.EX.2** Duplicate vote attempt: System rejects duplicate according to single-vote rule.

- **UC-08: Assign Complaint to Department**
  - *Actors:* Authorized Official.
  - *Normal Flow:* Official opens complaint $\rightarrow$ Views department routing recommendations $\rightarrow$ Selects responsible department $\rightarrow$ Confirms assignment $\rightarrow$ System records assignment, sets SLA deadline in calendar hours, and logs action.
  - *Alternative Flows:* **8.1** Official changes department before confirmation. **8.2** Official reassigns complaint when departmental responsibility changes.
  - *Exceptions:* **8.EX.1** No suitable department available: System flags complaint as unassigned. **8.EX.2** Assignment write fails: System retains previous state.

- **UC-09: Track Deadline and Escalate Complaint**
  - *Actors:* Authorized Official / System (Server-Side Scheduled Job).
  - *Normal Flow:* Server-side job checks open issues against `deadline` $\rightarrow$ Detects overdue ticket $\rightarrow$ Sets `is_escalated = true`, `escalation_level = 1` $\rightarrow$ Inserts audit log with reason $\rightarrow$ Displays prominent escalation badge on official dashboard $\rightarrow$ Official reviews and takes corrective action.
  - *Alternative Flows:* **9.1** Issue resolved before deadline; no escalation occurs. **9.2** Official reviews escalated complaint and updates status.
  - *Exceptions:* **9.EX.1** Deadline missing: System applies default category SLA. **9.EX.2** Escalation update fails: System logs error and maintains state.

- **UC-10: View Transparency Dashboard**
  - *Actors:* Public Viewer (Unauthenticated / Public).
  - *Normal Flow:* Viewer navigates to `/transparency` $\rightarrow$ System queries anonymized aggregate metrics $\rightarrow$ Displays Recharts charts (resolution rate, average turnaround time, category volume, ward breakdown) and public issue map.
  - *Alternative Flows:* **10.1** Viewer returns later for updated stats. **10.2** Viewer filters by department, date range, or ward.
  - *Exceptions:* **10.EX.1** Dashboard data unavailable: System displays available metrics with graceful degradation. **10.EX.2** Data retrieval fails: System displays user-friendly error notice.

- **UC-11: Update Complaint Status and Resolve Issue**
  - *Actors:* Municipal Department Staff / Authorized Official.
  - *Normal Flow:* Staff member opens assigned complaint $\rightarrow$ Performs field handling $\rightarrow$ Updates status (`IN_PROGRESS`, etc.) $\rightarrow$ When work complete, marks as `RESOLVED`, inputs mandatory resolution remarks, and uploads resolution photo to `resolution-proofs` $\rightarrow$ System validates and updates state.
  - *Alternative Flows:* **11.1** User updates intermediate progress notes without resolving. **11.2** User resolves complaint after work is finalized.
  - *Exceptions:* **11.EX.1** User lacks permission: System blocks update. **11.EX.2** Missing resolution photo or remarks: System halts resolution transition until required proof is supplied.

---

## 5. Non-Functional & Operational Requirements

1. **Performance:** Initial page load under 1.2s on broadband; map pin clustering handles 10,000+ issues without UI degradation.
2. **Offline Resilience & Data Integrity:** Forms persist draft state in local storage to prevent data loss on network drops.
3. **Accessibility:** WCAG 2.1 AA compliant color contrast, semantic HTML, ARIA tags for map and modals, keyboard-navigable flows.
4. **Security & Validation:** Strictly typed API contracts, client and database constraint validation, automated XSS sanitization, rate-limiting on report creation and voting.

