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
export const INITIAL_PROFILES: Profile[] = [];
export const INITIAL_LEAVE_TYPES: LeaveType[] = [];
export const INITIAL_ATTENDANCE: Attendance[] = [];
export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_STANDUPS: Standup[] = [];
export const INITIAL_STANDUP_RESPONSES: StandupResponse[] = [];
export const INITIAL_MEETINGS: Meeting[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_HOLIDAYS: Holiday[] = [
  {
    id: 'hol-2026-01',
    name: "New Year's Day",
    holiday_date: '2026-01-01',
    is_optional: false,
    description: 'First day of the year 2026',
    year: 2026,
  },
  {
    id: 'hol-2026-02',
    name: 'Republic Day',
    holiday_date: '2026-01-26',
    is_optional: false,
    description: 'National Holiday celebrating the Constitution of India',
    year: 2026,
  },
  {
    id: 'hol-2026-03',
    name: 'Maha Shivratri',
    holiday_date: '2026-02-15',
    is_optional: true,
    description: 'Great Night of Shiva',
    year: 2026,
  },
  {
    id: 'hol-2026-04',
    name: 'Holi',
    holiday_date: '2026-03-04',
    is_optional: false,
    description: 'Festival of Colors',
    year: 2026,
  },
  {
    id: 'hol-2026-05',
    name: 'Eid-ul-Fitr',
    holiday_date: '2026-03-20',
    is_optional: false,
    description: 'Islamic festival marking the end of Ramadan',
    year: 2026,
  },
  {
    id: 'hol-2026-06',
    name: 'Good Friday',
    holiday_date: '2026-04-03',
    is_optional: false,
    description: 'Christian holy day commemorating the crucifixion of Jesus',
    year: 2026,
  },
  {
    id: 'hol-2026-07',
    name: 'Dr. B.R. Ambedkar Jayanti',
    holiday_date: '2026-04-14',
    is_optional: false,
    description: 'Commemorating the father of the Constitution of India',
    year: 2026,
  },
  {
    id: 'hol-2026-08',
    name: "International Workers' Day",
    holiday_date: '2026-05-01',
    is_optional: false,
    description: 'Labor Day celebration for working professionals',
    year: 2026,
  },
  {
    id: 'hol-2026-09',
    name: 'Eid-ul-Adha (Bakrid)',
    holiday_date: '2026-05-27',
    is_optional: false,
    description: 'Feast of the Sacrifice',
    year: 2026,
  },
  {
    id: 'hol-2026-10',
    name: 'Independence Day',
    holiday_date: '2026-08-15',
    is_optional: false,
    description: 'National Holiday celebrating Indian Independence',
    year: 2026,
  },
  {
    id: 'hol-2026-11',
    name: 'Raksha Bandhan',
    holiday_date: '2026-08-26',
    is_optional: true,
    description: 'Celebration of brotherly and sisterly bonding',
    year: 2026,
  },
  {
    id: 'hol-2026-12',
    name: 'Janmashtami',
    holiday_date: '2026-09-04',
    is_optional: true,
    description: 'Birth of Lord Krishna',
    year: 2026,
  },
  {
    id: 'hol-2026-13',
    name: 'Mahatma Gandhi Jayanti',
    holiday_date: '2026-10-02',
    is_optional: false,
    description: 'National Holiday commemorating the Father of the Nation',
    year: 2026,
  },
  {
    id: 'hol-2026-14',
    name: 'Dussehra (Vijayadashami)',
    holiday_date: '2026-10-20',
    is_optional: false,
    description: 'Victory of Good over Evil',
    year: 2026,
  },
  {
    id: 'hol-2026-15',
    name: 'Diwali (Deepavali)',
    holiday_date: '2026-11-08',
    is_optional: false,
    description: 'Festival of Lights',
    year: 2026,
  },
  {
    id: 'hol-2026-16',
    name: 'Guru Nanak Jayanti',
    holiday_date: '2026-11-24',
    is_optional: false,
    description: 'Birth of Guru Nanak Dev Ji',
    year: 2026,
  },
  {
    id: 'hol-2026-17',
    name: 'Christmas Day',
    holiday_date: '2026-12-25',
    is_optional: false,
    description: 'Celebration of the birth of Jesus Christ',
    year: 2026,
  },
];
