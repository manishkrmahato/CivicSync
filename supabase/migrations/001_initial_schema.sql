-- =============================================================================
-- CivicSync: Initial Schema Migration (001_initial_schema.sql)
-- Complete Database Architecture, PostGIS Spatial Engine, RLS & Storage
-- Covers all 11 Documented Use Cases (UC-01 to UC-11)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- 2. DOMAIN ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'citizen',
        'official',
        'department_staff',
        'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_category AS ENUM (
        'pothole',
        'garbage',
        'water_leakage',
        'street_lighting',
        'drainage',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_status AS ENUM (
        'reported',
        'verified',
        'under_review',
        'assigned',
        'in_progress',
        'resolved',
        'rejected',
        'duplicate'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_priority AS ENUM (
        'low',
        'medium',
        'high',
        'critical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.media_type AS ENUM (
        'image',
        'document'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.duplicate_status AS ENUM (
        'suggested',
        'confirmed_duplicate',
        'dismissed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 3. CORE APPLICATION TABLES
-- -----------------------------------------------------------------------------

-- 3.1 Municipal Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    contact_email TEXT NOT NULL,
    sla_hours_default INTEGER NOT NULL DEFAULT 72,
    category_slas JSONB NOT NULL DEFAULT '{
        "water_leakage": 48,
        "drainage": 48,
        "garbage": 48,
        "street_lighting": 72,
        "pothole": 96,
        "other": 120
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 User Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role public.user_role NOT NULL DEFAULT 'citizen',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Ticket Sequence
CREATE SEQUENCE IF NOT EXISTS public.issue_ticket_seq START WITH 1 INCREMENT BY 1;

-- 3.4 Civic Issues Central Table
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) >= 5),
    description TEXT NOT NULL CHECK (length(trim(description)) >= 10),
    category public.issue_category NOT NULL,
    status public.issue_status NOT NULL DEFAULT 'reported',
    priority public.issue_priority NOT NULL DEFAULT 'medium',
    
    -- Geographic attributes with PostGIS ellipsoidal point
    address_text TEXT NOT NULL CHECK (length(trim(address_text)) >= 3),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    geom GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    ) STORED,
    ward_number TEXT,
    
    -- Department Assignment & SLA Timers
    assigned_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    assigned_official_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    deadline TIMESTAMPTZ,
    is_escalated BOOLEAN NOT NULL DEFAULT false,
    escalation_level INTEGER NOT NULL DEFAULT 0,
    escalated_at TIMESTAMPTZ,
    
    -- Deduplication lineage
    parent_issue_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
    
    -- Aggregated community feedback metrics
    upvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
    verifications_count INTEGER NOT NULL DEFAULT 0 CHECK (verifications_count >= 0),
    
    -- Resolution verification
    resolution_remarks TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- 3.5 Issue Media Evidence Table
CREATE TABLE IF NOT EXISTS public.issue_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type public.media_type NOT NULL DEFAULT 'image',
    caption TEXT,
    is_resolution_proof BOOLEAN NOT NULL DEFAULT false,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 Community Verifications Ledger (Independent from Voting)
CREATE TABLE IF NOT EXISTS public.issue_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_verified BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_issue_verification UNIQUE (issue_id, user_id)
);

-- 3.7 Community Prioritization Votes Ledger (Independent from Verification)
CREATE TABLE IF NOT EXISTS public.issue_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_issue_vote UNIQUE (issue_id, user_id)
);

-- 3.8 Immutable Issue Activity & Audit Log
CREATE TABLE IF NOT EXISTS public.issue_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    old_state JSONB,
    new_state JSONB,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 Duplicate Issue Candidates Table (PostGIS Spatial Pairs)
CREATE TABLE IF NOT EXISTS public.duplicate_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    target_issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    distance_meters NUMERIC(8, 2) NOT NULL,
    similarity_score NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    status public.duplicate_status NOT NULL DEFAULT 'suggested',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_duplicate_pair UNIQUE (source_issue_id, target_issue_id),
    CONSTRAINT chk_different_issues CHECK (source_issue_id <> target_issue_id)
);

