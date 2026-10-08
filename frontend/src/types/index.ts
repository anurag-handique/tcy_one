export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';
export type EmploymentStatus = 'active' | 'on_leave' | 'probation' | 'terminated';
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'on_leave';
export type WorkMode = 'office' | 'remote' | 'hybrid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'tentative';
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'task' | 'leave' | 'standup' | 'meeting' | 'attendance' | 'sprint';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
  created_at: string;
}

export interface Designation {
  id: string;
  title: string;
  department_id?: string;
  level: string;
  description?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id?: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  department_id?: string;
  department?: Department;
  designation_id?: string;
  designation?: Designation;
  designation_title?: string;
  manager_id?: string;
  manager?: Profile;
  role: UserRole;
  employment_status: EmploymentStatus;
  joining_date: string;
  address?: string;
  emergency_contact?: string;
  work_location?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee?: Profile;
  date: string;
  clock_in: string;
  clock_out?: string | null;
  break_start?: string | null;
  break_minutes?: number;
  total_hours: number;
  overtime_hours?: number;
  status: AttendanceStatus;
  work_mode: WorkMode;
  notes?: string;
  punch_in_location?: string;
  punch_out_location?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendancePolicy {
  office_start_time: string; // e.g. "09:30"
  max_punch_in_time: string; // e.g. "10:30" (threshold after which marked as late or blocked/absent)
  office_end_time: string; // e.g. "18:30"
  max_punch_out_time: string; // e.g. "21:00"
  standard_hours: number; // e.g. 8.0
  allow_overtime: boolean; // toggle
  strict_enforcement: boolean; // if true, punches after max_punch_in marked as absent
  saturday_off_rule: '3rd_4th' | '2nd_4th' | 'all' | 'none'; // generally 3rd and 4th Saturdays are off
  working_saturdays_override: string[]; // array of 'YYYY-MM-DD' dates enabled for urgent work
  enable_location_tracking?: boolean; // toggle GPS telemetry service
  require_punch_in_location?: boolean; // whether location capture is mandatory on clock in (login)
  require_punch_out_location?: boolean; // whether location capture is mandatory on clock out (logout)
  allow_manual_location_override?: boolean; // allow fallback if GPS is disabled or unavailable
}

export interface AttendanceCorrection {
  id: string;
  attendance_id?: string;
  employee_id: string;
  employee?: Profile;
  requested_by: string;
  date: string;
  corrected_clock_in?: string;
  corrected_clock_out?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_note?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  default_days: number;
  is_paid: boolean;
  description?: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: Profile;
  leave_type_id: string;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  approver_id?: string;
  approver?: Profile;
  approver_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  client_name?: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  start_date: string;
  due_date?: string;
  manager_id?: string;
  manager?: Profile;
  budget?: number;
  members?: ProjectMember[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  employee_id: string;
  employee?: Profile;
  role: 'lead' | 'developer' | 'designer' | 'tester' | 'viewer' | 'contributor';
  joined_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  employee_id: string;
  employee?: Profile;
  comment: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id?: string;
  user_name?: string;
  employee_id?: string;
  actor_name?: string;
  details?: string;
  action: string;
  created_at: string;
}

export type IssueType = 'story' | 'task' | 'bug' | 'epic' | 'subtask' | 'improvement';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assignee_id?: string;
}

export interface Task {
  id: string;
  project_id: string;
  project?: Project;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  type?: IssueType;
  subtasks?: Subtask[];
  assignee_id?: string;
  assignee?: Profile;
  reporter_id?: string;
  reporter?: Profile;
  due_date?: string;
  estimated_hours: number;
  actual_hours: number;
  tags: string[];
  order_index: number;
  comments?: TaskComment[];
  activity_log?: TaskActivity[];
  created_at: string;
  updated_at: string;
}

export interface StandupActionItem {
  title: string;
  done: boolean;
  assigned_to?: string;
  deadline?: string;
}

export interface Standup {
  id: string;
  title: string;
  date: string;
  meeting_url?: string;
  cutoff_time: string; // e.g. "10:30"
  meeting_time: string; // e.g. "11:00"
  department_id?: string;
  department?: Department;
  created_by?: string;
  creator?: Profile;
  created_at: string;
}

export interface StandupResponse {
  id: string;
  standup_id: string;
  employee_id: string;
  employee?: Profile;
  yesterday_work: string;
  today_plan: string;
  blockers?: string;
  status: 'submitted' | 'late' | 'missed';
  action_items?: StandupActionItem[];
  submitted_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  agenda?: string;
  meeting_url?: string;
  room_location?: string;
  start_time: string;
  end_time: string;
  status: MeetingStatus;
  created_by: string;
  creator?: Profile;
  project_id?: string;
  project?: Project;
  notes?: string;
  participants?: MeetingParticipant[];
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  employee_id: string;
  employee?: Profile;
  status: ParticipantStatus;
  decline_reason?: string;
  joined_at?: string;
}

export interface NotificationItem {
  id: string;
  employee_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  is_optional: boolean;
  description?: string;
  year: number;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor?: Profile;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export type DesktopPlatform = 'windows' | 'macos' | 'linux';

export interface AppRelease {
  id: string;
  platform: DesktopPlatform;
  version: string;
  file_name: string;
  file_size: number;
  file_url: string;
  storage_path: string;
  release_notes?: string;
  uploaded_by?: string | null;
  uploaded_at: string;
}
