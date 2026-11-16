// CivicSync Core Domain Types & Models

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

export interface Department {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  sla_hours_default: number;
  category_slas?: Record<string, number>;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  department_id?: string | null;
  department?: Department | null;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  ticket_number: string;
  citizen_id: string;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  address_text: string;
  latitude: number;
  longitude: number;
  ward_number?: string | null;
  assigned_department_id?: string | null;
  assigned_department?: Department | null;
  assigned_official_id?: string | null;
  deadline?: string | null;
  is_escalated: boolean;
  escalation_level: number;
  escalated_at?: string | null;
  parent_issue_id?: string | null;
  upvotes_count: number;
  verifications_count: number;
  resolution_remarks?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface IssueMedia {
  id: string;
  issue_id: string;
  media_url: string;
  media_type: 'image' | 'document';
  caption?: string | null;
  is_resolution_proof: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface IssueVerification {
  id: string;
  issue_id: string;
  user_id: string;
  is_verified: boolean;
  notes?: string | null;
  created_at: string;
}

export interface IssueVote {
  id: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

export interface IssueActivityLog {
  id: string;
  issue_id: string;
  actor_id?: string | null;
  action: string;
  old_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  remarks?: string | null;
  created_at: string;
}

