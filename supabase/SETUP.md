# CivicSync: Supabase Database Migration & Setup Guide

This guide describes how to apply the initial database migration for CivicSync and verify that all tables, PostGIS extensions, Row Level Security (RLS) policies, storage buckets, and server-side automation triggers are correctly initialized.

---

## 1. How to Apply the Migration

### Option A: Via Supabase Web Dashboard (Recommended)
1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor** tab from the left sidebar.
3. Click **New query** (or press `New Query` button).
4. Copy the entire contents of [`supabase/migrations/001_initial_schema.sql`](file:///d:/5th%20Semester/CivicSync/supabase/migrations/001_initial_schema.sql).
5. Paste the SQL script into the query editor.
6. Click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
7. Confirm that the output message reads `Success. No rows returned` or displays confirmation of executed statements.

### Option B: Via Supabase CLI (If Local CLI is configured)
```bash
supabase db push
# or
supabase migration up
```

---

## 2. Server-Side SLA Escalation Setup (`pg_cron`)

> [!IMPORTANT]
> Automatic overdue escalation runs strictly on the database server. It is **NOT** active until you enable the `pg_cron` extension and register the scheduled background job.

### Step 2.1: Enable `pg_cron` in Supabase
1. In the Supabase Dashboard, go to **Database** -> **Extensions**.
2. Search for `pg_cron`.
3. Toggle the switch to **Enable** (or run `CREATE EXTENSION IF NOT EXISTS "pg_cron";` in the SQL Editor if your plan supports it).

### Step 2.2: Register the Scheduled Escalation Job
Run the following SQL snippet in the **SQL Editor**:
```sql
-- Schedule background escalation to check for overdue SLA deadlines every 15 minutes
SELECT cron.schedule(
    'sla-overdue-escalation',
    '*/15 * * * *',
    'SELECT public.check_and_escalate_overdue_issues()'
);
```

To verify the active cron job:
```sql
SELECT jobid, jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'sla-overdue-escalation';
```

---

## 3. Core Verification Steps

Run these verification queries in the Supabase SQL Editor to confirm that each subsystem is functioning properly:

### 3.1 Verify PostGIS Extension
```sql
SELECT postgis_full_version();
```
*Expected Result:* Returns PostGIS version string (e.g. `POSTGIS="3.x.x"...`).

### 3.2 Verify All 8 Core Tables Exist & Have RLS Enabled
```sql
SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```
*Expected Result:* 8 tables (`departments`, `duplicate_candidates`, `issue_activity_log`, `issue_media`, `issue_verifications`, `issue_votes`, `issues`, `profiles`) all displaying `rls_enabled = true`.

### 3.3 Verify Storage Buckets
```sql
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('issue-evidence', 'resolution-proofs');
```
*Expected Result:* 2 public buckets with a 5MB (`5242880` bytes) upload limit and JPEG/PNG/WebP MIME types.

### 3.4 Verify Seed Departments
```sql
SELECT code, name, sla_hours_default, category_slas 
FROM public.departments;
```
*Expected Result:* 5 departments (`ROADS`, `SANITATION`, `WATER`, `LIGHTING`, `PARKS`) with their respective SLA hours.

### 3.5 Verify Sanitized Public View & RPC
```sql
-- Test public view (zero citizen PII, rejected complaints excluded)
SELECT * FROM public.public_issues LIMIT 5;

-- Test public transparency metric RPC
SELECT public.get_public_transparency_metrics();
```

---

## 4. Security Audit Verification Queries

Verify that all security guards and business rules from the audit are active:

### 4.1 Verify Overdue Escalation RPC Permissions
Confirm that ordinary users cannot call `check_and_escalate_overdue_issues()`:
```sql
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name = 'check_and_escalate_overdue_issues';
```
*Expected Result:* Privileges are granted **only** to `service_role` (and `postgres`). Neither `anon`, `authenticated`, nor `PUBLIC` have `EXECUTE` privileges.

### 4.2 Verify Table Privilege Restrictions on Mutable and Audit Tables
```sql
SELECT table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee = 'authenticated'
  AND table_name IN ('issue_verifications', 'issue_votes', 'issue_activity_log')
ORDER BY table_name, privilege_type;
```
*Expected Result:* 
- `issue_verifications`: `SELECT`, `INSERT` (no `UPDATE` or `DELETE`).
- `issue_votes`: `SELECT`, `INSERT`, `DELETE` (no `UPDATE`).
- `issue_activity_log`: `SELECT`, `INSERT` (no `UPDATE` or `DELETE`).

### 4.3 Verify Active Security Triggers
```sql
SELECT 
    event_object_table AS table_name,
    trigger_name,
    action_timing,
    event_manipulation AS event,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```
*Expected Verification Highlights:*
- `public.profiles`: `trg_protect_profile_role` (prevents citizen self-elevation; permits trusted SQL Editor updates when `auth.uid() IS NULL` or for platform admins).
- `public.issues`: `trg_protect_issue_administrative_fields` (prevents citizens from modifying priority, status, assignments, deadlines, ticket numbers, or counters).
- `public.issues`: `trg_validate_issue_resolution` (enforces mandatory remarks and photo proof uploaded by official/staff before resolving).
- `public.issues`: `trg_issue_priority_check` (elevates priority to high upon reaching 5 votes or 3 affirmative verifications).
- `public.issue_verifications`: `trg_validate_issue_verification` (blocks self-verification and voting on closed issues).
- `public.issue_verifications`: `trg_prevent_verification_mutation` (enforces absolute immutability of verification records).
- `public.issue_votes`: `trg_validate_issue_vote` (blocks voting on closed/resolved/rejected/duplicate issues).
- `public.issue_media`: `trg_protect_issue_media` (blocks tampering with media metadata or `is_resolution_proof` flag).

---

## 5. Initializing Pre-Configured Demo Accounts

Once the schema is applied, create the three demo test accounts in the Supabase **Authentication** tab (or via the CivicSync `/register` page):

1. **Citizen User:**
   - Email: `citizen@civicsync.org`
   - Password: `CivicSync@2026`
   - Role automatically assigned as `citizen`.

2. **Official User (Triage Officer):**
   - Email: `official@civicsync.org`
   - Password: `CivicSync@2026`
   - Register the user, then elevate role in SQL Editor:
     ```sql
     UPDATE public.profiles 
     SET role = 'official' 
     WHERE email = 'official@civicsync.org';
     ```
   *(Allowed without error because `auth.uid() IS NULL` in the SQL Editor).*

3. **Department Field Staff User:**
   - Email: `roads.dept@civicsync.org`
   - Password: `CivicSync@2026`
   - Register the user, then assign department and role in SQL Editor:
     ```sql
     UPDATE public.profiles 
     SET role = 'department_staff',
         department_id = (SELECT id FROM public.departments WHERE code = 'ROADS')
     WHERE email = 'roads.dept@civicsync.org';
     ```

---

## 6. Architectural & Security Rules Summary

1. **Zero Citizen PII in Public View:** Anonymous users cannot access `issues` or `profiles` directly. Unauthenticated users query `public_issues` or `get_public_transparency_metrics()`, ensuring citizen IDs, names, phones, and emails are never exposed. Rejected complaints are stripped from public listings.
2. **Role Modification Guard:** The trigger `protect_profile_role` strictly prevents client-side tampering of user roles while allowing administrative updates from the Supabase SQL Editor.
3. **Mandatory Resolution Proof:** The trigger `validate_resolution_criteria` strictly prevents issues from being marked `resolved` without non-empty remarks AND at least one resolution photograph uploaded by an official or department staff member. Citizens cannot upload resolution proofs (`is_resolution_proof = true`).
4. **Isolated Storage Paths:** Storage upload policies enforce user folder isolation: files must be uploaded under the path `${auth.uid()}/${filename}` in the `issue-evidence` or `resolution-proofs` buckets.
5. **Administrative Field Protection:** The trigger `protect_issue_administrative_fields` blocks citizens from modifying `priority`, `status`, `assigned_department_id`, `assigned_official_id`, `deadline`, `is_escalated`, `escalation_level`, `ticket_number`, or community counter columns on complaints.
6. **Immutable Verifications:** Verification records cannot be altered or retracted once cast (`prevent_verification_mutation`).
7. **No Self-Verification:** The trigger `validate_issue_verification` prevents citizens from verifying issues they reported themselves.
8. **Affirmative Verification Accounting:** Only affirmative community verifications (`is_verified = true`) increment `verifications_count` and count toward the community escalation threshold.
9. **Automated PostGIS Deduplication:** The trigger `auto_queue_duplicate_candidates` calls `detect_duplicate_candidates()` using `ST_DWithin` ($\le 75\text{m}$) on the GiST index and populates `duplicate_candidates` on insert.
10. **Scheduled Server-Side Overdue Escalation:** Procedure `check_and_escalate_overdue_issues()` updates overdue issues and records events in `issue_activity_log`. Executable strictly by `service_role` via `pg_cron`.
