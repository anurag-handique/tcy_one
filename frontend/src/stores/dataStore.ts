import { create } from 'zustand';
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
  AttendanceCorrection,
  TaskStatus,
  WorkMode,
  UserRole,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  INITIAL_PROFILES,
  INITIAL_DEPARTMENTS,
  INITIAL_DESIGNATIONS,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVE_TYPES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_STANDUPS,
  INITIAL_STANDUP_RESPONSES,
  INITIAL_MEETINGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_HOLIDAYS,
} from '../lib/mockData';

interface DataState {
  profiles: Profile[];
  departments: Department[];
  designations: Designation[];
  attendance: Attendance[];
  attendanceCorrections: AttendanceCorrection[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  projects: Project[];
  tasks: Task[];
  standups: Standup[];
  standupResponses: StandupResponse[];
  meetings: Meeting[];
  notifications: NotificationItem[];
  holidays: Holiday[];
  isLoadingFromSupabase: boolean;

  // Supabase sync
  fetchSupabaseData: () => Promise<void>;

  // Attendance Actions
  clockIn: (employeeId: string, workMode: WorkMode, notes?: string) => Attendance;
  clockOut: (employeeId: string) => Attendance | null;
  requestAttendanceCorrection: (correction: Omit<AttendanceCorrection, 'id' | 'created_at' | 'updated_at' | 'status'>) => void;
  reviewAttendanceCorrection: (id: string, status: 'approved' | 'rejected', reviewerId: string, note?: string) => void;

  // Task Actions
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'order_index'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  addTaskComment: (taskId: string, employeeId: string, comment: string) => void;

  // Leave Actions
  applyLeave: (leave: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at' | 'status'>) => LeaveRequest;
  reviewLeaveRequest: (id: string, status: 'approved' | 'rejected', approverId: string, note?: string) => void;

  // Standup Actions
  submitStandupResponse: (response: Omit<StandupResponse, 'id' | 'submitted_at'>) => StandupResponse;

  // Meeting Actions
  createMeeting: (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => Meeting;
  updateMeetingStatus: (id: string, status: Meeting['status']) => void;
  respondToMeeting: (meetingId: string, employeeId: string, status: 'accepted' | 'declined' | 'tentative') => void;

  // Project Actions
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // Department Actions
  addDepartment: (name: string, description?: string) => Promise<Department | null>;

  // Employee Actions
  addProfile: (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => Profile;
  createEmployeeAccount: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    departmentName?: string;
    phone?: string;
    workLocation?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfileData: (id: string, updates: Partial<Profile>) => void;

  // Notifications
  addNotification: (notif: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (employeeId: string) => void;

  // Reset
  resetToDefaultData: () => void;
}

export const useDataStore = create<DataState>()((set, get) => ({
  profiles: INITIAL_PROFILES,
  departments: INITIAL_DEPARTMENTS,
  designations: INITIAL_DESIGNATIONS,
  attendance: INITIAL_ATTENDANCE,
  attendanceCorrections: [],
  leaveTypes: INITIAL_LEAVE_TYPES,
  leaveRequests: INITIAL_LEAVE_REQUESTS,
  projects: INITIAL_PROJECTS,
  tasks: INITIAL_TASKS,
  standups: INITIAL_STANDUPS,
  standupResponses: INITIAL_STANDUP_RESPONSES,
  meetings: INITIAL_MEETINGS,
  notifications: INITIAL_NOTIFICATIONS,
  holidays: INITIAL_HOLIDAYS,
  isLoadingFromSupabase: false,

      // Fetch live data directly from Supabase tables
      fetchSupabaseData: async () => {
        if (!isSupabaseConfigured || !supabase) return;
        set({ isLoadingFromSupabase: true });
        try {
          const [
            { data: profilesData },
            { data: deptData },
            { data: desigData },
            { data: attendanceData },
            { data: leaveTypesData },
            { data: leaveReqsData },
            { data: projectsData },
            { data: tasksData },
            { data: standupsData },
            { data: standupResponsesData },
            { data: meetingsData },
            { data: notifsData },
            { data: holidaysData },
          ] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('departments').select('*'),
            supabase.from('designations').select('*'),
            supabase.from('attendance').select('*').order('date', { ascending: false }),
            supabase.from('leave_types').select('*'),
            supabase.from('leave_requests').select('*').order('created_at', { ascending: false }),
            supabase.from('projects').select('*').order('created_at', { ascending: false }),
            supabase.from('tasks').select('*').order('created_at', { ascending: false }),
            supabase.from('standups').select('*').order('date', { ascending: false }),
            supabase.from('standup_responses').select('*').order('submitted_at', { ascending: false }),
            supabase.from('meetings').select('*').order('start_time', { ascending: true }),
            supabase.from('notifications').select('*').order('created_at', { ascending: false }),
            supabase.from('holidays').select('*').order('holiday_date', { ascending: true }),
          ]);

          set({
            profiles: profilesData && profilesData.length > 0 ? profilesData : (get().profiles.length > 0 ? get().profiles : INITIAL_PROFILES),
            departments: deptData || [],
            designations: desigData || [],
            attendance: attendanceData || [],
            leaveTypes: leaveTypesData && leaveTypesData.length > 0 ? leaveTypesData : INITIAL_LEAVE_TYPES,
            leaveRequests: leaveReqsData || [],
            projects: projectsData || [],
            tasks: tasksData || [],
            standups: standupsData || [],
            standupResponses: standupResponsesData || [],
            meetings: meetingsData || [],
            notifications: notifsData || [],
            holidays: holidaysData || [],
            isLoadingFromSupabase: false,
          });
        } catch (err) {
          console.error('Error fetching Supabase records:', err);
          set({ isLoadingFromSupabase: false });
        }
      },

      // Clock In
      clockIn: (employeeId, workMode, notes) => {
        const today = new Date().toISOString().split('T')[0];
        const newRecord: Attendance = {
          id: 'att-' + Date.now(),
          employee_id: employeeId,
          date: today,
          clock_in: new Date().toISOString(),
          clock_out: null,
          total_hours: 0,
          status: 'present',
          work_mode: workMode,
          notes: notes || 'Clocked in from Desktop',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          attendance: [newRecord, ...state.attendance.filter((a) => !(a.employee_id === employeeId && a.date === today))],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('attendance').upsert({
            employee_id: employeeId,
            date: today,
            clock_in: newRecord.clock_in,
            status: 'present',
            work_mode: workMode,
            notes: newRecord.notes,
          }).then();
        }

        return newRecord;
      },

      // Clock Out
      clockOut: (employeeId) => {
        const today = new Date().toISOString().split('T')[0];
        const current = get().attendance.find((a) => a.employee_id === employeeId && a.date === today);
        if (!current) return null;

        const clockOutTime = new Date().toISOString();
        const start = new Date(current.clock_in).getTime();
        const end = new Date(clockOutTime).getTime();
        const hours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;

        const updated: Attendance = {
          ...current,
          clock_out: clockOutTime,
          total_hours: hours,
          updated_at: clockOutTime,
        };

        set((state) => ({
          attendance: state.attendance.map((a) => (a.id === current.id ? updated : a)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('attendance').update({
            clock_out: clockOutTime,
            total_hours: hours,
          }).eq('employee_id', employeeId).eq('date', today).then();
        }

        return updated;
      },

      // Attendance Correction
      requestAttendanceCorrection: (correction) => {
        const newCorrection: AttendanceCorrection = {
          ...correction,
          id: 'corr-' + Date.now(),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          attendanceCorrections: [newCorrection, ...state.attendanceCorrections],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('attendance_corrections').insert({
            employee_id: correction.employee_id,
            requested_by: correction.requested_by,
            date: correction.date,
            corrected_clock_in: correction.corrected_clock_in,
            corrected_clock_out: correction.corrected_clock_out,
            reason: correction.reason,
            status: 'pending',
          }).then();
        }
      },

      reviewAttendanceCorrection: (id, status, reviewerId, note) => {
        set((state) => ({
          attendanceCorrections: state.attendanceCorrections.map((c) =>
            c.id === id ? { ...c, status, reviewed_by: reviewerId, review_note: note, updated_at: new Date().toISOString() } : c
          ),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('attendance_corrections').update({
            status,
            reviewed_by: reviewerId,
            review_note: note,
          }).eq('id', id).then();
        }
      },

      // Create Task
      createTask: (taskData) => {
        const newTask: Task = {
          ...taskData,
          id: 'task-' + Date.now(),
          order_index: get().tasks.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('tasks').insert({
            project_id: taskData.project_id,
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            assignee_id: taskData.assignee_id,
            reporter_id: taskData.reporter_id,
            due_date: taskData.due_date,
            estimated_hours: taskData.estimated_hours,
            actual_hours: 0,
            tags: taskData.tags,
          }).then();
        }

        if (taskData.assignee_id) {
          get().addNotification({
            employee_id: taskData.assignee_id,
            title: 'New Task Assigned',
            message: `You were assigned: "${taskData.title}"`,
            type: 'task',
            action_url: '/tasks',
          });
        }

        return newTask;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('tasks').update(updates).eq('id', id).then();
        }
      },

      updateTaskStatus: (id, status) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('tasks').update({ status }).eq('id', id).then();
        }
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('tasks').delete().eq('id', id).then();
        }
      },

      addTaskComment: (taskId, employeeId, comment) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        const newComment = {
          id: 'cm-' + Date.now(),
          task_id: taskId,
          employee_id: employeeId,
          comment,
          created_at: new Date().toISOString(),
        };

        const updatedComments = [...(task.comments || []), newComment];
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, comments: updatedComments } : t)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('task_comments').insert({
            task_id: taskId,
            employee_id: employeeId,
            comment,
          }).then();
        }
      },

      // Leave
      applyLeave: (leaveData) => {
        const newLeave: LeaveRequest = {
          ...leaveData,
          id: 'lr-' + Date.now(),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          leaveRequests: [newLeave, ...state.leaveRequests],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('leave_requests').insert({
            employee_id: leaveData.employee_id,
            leave_type_id: leaveData.leave_type_id,
            start_date: leaveData.start_date,
            end_date: leaveData.end_date,
            total_days: leaveData.total_days,
            reason: leaveData.reason,
            status: 'pending',
          }).then();
        }

        get().profiles
          .filter((p) => p.role === 'manager' || p.role === 'admin' || p.role === 'super_admin')
          .forEach((manager) => {
            get().addNotification({
              employee_id: manager.id,
              title: 'New Leave Request',
              message: `Leave application for ${leaveData.total_days} days received.`,
              type: 'leave',
              action_url: '/leave',
            });
          });

        return newLeave;
      },

      reviewLeaveRequest: (id, status, approverId, note) => {
        const req = get().leaveRequests.find((l) => l.id === id);
        if (!req) return;

        set((state) => ({
          leaveRequests: state.leaveRequests.map((l) =>
            l.id === id ? { ...l, status, approver_id: approverId, approver_note: note, updated_at: new Date().toISOString() } : l
          ),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('leave_requests').update({
            status,
            approver_id: approverId,
            approver_note: note,
          }).eq('id', id).then();
        }

        get().addNotification({
          employee_id: req.employee_id,
          title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your leave request for ${req.start_date} to ${req.end_date} has been ${status}.`,
          type: 'leave',
          action_url: '/leave',
        });
      },

      // Standups
      submitStandupResponse: (responseData) => {
        const newResponse: StandupResponse = {
          ...responseData,
          id: 'sr-' + Date.now(),
          submitted_at: new Date().toISOString(),
        };

        set((state) => ({
          standupResponses: [
            newResponse,
            ...state.standupResponses.filter(
              (r) => !(r.standup_id === responseData.standup_id && r.employee_id === responseData.employee_id)
            ),
          ],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('standup_responses').upsert({
            standup_id: responseData.standup_id,
            employee_id: responseData.employee_id,
            yesterday_work: responseData.yesterday_work,
            today_plan: responseData.today_plan,
            blockers: responseData.blockers,
            action_items: responseData.action_items,
          }).then();
        }

        return newResponse;
      },

      // Meetings
      createMeeting: (meetingData) => {
        const newMeeting: Meeting = {
          ...meetingData,
          id: 'm-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          meetings: [newMeeting, ...state.meetings],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('meetings').insert({
            title: meetingData.title,
            description: meetingData.description,
            agenda: meetingData.agenda,
            meeting_url: meetingData.meeting_url,
            room_location: meetingData.room_location,
            start_time: meetingData.start_time,
            end_time: meetingData.end_time,
            status: meetingData.status,
            created_by: meetingData.created_by,
            project_id: meetingData.project_id,
          }).then();
        }

        return newMeeting;
      },

      updateMeetingStatus: (id, status) => {
        set((state) => ({
          meetings: state.meetings.map((m) => (m.id === id ? { ...m, status, updated_at: new Date().toISOString() } : m)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('meetings').update({ status }).eq('id', id).then();
        }
      },

      respondToMeeting: (meetingId, employeeId, status) => {
        set((state) => ({
          meetings: state.meetings.map((m) => {
            if (m.id !== meetingId) return m;
            const participants = m.participants || [];
            const existing = participants.find((p) => p.employee_id === employeeId);
            let updatedParticipants;
            if (existing) {
              updatedParticipants = participants.map((p) =>
                p.employee_id === employeeId ? { ...p, status, joined_at: new Date().toISOString() } : p
              );
            } else {
              updatedParticipants = [...participants, { id: 'mp-' + Date.now(), meeting_id: meetingId, employee_id: employeeId, status }];
            }
            return { ...m, participants: updatedParticipants };
          }),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('meeting_participants').upsert({
            meeting_id: meetingId,
            employee_id: employeeId,
            status,
          }).then();
        }
      },

      // Projects
      createProject: (projectData) => {
        const newProj: Project = {
          ...projectData,
          id: 'p-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          projects: [newProj, ...state.projects],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('projects').insert({
            name: projectData.name,
            code: projectData.code,
            description: projectData.description,
            client_name: projectData.client_name,
            status: projectData.status,
            priority: projectData.priority,
            start_date: projectData.start_date,
            due_date: projectData.due_date,
            manager_id: projectData.manager_id,
            budget: projectData.budget,
          }).then();
        }

        return newProj;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('projects').update(updates).eq('id', id).then();
        }
      },

      // Departments
      addDepartment: async (name: string, description?: string) => {
        const cleanName = name.trim();
        if (!cleanName) return null;
        const code = cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'DEPT';
        const newDept: Department = {
          id: 'dept-' + Date.now(),
          name: cleanName,
          code: code + '-' + Math.floor(Math.random() * 900 + 100),
          description: description || '',
          manager_id: undefined,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          departments: [...state.departments.filter(d => d.name.toLowerCase() !== cleanName.toLowerCase()), newDept],
        }));

        if (supabase && isSupabaseConfigured) {
          const { data, error } = await supabase.from('departments').upsert({
            name: cleanName,
            code: newDept.code,
            description: newDept.description,
          }).select().single();
          if (data && !error) {
            set((state) => ({
              departments: [...state.departments.filter(d => d.id !== newDept.id && d.name !== cleanName), data as Department],
            }));
            return data as Department;
          }
        }
        return newDept;
      },

      // Employees
      addProfile: (profileData) => {
        const newProf: Profile = {
          ...profileData,
          id: 'e-' + Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          profiles: [newProf, ...state.profiles],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('profiles').insert({
            email: profileData.email,
            full_name: profileData.full_name,
            role: profileData.role,
            department_id: profileData.department_id,
            phone: profileData.phone,
            work_location: profileData.work_location,
            joining_date: profileData.joining_date,
            employment_status: profileData.employment_status,
            manager_id: profileData.manager_id,
            avatar_url: profileData.avatar_url,
          }).then();
        }

        return newProf;
      },

      createEmployeeAccount: async (payload) => {
        if (!payload.email || !payload.password || !payload.fullName) {
          return { success: false, error: 'Email, password, and full name are required' };
        }

        if (supabase && isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.rpc('create_employee_account', {
              p_email: payload.email.trim(),
              p_password: payload.password.trim(),
              p_full_name: payload.fullName.trim(),
              p_role: payload.role,
              p_department_name: payload.departmentName?.trim() || null,
              p_phone: payload.phone?.trim() || null,
              p_work_location: payload.workLocation?.trim() || 'Office',
            });

            if (error) {
              console.warn('RPC create_employee_account error:', error.message);
              return { success: false, error: error.message };
            }
            await get().fetchSupabaseData();
            return { success: true };
          } catch (err: any) {
            console.error('Failed to provision employee account:', err);
            return { success: false, error: err?.message || 'Failed to create account in database' };
          }
        } else {
          // Local fallback
          get().addProfile({
            full_name: payload.fullName,
            email: payload.email,
            role: payload.role,
            department_id: undefined,
            phone: payload.phone || '',
            work_location: payload.workLocation || 'Office',
            joining_date: new Date().toISOString().split('T')[0],
            employment_status: 'active',
          });
          return { success: true };
        }
      },

      updateProfileData: (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('profiles').update(updates).eq('id', id).then();
        }
      },

      // Notifications
      addNotification: (notif) => {
        const newNotif: NotificationItem = {
          ...notif,
          id: 'notif-' + Date.now(),
          is_read: false,
          created_at: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('notifications').insert({
            employee_id: notif.employee_id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            is_read: false,
            action_url: notif.action_url,
          }).then();
        }
      },

      markNotificationAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('notifications').update({ is_read: true }).eq('id', id).then();
        }
      },

      markAllNotificationsAsRead: (employeeId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.employee_id === employeeId ? { ...n, is_read: true } : n
          ),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('notifications').update({ is_read: true }).eq('employee_id', employeeId).then();
        }
      },

      resetToDefaultData: () => {
        set({
          profiles: INITIAL_PROFILES,
          departments: INITIAL_DEPARTMENTS,
          designations: INITIAL_DESIGNATIONS,
          attendance: INITIAL_ATTENDANCE,
          attendanceCorrections: [],
          leaveTypes: INITIAL_LEAVE_TYPES,
          leaveRequests: INITIAL_LEAVE_REQUESTS,
          projects: INITIAL_PROJECTS,
          tasks: INITIAL_TASKS,
          standups: INITIAL_STANDUPS,
          standupResponses: INITIAL_STANDUP_RESPONSES,
          meetings: INITIAL_MEETINGS,
          notifications: INITIAL_NOTIFICATIONS,
          holidays: INITIAL_HOLIDAYS,
        });
      },
    })
);
