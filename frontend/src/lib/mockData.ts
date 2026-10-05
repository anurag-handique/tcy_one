import {
  Profile,
  Department,
  Designation,
  Attendance,
  LeaveType,
  LeaveRequest,
  Project,
  Task,
  Standup,
  StandupResponse,
  Meeting,
  NotificationItem,
  Holiday,
} from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [];

export const INITIAL_DESIGNATIONS: Designation[] = [];

// Only the real Super Admin account
export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'info@thecodeyogi.com',
    full_name: 'The Code Yogi (Super Admin)',
    role: 'super_admin',
    phone: '+91 98765 43210',
    joining_date: '2026-01-01',
    employment_status: 'active',
    work_location: 'Headquarters',
    avatar_url: '/favicon (1).ico',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-05T00:00:00Z',
  },
];

export const INITIAL_LEAVE_TYPES: LeaveType[] = [
  {
    id: 'lt-1',
    name: 'Casual Leave',
    code: 'CL',
    default_days: 12,
    is_paid: true,
    description: 'Standard short personal time off',
  },
  {
    id: 'lt-2',
    name: 'Sick Leave',
    code: 'SL',
    default_days: 8,
    is_paid: true,
    description: 'Medical illness and healthcare recovery',
  },
  {
    id: 'lt-3',
    name: 'Earned Leave',
    code: 'EL',
    default_days: 15,
    is_paid: true,
    description: 'Annual vacation and earned rest',
  },
  {
    id: 'lt-4',
    name: 'Compensatory Off',
    code: 'CO',
    default_days: 0,
    is_paid: true,
    description: 'Compensatory off for weekend or overtime shifts',
  },
];

export const INITIAL_ATTENDANCE: Attendance[] = [];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_STANDUPS: Standup[] = [];

export const INITIAL_STANDUP_RESPONSES: StandupResponse[] = [];

export const INITIAL_MEETINGS: Meeting[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_HOLIDAYS: Holiday[] = [];