-- -----------------------------------------------------------------------------
-- 4. SPATIAL & PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_issues_geom ON public.issues USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON public.issues (category);
CREATE INDEX IF NOT EXISTS idx_issues_citizen ON public.issues (citizen_id);
CREATE INDEX IF NOT EXISTS idx_issues_department ON public.issues (assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_issues_deadline ON public.issues (deadline) WHERE status NOT IN ('resolved', 'rejected', 'duplicate');
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON public.issues (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issue_media_issue ON public.issue_media (issue_id);
CREATE INDEX IF NOT EXISTS idx_verifications_issue ON public.issue_verifications (issue_id);
CREATE INDEX IF NOT EXISTS idx_votes_issue ON public.issue_votes (issue_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_issue ON public.issue_activity_log (issue_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_source ON public.duplicate_candidates (source_issue_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_target ON public.duplicate_candidates (target_issue_id);

-- -----------------------------------------------------------------------------
-- 5. SECURITY HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- 5.1 Check if user is an Administrator
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

-- 5.2 Check if user is an Authorized Official or Administrator
CREATE OR REPLACE FUNCTION public.is_official_or_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('official', 'admin') FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

-- 5.3 Check if user is Department Field Staff
CREATE OR REPLACE FUNCTION public.is_department_staff(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'department_staff' FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- 6. BUSINESS LOGIC PROCEDURES & TRIGGERS
-- -----------------------------------------------------------------------------

-- 6.1 Updated_At Timestamp Maintenance Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_issues_updated_at ON public.issues;
CREATE TRIGGER trg_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6.2 Ticket Number Generator Trigger (e.g. CIV-2026-0001)
CREATE OR REPLACE FUNCTION public.generate_issue_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_year TEXT;
    v_seq_num BIGINT;
BEGIN
    IF NEW.ticket_number IS NULL OR trim(NEW.ticket_number) = '' THEN
        v_year := to_char(now(), 'YYYY');
        v_seq_num := nextval('public.issue_ticket_seq');
        NEW.ticket_number := 'CIV-' || v_year || '-' || lpad(v_seq_num::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ticket_number ON public.issues;
CREATE TRIGGER trg_generate_ticket_number
BEFORE INSERT ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.generate_issue_ticket_number();

-- 6.3 Secure User Registration Profile Sync & Role Protection
-- Enforces that public registration creates citizen accounts ONLY.
-- Only administrators may promote or assign official or department staff roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'citizen' -- Strictly force citizen role on public signup
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Prevent non-admins from modifying their own role or department
-- Allows execution when running from trusted SQL Editor / service_role (auth.uid() IS NULL) or platform administrators.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.department_id IS DISTINCT FROM NEW.department_id) THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify user roles or departmental assignments.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- 6.4 Single-Vote Counter Maintenance
CREATE OR REPLACE FUNCTION public.sync_issue_votes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.issues
        SET upvotes_count = upvotes_count + 1
        WHERE id = NEW.issue_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.issues
        SET upvotes_count = GREATEST(0, upvotes_count - 1)
        WHERE id = OLD.issue_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_votes_count ON public.issue_votes;
CREATE TRIGGER trg_sync_votes_count
AFTER INSERT OR DELETE ON public.issue_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_issue_votes_count();

-- 6.5 Single-Verification Counter Maintenance
-- Increments verifications_count ONLY for affirmative verifications (is_verified = true).
CREATE OR REPLACE FUNCTION public.sync_issue_verifications_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_verified = true THEN
            UPDATE public.issues
            SET verifications_count = verifications_count + 1
            WHERE id = NEW.issue_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_verified = true THEN
            UPDATE public.issues
            SET verifications_count = GREATEST(0, verifications_count - 1)
            WHERE id = OLD.issue_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_verifications_count ON public.issue_verifications;
CREATE TRIGGER trg_sync_verifications_count
AFTER INSERT OR DELETE ON public.issue_verifications
FOR EACH ROW EXECUTE FUNCTION public.sync_issue_verifications_count();

-- 6.5.1 Validate Community Verification Constraints
-- Prevents self-verification (citizen cannot verify their own reported issue) and closed-issue verification.
CREATE OR REPLACE FUNCTION public.validate_issue_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_citizen_id UUID;
    v_status public.issue_status;
BEGIN
    SELECT citizen_id, status INTO v_citizen_id, v_status
    FROM public.issues
    WHERE id = NEW.issue_id;

    IF v_citizen_id IS NULL THEN
        RAISE EXCEPTION 'Issue not found.';
    END IF;

    IF NEW.user_id = v_citizen_id THEN
        RAISE EXCEPTION 'Self-verification disallowed: Citizens cannot verify issues they reported.';
    END IF;

    IF v_status IN ('resolved', 'rejected', 'duplicate') THEN
        RAISE EXCEPTION 'Verification disallowed: Cannot verify an issue that is already %.', v_status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_issue_verification ON public.issue_verifications;
CREATE TRIGGER trg_validate_issue_verification
BEFORE INSERT ON public.issue_verifications
FOR EACH ROW EXECUTE FUNCTION public.validate_issue_verification();

-- 6.5.2 Enforce Immutability on Issue Verifications
-- Verifications cannot be modified or retracted once submitted by ordinary users.
CREATE OR REPLACE FUNCTION public.prevent_verification_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Immutable record: Community verifications cannot be modified or retracted once recorded.';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_verification_mutation ON public.issue_verifications;
CREATE TRIGGER trg_prevent_verification_mutation
BEFORE UPDATE OR DELETE ON public.issue_verifications
FOR EACH ROW EXECUTE FUNCTION public.prevent_verification_mutation();

-- 6.5.3 Validate Community Vote Constraints
-- Disallows voting on closed, resolved, or duplicate issues.
CREATE OR REPLACE FUNCTION public.validate_issue_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status public.issue_status;
BEGIN
    SELECT status INTO v_status
    FROM public.issues
    WHERE id = NEW.issue_id;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Issue not found.';
    END IF;

    IF v_status IN ('resolved', 'rejected', 'duplicate') THEN
        RAISE EXCEPTION 'Voting disallowed: Cannot vote on an issue that is already %.', v_status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_issue_vote ON public.issue_votes;
CREATE TRIGGER trg_validate_issue_vote
BEFORE INSERT ON public.issue_votes
FOR EACH ROW EXECUTE FUNCTION public.validate_issue_vote();

-- 6.6 Non-Silent Community Priority Escalation Trigger
-- Automatically elevates priority to 'high' when engagement thresholds (5 votes or 3 affirmative verifications) are met.
-- Records an explicit event in issue_activity_log so priority changes are never silent.
CREATE OR REPLACE FUNCTION public.check_priority_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reason TEXT;
BEGIN
    IF (NEW.upvotes_count >= 5 OR NEW.verifications_count >= 3) AND NEW.priority IN ('low', 'medium') THEN
        v_reason := format(
            'Priority automatically elevated to high: Reached community threshold (%s upvotes, %s affirmative verifications).',
            NEW.upvotes_count,
            NEW.verifications_count
        );

        NEW.priority := 'high';

        INSERT INTO public.issue_activity_log (issue_id, actor_id, action, remarks, old_state, new_state)
        VALUES (
            NEW.id,
            NULL,
            'PRIORITY_ESCALATED',
            v_reason,
            jsonb_build_object('priority', OLD.priority),
            jsonb_build_object('priority', 'high', 'upvotes', NEW.upvotes_count, 'verifications', NEW.verifications_count)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issue_priority_check ON public.issues;
CREATE TRIGGER trg_issue_priority_check
BEFORE UPDATE OF upvotes_count, verifications_count ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.check_priority_escalation();

-- 6.7 Mandatory Resolution Validation Trigger
-- Strict enforcement: Issue status CANNOT be set to 'resolved' without remarks AND at least one resolution photo uploaded by authorized personnel.
CREATE OR REPLACE FUNCTION public.validate_resolution_criteria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_proof BOOLEAN;
BEGIN
    IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
        -- Check mandatory resolution remarks
        IF NEW.resolution_remarks IS NULL OR length(trim(NEW.resolution_remarks)) < 5 THEN
            RAISE EXCEPTION 'Resolution rejected: Detailed resolution remarks are mandatory to close an issue.';
        END IF;

        -- Check mandatory resolution photograph uploaded by official or department staff
        SELECT EXISTS (
            SELECT 1 FROM public.issue_media m
            JOIN public.profiles p ON m.uploaded_by = p.id
            WHERE m.issue_id = NEW.id 
              AND m.is_resolution_proof = true
              AND p.role IN ('official', 'department_staff', 'admin')
        ) INTO v_has_proof;

        IF NOT v_has_proof THEN
            RAISE EXCEPTION 'Resolution rejected: At least one post-resolution verification photograph uploaded by an official or staff member must be attached.';
        END IF;

        NEW.resolved_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_issue_resolution ON public.issues;
CREATE TRIGGER trg_validate_issue_resolution
BEFORE UPDATE OF status ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.validate_resolution_criteria();

-- 6.7.1 Protect Administrative Fields on Issues
-- Restricts citizens from tampering with administrative status, priority, assignments, deadlines, or metrics.
CREATE OR REPLACE FUNCTION public.protect_issue_administrative_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Evaluate only direct user updates (pg_trigger_depth() = 1)
    -- System cascade updates from internal triggers (votes, verifications) run at depth >= 2
    IF pg_trigger_depth() = 1 AND auth.uid() IS NOT NULL THEN
        IF NOT public.is_official_or_admin(auth.uid()) THEN
            IF NOT public.is_department_staff(auth.uid()) THEN
                -- Citizen constraints:
                IF OLD.citizen_id <> auth.uid() THEN
                    RAISE EXCEPTION 'Unauthorized: You can only edit your own reported issues.';
                END IF;

                IF OLD.status <> 'reported' THEN
                    RAISE EXCEPTION 'Unauthorized: Issues can only be edited while in reported status.';
                END IF;

                IF (
                    OLD.ticket_number IS DISTINCT FROM NEW.ticket_number OR
                    OLD.citizen_id IS DISTINCT FROM NEW.citizen_id OR
                    OLD.status IS DISTINCT FROM NEW.status OR
                    OLD.priority IS DISTINCT FROM NEW.priority OR
                    OLD.assigned_department_id IS DISTINCT FROM NEW.assigned_department_id OR
                    OLD.assigned_official_id IS DISTINCT FROM NEW.assigned_official_id OR
                    OLD.deadline IS DISTINCT FROM NEW.deadline OR
                    OLD.is_escalated IS DISTINCT FROM NEW.is_escalated OR
                    OLD.escalation_level IS DISTINCT FROM NEW.escalation_level OR
                    OLD.escalated_at IS DISTINCT FROM NEW.escalated_at OR
                    OLD.parent_issue_id IS DISTINCT FROM NEW.parent_issue_id OR
                    OLD.upvotes_count IS DISTINCT FROM NEW.upvotes_count OR
                    OLD.verifications_count IS DISTINCT FROM NEW.verifications_count OR
                    OLD.resolution_remarks IS DISTINCT FROM NEW.resolution_remarks OR
                    OLD.resolved_at IS DISTINCT FROM NEW.resolved_at
                ) THEN
                    RAISE EXCEPTION 'Unauthorized: Citizens cannot alter administrative, status, or system tracking fields.';
                END IF;
            ELSE
                -- Field staff constraints:
                IF (
                    OLD.ticket_number IS DISTINCT FROM NEW.ticket_number OR
                    OLD.citizen_id IS DISTINCT FROM NEW.citizen_id OR
                    OLD.upvotes_count IS DISTINCT FROM NEW.upvotes_count OR
                    OLD.verifications_count IS DISTINCT FROM NEW.verifications_count OR
                    OLD.parent_issue_id IS DISTINCT FROM NEW.parent_issue_id
                ) THEN
                    RAISE EXCEPTION 'Unauthorized: Field staff cannot alter system metadata, ticket numbers, or community metrics.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_issue_administrative_fields ON public.issues;
CREATE TRIGGER trg_protect_issue_administrative_fields
BEFORE UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.protect_issue_administrative_fields();

-- 6.7.2 Protect Issue Media Records
-- Prevents ordinary users from mutating media metadata or flipping is_resolution_proof.
CREATE OR REPLACE FUNCTION public.protect_issue_media_records()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_official_or_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Issue media records cannot be modified once uploaded.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_issue_media ON public.issue_media;
CREATE TRIGGER trg_protect_issue_media
BEFORE UPDATE ON public.issue_media
FOR EACH ROW EXECUTE FUNCTION public.protect_issue_media_records();

-- 6.8 Automatic Issue Activity Logging Trigger
CREATE OR REPLACE FUNCTION public.log_issue_state_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.issue_activity_log (issue_id, actor_id, action, remarks, old_state, new_state)
        VALUES (
            NEW.id,
            auth.uid(),
            'STATUS_CHANGE',
            format('Status changed from %s to %s', OLD.status, NEW.status),
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status)
        );
    END IF;

    IF (OLD.assigned_department_id IS DISTINCT FROM NEW.assigned_department_id) THEN
        INSERT INTO public.issue_activity_log (issue_id, actor_id, action, remarks, old_state, new_state)
        VALUES (
            NEW.id,
            auth.uid(),
            'DEPARTMENT_ASSIGNED',
            'Issue routed to department',
            jsonb_build_object('department_id', OLD.assigned_department_id),
            jsonb_build_object('department_id', NEW.assigned_department_id, 'deadline', NEW.deadline)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_issue_transitions ON public.issues;
CREATE TRIGGER trg_log_issue_transitions
AFTER UPDATE ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.log_issue_state_transitions();

-- 6.9 PostGIS 75-Metre Proximity Duplicate Detection Engine
CREATE OR REPLACE FUNCTION public.detect_duplicate_candidates(
    p_issue_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_category public.issue_category,
    p_radius_meters DOUBLE PRECISION DEFAULT 75.0
)
RETURNS TABLE (
    candidate_id UUID,
    distance_meters NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        ROUND(ST_Distance(i.geom, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography)::numeric, 2) AS distance_meters
    FROM public.issues i
    WHERE i.id <> p_issue_id
      AND i.category = p_category
      AND i.status IN ('reported', 'verified', 'under_review', 'assigned', 'in_progress')
      AND ST_DWithin(i.geom, ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography, p_radius_meters)
    ORDER BY distance_meters ASC;
END;
$$;

-- Trigger to automatically evaluate spatial duplicates upon issue submission
CREATE OR REPLACE FUNCTION public.auto_queue_duplicate_candidates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.duplicate_candidates (source_issue_id, target_issue_id, distance_meters, status)
    SELECT 
        NEW.id,
        dup.candidate_id,
        dup.distance_meters,
        'suggested'
    FROM public.detect_duplicate_candidates(NEW.id, NEW.latitude, NEW.longitude, NEW.category, 75.0) dup
    ON CONFLICT (source_issue_id, target_issue_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_queue_duplicates ON public.issues;
CREATE TRIGGER trg_auto_queue_duplicates
AFTER INSERT ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.auto_queue_duplicate_candidates();

-- 6.10 Server-Side Scheduled SLA Overdue Escalator Procedure
-- Designed for scheduled background invocation (via Supabase pg_cron or Edge Function).
-- Eliminates client-side timers.
CREATE OR REPLACE FUNCTION public.check_and_escalate_overdue_issues()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_escalated_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, priority, assigned_department_id, deadline 
        FROM public.issues
        WHERE status NOT IN ('resolved', 'rejected', 'duplicate')
          AND deadline IS NOT NULL
          AND deadline < now()
          AND is_escalated = false
    LOOP
        UPDATE public.issues
        SET is_escalated = true,
            escalation_level = 1,
            escalated_at = now()
        WHERE id = r.id;

        INSERT INTO public.issue_activity_log (issue_id, actor_id, action, remarks, old_state, new_state)
        VALUES (
            r.id,
            NULL,
            'SLA_OVERDUE_ESCALATION',
            format('Ticket exceeded SLA deadline of %s. Escalated to level 1 for supervisor attention.', r.deadline),
            jsonb_build_object('is_escalated', false),
            jsonb_build_object('is_escalated', true, 'escalation_level', 1)
        );

        v_escalated_count := v_escalated_count + 1;
    END LOOP;

    RETURN v_escalated_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. RESTRICTED PUBLIC VIEWS & RPCS (ZERO CITIZEN PII)
-- -----------------------------------------------------------------------------

-- 7.1 Sanitized Public Issues View
-- Strips citizen_id, phone, email, and personal contact info.
-- Excludes rejected issues from public display.
CREATE OR REPLACE VIEW public.public_issues AS
SELECT 
    i.id,
    i.ticket_number,
    i.title,
    i.description,
    i.category,
    i.status,
    i.priority,
    i.address_text,
    i.latitude,
    i.longitude,
    i.ward_number,
    i.assigned_department_id,
    d.name AS department_name,
    i.deadline,
    i.is_escalated,
    i.escalation_level,
    i.upvotes_count,
    i.verifications_count,
    i.resolution_remarks,
    i.created_at,
    i.updated_at,
    i.resolved_at
FROM public.issues i
LEFT JOIN public.departments d ON i.assigned_department_id = d.id
WHERE i.status NOT IN ('rejected');

-- 7.2 RPC: Public Transparency Aggregated Metrics
CREATE OR REPLACE FUNCTION public.get_public_transparency_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total BIGINT;
    v_resolved BIGINT;
    v_active BIGINT;
    v_escalated BIGINT;
    v_rate NUMERIC;
BEGIN
    SELECT count(*) INTO v_total FROM public.issues WHERE status NOT IN ('rejected');
    SELECT count(*) INTO v_resolved FROM public.issues WHERE status = 'resolved';
    SELECT count(*) INTO v_escalated FROM public.issues WHERE is_escalated = true AND status NOT IN ('rejected');
    SELECT count(*) INTO v_active FROM public.issues WHERE status NOT IN ('resolved', 'rejected', 'duplicate');

    IF v_total > 0 THEN
        v_rate := ROUND((v_resolved::numeric / v_total::numeric) * 100, 1);
    ELSE
        v_rate := 0.0;
    END IF;

    RETURN jsonb_build_object(
        'total_reported', v_total,
        'total_resolved', v_resolved,
        'active_in_pipeline', v_active,
        'escalated_count', v_escalated,
        'resolution_rate_percent', v_rate
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_candidates ENABLE ROW LEVEL SECURITY;

-- 8.1 Departments Policies
DROP POLICY IF EXISTS "Public can view departments" ON public.departments;
CREATE POLICY "Public can view departments" ON public.departments
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL TO authenticated USING (public.is_admin());

-- 8.2 Profiles Policies (Privacy Preserving)
DROP POLICY IF EXISTS "Users can view own profile or officials can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or officials can view all" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_official_or_admin());

DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins full management on profiles" ON public.profiles;
CREATE POLICY "Admins full management on profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin());

-- 8.3 Issues Policies
-- Authenticated citizens view their own submissions; Officials/Staff view all issues;
-- Active issues are queryable by authenticated users for community verification and voting.
DROP POLICY IF EXISTS "Authenticated users view issues" ON public.issues;
CREATE POLICY "Authenticated users view issues" ON public.issues
    FOR SELECT TO authenticated
    USING (
        citizen_id = auth.uid() 
        OR public.is_official_or_admin() 
        OR public.is_department_staff()
        OR status NOT IN ('rejected')
    );

DROP POLICY IF EXISTS "Citizens can insert issues" ON public.issues;
CREATE POLICY "Citizens can insert issues" ON public.issues
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = citizen_id
    );

DROP POLICY IF EXISTS "Officials and department staff can update issues" ON public.issues;
DROP POLICY IF EXISTS "Authorized users can update issues" ON public.issues;
CREATE POLICY "Authorized users can update issues" ON public.issues
    FOR UPDATE TO authenticated
    USING (
        public.is_official_or_admin() 
        OR public.is_department_staff()
        OR (citizen_id = auth.uid() AND status = 'reported')
    )
    WITH CHECK (
        public.is_official_or_admin() 
        OR public.is_department_staff()
        OR (citizen_id = auth.uid() AND status = 'reported')
    );

DROP POLICY IF EXISTS "Admins can delete issues" ON public.issues;
CREATE POLICY "Admins can delete issues" ON public.issues
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 8.4 Issue Media Policies
DROP POLICY IF EXISTS "Public can view issue media" ON public.issue_media;
CREATE POLICY "Public can view issue media" ON public.issue_media
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated users can upload issue media" ON public.issue_media;
DROP POLICY IF EXISTS "Citizens can upload evidence for own issues" ON public.issue_media;
CREATE POLICY "Citizens can upload evidence for own issues" ON public.issue_media
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = uploaded_by
        AND is_resolution_proof = false
        AND EXISTS (
            SELECT 1 FROM public.issues i
            WHERE i.id = issue_id AND i.citizen_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Officials and staff can upload issue media" ON public.issue_media;
CREATE POLICY "Officials and staff can upload issue media" ON public.issue_media
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = uploaded_by
        AND (public.is_official_or_admin() OR public.is_department_staff())
    );

DROP POLICY IF EXISTS "Uploaders and officials can delete media" ON public.issue_media;
CREATE POLICY "Uploaders and officials can delete media" ON public.issue_media
    FOR DELETE TO authenticated
    USING (uploaded_by = auth.uid() OR public.is_official_or_admin());

-- 8.5 Issue Verifications Policies
DROP POLICY IF EXISTS "Public can view verifications" ON public.issue_verifications;
CREATE POLICY "Public can view verifications" ON public.issue_verifications
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated citizens can insert single verification" ON public.issue_verifications;
CREATE POLICY "Authenticated citizens can insert single verification" ON public.issue_verifications
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Note: Verification records are immutable once cast. No UPDATE or DELETE policies exist for citizens.
DROP POLICY IF EXISTS "Users can update own verification" ON public.issue_verifications;

-- 8.6 Issue Votes Policies
DROP POLICY IF EXISTS "Public can view votes" ON public.issue_votes;
CREATE POLICY "Public can view votes" ON public.issue_votes
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated citizens can cast single vote" ON public.issue_votes;
CREATE POLICY "Authenticated citizens can cast single vote" ON public.issue_votes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Citizens can retract own vote" ON public.issue_votes;
CREATE POLICY "Citizens can retract own vote" ON public.issue_votes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 8.7 Issue Activity Log Policies
DROP POLICY IF EXISTS "Authenticated users can inspect activity log" ON public.issue_activity_log;
CREATE POLICY "Authenticated users can inspect activity log" ON public.issue_activity_log
    FOR SELECT TO authenticated USING (true);

-- 8.8 Duplicate Candidates Policies
DROP POLICY IF EXISTS "Officials and admins can manage duplicate candidates" ON public.duplicate_candidates;
CREATE POLICY "Officials and admins can manage duplicate candidates" ON public.duplicate_candidates
    FOR ALL TO authenticated
    USING (public.is_official_or_admin());

-- -----------------------------------------------------------------------------
-- 9. STORAGE BUCKET CONFIGURATION & POLICIES
-- -----------------------------------------------------------------------------

-- 9.1 Register Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('issue-evidence', 'issue-evidence', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('resolution-proofs', 'resolution-proofs', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 9.2 Storage Objects RLS Policies
DROP POLICY IF EXISTS "Public can view evidence images" ON storage.objects;
CREATE POLICY "Public can view evidence images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id IN ('issue-evidence', 'resolution-proofs'));

DROP POLICY IF EXISTS "Authenticated users upload issue evidence" ON storage.objects;
CREATE POLICY "Authenticated users upload issue evidence" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'issue-evidence' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Officials and staff upload resolution proofs" ON storage.objects;
CREATE POLICY "Officials and staff upload resolution proofs" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'resolution-proofs'
        AND (public.is_official_or_admin() OR public.is_department_staff())
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Owners and admins delete media" ON storage.objects;
CREATE POLICY "Owners and admins delete media" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        auth.uid() = owner 
        OR public.is_admin()
    );

-- -----------------------------------------------------------------------------
-- 10. SEED DATA (MUNICIPAL DEPARTMENTS)
-- -----------------------------------------------------------------------------
INSERT INTO public.departments (name, code, contact_email, sla_hours_default, category_slas)
VALUES 
    (
        'Roads & Infrastructure', 
        'ROADS', 
        'roads@civicsync.gov', 
        96, 
        '{"pothole": 96, "other": 120}'::jsonb
    ),
    (
        'Waste Management & Sanitation', 
        'SANITATION', 
        'sanitation@civicsync.gov', 
        48, 
        '{"garbage": 48, "other": 72}'::jsonb
    ),
    (
        'Water Supply & Drainage', 
        'WATER', 
        'water@civicsync.gov', 
        48, 
        '{"water_leakage": 48, "drainage": 48, "other": 72}'::jsonb
    ),
    (
        'Electrical & Street Lighting', 
        'LIGHTING', 
        'lighting@civicsync.gov', 
        72, 
        '{"street_lighting": 72, "other": 96}'::jsonb
    ),
    (
        'Public Works & Parks', 
        'PARKS', 
        'parks@civicsync.gov', 
        120, 
        '{"other": 120}'::jsonb
    )
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    contact_email = EXCLUDED.contact_email,
    sla_hours_default = EXCLUDED.sla_hours_default,
    category_slas = EXCLUDED.category_slas;

-- -----------------------------------------------------------------------------
-- 11. PERMISSIONS & SCHEMA GRANTS
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.public_issues TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_transparency_metrics() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_duplicate_candidates TO authenticated;

-- Overdue escalation scheduler security: Revoke public execution, grant strictly to service_role
REVOKE EXECUTE ON FUNCTION public.check_and_escalate_overdue_issues() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_overdue_issues() TO service_role;

GRANT SELECT ON public.departments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Revoke mutation privileges on immutable and audit tables
REVOKE UPDATE, DELETE ON public.issue_verifications FROM authenticated;
REVOKE UPDATE ON public.issue_votes FROM authenticated;
REVOKE UPDATE, DELETE ON public.issue_activity_log FROM authenticated;

