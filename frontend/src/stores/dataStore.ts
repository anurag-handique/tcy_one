import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Profile,
  Department,
  Designation,
  Attendance,
  AttendancePolicy,
  AttendanceStatus,
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
  ParticipantStatus,
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

const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  office_start_time: '09:30',
  max_punch_in_time: '10:30',
  office_end_time: '18:30',
  max_punch_out_time: '21:00',
  standard_hours: 8.0,
  allow_overtime: true,
  strict_enforcement: false,
  saturday_off_rule: '3rd_4th',
  working_saturdays_override: [],
};

const getInitialAttendancePolicy = (): AttendancePolicy => {
  try {
    const saved = localStorage.getItem('tcy_attendance_policy');
    if (saved) {
      return { ...DEFAULT_ATTENDANCE_POLICY, ...JSON.parse(saved) };
    }
  } catch (e) {}
  return DEFAULT_ATTENDANCE_POLICY;
};

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isValidUUID = (str?: string) =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

interface DataState {
  profiles: Profile[];
  departments: Department[];
  designations: Designation[];
  attendance: Attendance[];
  attendanceCorrections: AttendanceCorrection[];
  attendancePolicy: AttendancePolicy;
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

  // Attendance Actions & Policy
  updateAttendancePolicy: (policy: Partial<AttendancePolicy>) => void;
  toggleWorkingSaturdayOverride: (dateStr: string) => void;
  clockIn: (employeeId: string, workMode: WorkMode, notes?: string, location?: string) => Attendance;
  clockOut: (employeeId: string, location?: string, notes?: string) => Attendance | null;
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
  createStandup: (standup: Omit<Standup, 'id' | 'created_at'>) => Standup;
  updateStandup: (id: string, updates: Partial<Standup>) => void;
  submitStandupResponse: (response: Omit<StandupResponse, 'id' | 'submitted_at' | 'status'>) => StandupResponse;

  // Meeting Actions
  createMeeting: (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>) => Meeting;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  updateMeetingStatus: (id: string, status: Meeting['status']) => void;
  respondToMeeting: (meetingId: string, employeeId: string, status: ParticipantStatus, declineReason?: string) => void;

  // Project Actions
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Department & Designation Actions
  addDepartment: (name: string, description?: string) => Promise<Department | null>;
  updateDepartment: (id: string, updates: Partial<Department>) => Promise<boolean>;
  deleteDepartment: (id: string) => Promise<boolean>;
  addDesignation: (title: string, level: string, departmentId?: string) => Promise<Designation | null>;
  updateDesignation: (id: string, updates: Partial<Designation>) => Promise<boolean>;
  deleteDesignation: (id: string) => Promise<boolean>;

  // Employee Actions
  addProfile: (profile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => Profile;
  createEmployeeAccount: (payload: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    departmentName?: string;
    designationTitle?: string;
    phone?: string;
    workLocation?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfileData: (id: string, updates: Partial<Profile>) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<boolean>;

  // Notifications
  addNotification: (notif: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (employeeId: string) => void;

  // Reset
  resetToDefaultData: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      profiles: INITIAL_PROFILES,
      departments: INITIAL_DEPARTMENTS,
      designations: INITIAL_DESIGNATIONS,
      attendance: INITIAL_ATTENDANCE,
      attendanceCorrections: [],
      attendancePolicy: getInitialAttendancePolicy(),
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

      // Fetch live data directly from Supabase tables without erasing offline/local punch state
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
            { data: meetingParticipantsData },
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
            supabase.from('meeting_participants').select('*'),
            supabase.from('notifications').select('*').order('created_at', { ascending: false }),
            supabase.from('holidays').select('*').order('holiday_date', { ascending: true }),
          ]);

          const currentAttendance = get().attendance || [];
          const remoteAttendance = attendanceData || [];
          const mergedAttendance =
            remoteAttendance.length > 0
              ? [
                  ...remoteAttendance,
                  ...currentAttendance.filter(
                    (ca) =>
                      !remoteAttendance.some(
                        (ra) => ra.id === ca.id || (ra.employee_id === ca.employee_id && ra.date === ca.date)
                      )
                  ),
                ]
              : currentAttendance;

          const activeDesignations = desigData && desigData.length > 0 ? desigData : get().designations;
          const activeDepartments = deptData && deptData.length > 0 ? deptData : get().departments;

          const rawProfiles = profilesData || [];

          const enrichedProfiles = rawProfiles.map((p) => {
            const matchedDesig = activeDesignations.find(
              (d) => d.id === p.designation_id || (p.designation && d.id === p.designation.id)
            );
            return {
              ...p,
              designation_title: matchedDesig?.title || p.designation_title || 'Software Engineer',
            };
          });

          // Merge with current state profiles so freshly added / local profiles are NEVER lost
          const currentProfiles = get().profiles || [];
          const profileMap = new Map<string, Profile>();
          currentProfiles.forEach((p) => {
            if (p.email) profileMap.set(p.email.toLowerCase(), p);
            else if (p.id) profileMap.set(p.id, p);
          });
          enrichedProfiles.forEach((p) => {
            const key = p.email ? p.email.toLowerCase() : p.id;
            const existing = profileMap.get(key);
            profileMap.set(key, { ...(existing || {}), ...p });
          });

          const finalProfiles = Array.from(profileMap.values());

          const activeProfilesList = finalProfiles.length > 0 ? finalProfiles : currentProfiles;
          const enrichedTasks = (tasksData && tasksData.length > 0 ? tasksData : get().tasks).map((t) => {
            const matchedAssignee = activeProfilesList.find(
              (p) => p.id === t.assignee_id || p.user_id === t.assignee_id
            );
            return {
              ...t,
              assignee: matchedAssignee || t.assignee,
            };
          });

            const enrichedMeetings = (meetingsData && meetingsData.length > 0 ? meetingsData : get().meetings).map((m: Meeting) => {
              const parts = (meetingParticipantsData || []).filter((p: any) => p.meeting_id === m.id);
              const creator = activeProfilesList.find((p) => p.id === m.created_by);
              return {
                ...m,
                creator: creator || m.creator,
                participants: parts.length > 0 ? parts : m.participants || [],
              };
            });

            set({
              profiles: activeProfilesList,
              departments: activeDepartments,
              designations: activeDesignations,
              attendance: mergedAttendance,
              leaveTypes: leaveTypesData && leaveTypesData.length > 0 ? leaveTypesData : get().leaveTypes,
              leaveRequests: leaveReqsData && leaveReqsData.length > 0 ? leaveReqsData : get().leaveRequests,
              projects: projectsData && projectsData.length > 0 ? projectsData : get().projects,
              tasks: enrichedTasks,
              standups: standupsData || [],
              standupResponses: standupResponsesData || [],
              meetings: enrichedMeetings,
              notifications: notifsData && notifsData.length > 0 ? notifsData : get().notifications,
              holidays: holidaysData && holidaysData.length > 0 ? holidaysData : get().holidays,
              isLoadingFromSupabase: false,
            });
        } catch (err) {
          console.error('Error fetching Supabase records:', err);
          set({ isLoadingFromSupabase: false });
        }
      },

  // Attendance Policy Management
  updateAttendancePolicy: (updates: Partial<AttendancePolicy>) => {
    const current = get().attendancePolicy;
    const updated = { ...current, ...updates };
    try {
      localStorage.setItem('tcy_attendance_policy', JSON.stringify(updated));
    } catch (e) {}
    set({ attendancePolicy: updated });
  },

  toggleWorkingSaturdayOverride: (dateStr: string) => {
    const current = get().attendancePolicy;
    const currentOverrides = current.working_saturdays_override || [];
    const updatedOverrides = currentOverrides.includes(dateStr)
      ? currentOverrides.filter((d) => d !== dateStr)
      : [...currentOverrides, dateStr];

    const updated: AttendancePolicy = {
      ...current,
      working_saturdays_override: updatedOverrides,
    };

    try {
      localStorage.setItem('tcy_attendance_policy', JSON.stringify(updated));
    } catch (e) {}
    set({ attendancePolicy: updated });
  },

  // Clock In
  clockIn: (employeeId: string, workMode: WorkMode, notes?: string, location?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHours = now.getHours();
    const currentMins = now.getMinutes();
    const currentTimeNum = currentHours * 60 + currentMins;

    const policy = get().attendancePolicy;
    const [startH, startM] = (policy.office_start_time || '09:30').split(':').map(Number);
    const startTimeNum = (startH || 9) * 60 + (startM || 30);

    const [maxInH, maxInM] = (policy.max_punch_in_time || '10:30').split(':').map(Number);
    const maxInTimeNum = (maxInH || 10) * 60 + (maxInM || 30);

    let status: AttendanceStatus = 'present';
    let defaultNote = location ? `Clocked in at ${location}` : 'Clocked in from Desktop';

    if (currentTimeNum > startTimeNum && currentTimeNum <= maxInTimeNum) {
      status = 'late';
      defaultNote = `Late punch-in (Office start: ${policy.office_start_time})${location ? ` • ${location}` : ''}`;
    } else if (currentTimeNum > maxInTimeNum) {
      status = policy.strict_enforcement ? 'absent' : 'half_day';
      defaultNote = `Past max punch threshold (${policy.max_punch_in_time}) — marked ${status}${location ? ` • ${location}` : ''}`;
    }

    const newRecord: Attendance = {
      id: 'att-' + Date.now(),
      employee_id: employeeId,
      date: today,
      clock_in: now.toISOString(),
      clock_out: null,
      total_hours: 0,
      overtime_hours: 0,
      status: status,
      work_mode: workMode,
      punch_in_location: location || 'System Verified Location',
      notes: notes || defaultNote,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    set((state) => ({
      attendance: [newRecord, ...state.attendance.filter((a) => !(a.employee_id === employeeId && a.date === today))],
    }));

    if (supabase && isSupabaseConfigured) {
      (async () => {
        try {
          const profile = get().profiles.find((p) => p.id === employeeId);
          if (profile) {
            await supabase.from('profiles').upsert(
              {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role,
                employment_status: profile.employment_status || 'active',
                joining_date: profile.joining_date || today,
              },
              { onConflict: 'id' }
            );
          }

          await supabase.from('attendance').upsert(
            {
              employee_id: employeeId,
              date: today,
              clock_in: newRecord.clock_in,
              status: status,
              work_mode: workMode,
              punch_in_location: newRecord.punch_in_location,
              notes: newRecord.notes,
            },
            { onConflict: 'employee_id,date' }
          );
        } catch (err) {
          console.warn('Supabase attendance clock-in sync warning:', err);
        }
      })();
    }

    return newRecord;
  },

  // Clock Out
  clockOut: (employeeId: string, location?: string, notes?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const current = get().attendance.find((a) => a.employee_id === employeeId && a.date === today);
    if (!current) return null;

    const now = new Date();
    const clockOutTime = now.toISOString();
    const start = new Date(current.clock_in).getTime();
    const end = now.getTime();
    const hours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;

    const policy = get().attendancePolicy;
    let overtime = 0;
    if (policy.allow_overtime && hours > policy.standard_hours) {
      overtime = Math.round((hours - policy.standard_hours) * 100) / 100;
    }

    const updatedNotes = notes
      ? notes
      : location
      ? `${current.notes || ''} | Out at ${location}`
      : current.notes;

    const updated: Attendance = {
      ...current,
      clock_out: clockOutTime,
      total_hours: hours,
      overtime_hours: overtime,
      punch_out_location: location || 'System Verified Location',
      notes: updatedNotes,
      updated_at: clockOutTime,
    };

    set((state) => ({
      attendance: state.attendance.map((a) => (a.id === current.id ? updated : a)),
    }));

    if (supabase && isSupabaseConfigured) {
      (async () => {
        try {
          await supabase
            .from('attendance')
            .update({
              clock_out: clockOutTime,
              total_hours: hours,
              overtime_hours: overtime,
              punch_out_location: updated.punch_out_location,
              notes: updatedNotes,
            })
            .eq('employee_id', employeeId)
            .eq('date', today);
        } catch (err) {
          console.warn('Supabase attendance clock-out sync warning:', err);
        }
      })();
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
        const matchedAssignee = get().profiles.find(
          (p) => p.id === taskData.assignee_id || p.user_id === taskData.assignee_id
        );
        const newTask: Task = {
          ...taskData,
          assignee: matchedAssignee,
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
      createStandup: (standupData) => {
        const localId = generateUUID();
        const newStandup: Standup = {
          ...standupData,
          id: localId,
          meeting_url: standupData.meeting_url || '',
          cutoff_time: standupData.cutoff_time || '09:30',
          meeting_time: standupData.meeting_time || '09:00',
          created_at: new Date().toISOString(),
        };

        set((state) => ({ standups: [newStandup, ...state.standups] }));

        if (supabase && isSupabaseConfigured) {
          Promise.resolve(
            supabase
              .from('standups')
              .insert({
                title: newStandup.title,
                date: newStandup.date,
                meeting_url: newStandup.meeting_url,
                cutoff_time: newStandup.cutoff_time,
                meeting_time: newStandup.meeting_time,
                department_id: isValidUUID(newStandup.department_id) ? newStandup.department_id : null,
                created_by: isValidUUID(newStandup.created_by) ? newStandup.created_by : null,
              })
              .select()
              .single()
          )
            .then((res: any) => {
              if (res?.data?.id) {
                const dbId = res.data.id;
                set((state) => ({
                  standups: state.standups.map((s) => (s.id === localId ? { ...s, id: dbId } : s)),
                  standupResponses: state.standupResponses.map((r) =>
                    r.standup_id === localId ? { ...r, standup_id: dbId } : r
                  ),
                }));
              }
            })
            .catch((err: any) => console.warn('Supabase standup insert:', err?.message || err));
        }

        return newStandup;
      },

      updateStandup: (id, updates) => {
        set((state) => ({
          standups: state.standups.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));

        if (supabase && isSupabaseConfigured) {
          const client = supabase;
          const current = get().standups.find((s) => s.id === id) || ({} as Partial<Standup>);
          const payload: any = {
            title: updates.title !== undefined ? updates.title : current.title || 'Daily Engineering & Squad Standup',
            date: updates.date !== undefined ? updates.date : current.date || new Date().toISOString().split('T')[0],
            meeting_url: updates.meeting_url !== undefined ? updates.meeting_url : current.meeting_url || '',
            cutoff_time: updates.cutoff_time !== undefined ? updates.cutoff_time : current.cutoff_time || '09:30',
            meeting_time: updates.meeting_time !== undefined ? updates.meeting_time : current.meeting_time || '09:00',
          };
          if (isValidUUID(updates.department_id || current.department_id)) {
            payload.department_id = updates.department_id || current.department_id;
          }
          if (isValidUUID(updates.created_by || current.created_by)) {
            payload.created_by = updates.created_by || current.created_by;
          }

          if (isValidUUID(id)) {
            Promise.resolve(
              client.from('standups').update(payload).eq('id', id).select()
            )
              .then((res: any) => {
                if (!res?.data || res.data.length === 0) {
                  // ID was not in DB, insert fresh row!
                  Promise.resolve(client.from('standups').insert(payload).select().single())
                    .then((insertRes: any) => {
                      if (insertRes?.data?.id) {
                        const newDbId = insertRes.data.id;
                        set((state) => ({
                          standups: state.standups.map((s) => (s.id === id ? { ...s, id: newDbId } : s)),
                          standupResponses: state.standupResponses.map((r) =>
                            r.standup_id === id ? { ...r, standup_id: newDbId } : r
                          ),
                        }));
                      }
                    })
                    .catch((err) => console.warn('Supabase standup fallback insert:', err));
                }
              })
              .catch((err) => console.warn('Supabase standup update:', err));
          } else {
            // Non-UUID id, insert new row
            Promise.resolve(client.from('standups').insert(payload).select().single())
              .then((insertRes: any) => {
                if (insertRes?.data?.id) {
                  const newDbId = insertRes.data.id;
                  set((state) => ({
                    standups: state.standups.map((s) => (s.id === id ? { ...s, id: newDbId } : s)),
                    standupResponses: state.standupResponses.map((r) =>
                      r.standup_id === id ? { ...r, standup_id: newDbId } : r
                    ),
                  }));
                }
              })
              .catch((err) => console.warn('Supabase standup insert:', err));
          }
        }
      },

      submitStandupResponse: (responseData) => {
        const activeStandup = get().standups.find((s) => s.id === responseData.standup_id);
        const cutoff = activeStandup?.cutoff_time || '10:30';
        const now = new Date();
        const [cHours, cMinutes] = cutoff.split(':').map(Number);
        const cutoffDate = new Date();
        cutoffDate.setHours(cHours, cMinutes, 0, 0);

        const isPastCutoff = now.getTime() > cutoffDate.getTime();
        const status: 'submitted' | 'missed' = isPastCutoff ? 'missed' : 'submitted';

        const localResponseId = generateUUID();
        const newResponse: StandupResponse = {
          ...responseData,
          id: localResponseId,
          status,
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

        if (supabase && isSupabaseConfigured && isValidUUID(responseData.standup_id) && isValidUUID(responseData.employee_id)) {
          Promise.resolve(
            supabase
              .from('standup_responses')
              .upsert(
                {
                  standup_id: responseData.standup_id,
                  employee_id: responseData.employee_id,
                  yesterday_work: responseData.yesterday_work,
                  today_plan: responseData.today_plan,
                  blockers: responseData.blockers,
                  status: newResponse.status,
                  action_items: responseData.action_items,
                },
                { onConflict: 'standup_id,employee_id' }
              )
              .select()
              .single()
          )
            .then((res: any) => {
              if (res?.data?.id) {
                set((state) => ({
                  standupResponses: state.standupResponses.map((r) =>
                    r.id === localResponseId ? { ...r, id: res.data.id } : r
                  ),
                }));
              }
            })
            .catch((err: any) => console.warn('Supabase standup response upsert:', err?.message || err));
        }

        return newResponse;
      },

      // Meetings
      createMeeting: (meetingData) => {
        const newMeetingId = 'm-' + Date.now();
        const profilesList = get().profiles || [];
        const creatorProfile = profilesList.find((p) => p.id === meetingData.created_by);
        const creatorName = creatorProfile?.full_name || 'Team Member';

        const initialParticipants = (meetingData.participants || []).map((p, idx) => ({
          ...p,
          id: p.id || `mp-${Date.now()}-${idx}`,
          meeting_id: newMeetingId,
        }));

        const newMeeting: Meeting = {
          ...meetingData,
          id: newMeetingId,
          creator: creatorProfile,
          participants: initialParticipants,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Create notifications for invited members
        const newNotifications: NotificationItem[] = initialParticipants
          .filter((p) => p.employee_id !== meetingData.created_by)
          .map((p) => ({
            id: 'n-meet-' + Date.now() + '-' + p.employee_id,
            employee_id: p.employee_id,
            title: 'Meeting Invitation',
            message: `${creatorName} invited you to "${meetingData.title}"`,
            type: 'meeting',
            is_read: false,
            action_url: '/meetings',
            created_at: new Date().toISOString(),
          }));

        set((state) => ({
          meetings: [newMeeting, ...state.meetings],
          notifications: [...newNotifications, ...state.notifications],
        }));

        if (supabase && isSupabaseConfigured) {
          const client = supabase;
          client
            .from('meetings')
            .insert({
              title: meetingData.title,
              description: meetingData.description || null,
              agenda: meetingData.agenda || null,
              meeting_url: meetingData.meeting_url || null,
              room_location: meetingData.room_location || null,
              start_time: meetingData.start_time,
              end_time: meetingData.end_time,
              status: meetingData.status,
              created_by: meetingData.created_by,
              project_id: meetingData.project_id || null,
            })
            .select()
            .then(
              ({ data: createdRows, error }) => {
                if (!error && createdRows && createdRows[0]) {
                  const dbMeetingId = createdRows[0].id;
                  if (initialParticipants.length > 0) {
                    const participantRows = initialParticipants.map((p) => ({
                      meeting_id: dbMeetingId,
                      employee_id: p.employee_id,
                      status: p.status,
                      decline_reason: p.decline_reason || null,
                    }));
                    client
                      .from('meeting_participants')
                      .insert(participantRows)
                      .then(null, (e: any) => console.warn('Participants insert:', e?.message || e));
                  }
                }
              },
              (err: any) => console.warn('Supabase meeting create:', err?.message || err)
            );

          if (newNotifications.length > 0) {
            client
              .from('notifications')
              .insert(
                newNotifications.map((n) => ({
                  employee_id: n.employee_id,
                  title: n.title,
                  message: n.message,
                  type: n.type,
                  is_read: false,
                  action_url: n.action_url,
                }))
              )
              .then(null, (err: any) => console.warn('Supabase notifications insert:', err?.message || err));
          }
        }

        return newMeeting;
      },

      updateMeeting: (id, updates) => {
        const state = get();
        const existingMeeting = state.meetings.find((m) => m.id === id);
        if (!existingMeeting) return;

        const updatedMeeting: Meeting = {
          ...existingMeeting,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        set((prevState) => ({
          meetings: prevState.meetings.map((m) => (m.id === id ? updatedMeeting : m)),
        }));

        if (supabase && isSupabaseConfigured) {
          const client = supabase;
          client
            .from('meetings')
            .update({
              title: updates.title !== undefined ? updates.title : existingMeeting.title,
              description: updates.description !== undefined ? updates.description : existingMeeting.description,
              agenda: updates.agenda !== undefined ? updates.agenda : existingMeeting.agenda,
              meeting_url: updates.meeting_url !== undefined ? updates.meeting_url : existingMeeting.meeting_url,
              room_location: updates.room_location !== undefined ? updates.room_location : existingMeeting.room_location,
              start_time: updates.start_time !== undefined ? updates.start_time : existingMeeting.start_time,
              end_time: updates.end_time !== undefined ? updates.end_time : existingMeeting.end_time,
              status: updates.status !== undefined ? updates.status : existingMeeting.status,
              project_id: updates.project_id !== undefined ? updates.project_id : existingMeeting.project_id,
            })
            .eq('id', id)
            .then(null, (err: any) => console.warn('Supabase meeting update:', err?.message || err));

          if (updates.participants && updates.participants.length > 0) {
            const participantRows = updates.participants.map((p) => ({
              meeting_id: id,
              employee_id: p.employee_id,
              status: p.status,
              decline_reason: p.decline_reason || null,
            }));
            client
              .from('meeting_participants')
              .upsert(participantRows)
              .then(null, (e: any) => console.warn('Participants update:', e?.message || e));
          }
        }
      },

      deleteMeeting: (id) => {
        set((prevState) => ({
          meetings: prevState.meetings.filter((m) => m.id !== id),
        }));

        if (supabase && isSupabaseConfigured) {
          const client = supabase;
          client
            .from('meetings')
            .delete()
            .eq('id', id)
            .then(null, (err: any) => console.warn('Supabase meeting delete:', err?.message || err));
        }
      },

      updateMeetingStatus: (id, status) => {
        set((state) => ({
          meetings: state.meetings.map((m) => (m.id === id ? { ...m, status, updated_at: new Date().toISOString() } : m)),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('meetings').update({ status }).eq('id', id).then();
        }
      },

      respondToMeeting: (meetingId, employeeId, status, declineReason) => {
        const state = get();
        const meeting = state.meetings.find((m) => m.id === meetingId);
        const responder = state.profiles.find((p) => p.id === employeeId);
        const responderName = responder?.full_name || 'Team Member';

        let newNotifs: NotificationItem[] = [];
        if (meeting && meeting.created_by !== employeeId) {
          const reasonText = declineReason ? ` Reason: "${declineReason}"` : '';
          const notifMsg = status === 'declined'
            ? `${responderName} declined "${meeting.title}".${reasonText}`
            : `${responderName} accepted "${meeting.title}".`;

          newNotifs.push({
            id: 'n-rsvp-' + Date.now(),
            employee_id: meeting.created_by,
            title: status === 'declined' ? 'Meeting Invitation Declined' : 'Meeting Invitation Accepted',
            message: notifMsg,
            type: 'meeting',
            is_read: false,
            action_url: '/meetings',
            created_at: new Date().toISOString(),
          });
        }

        set((prevState) => ({
          notifications: [...newNotifs, ...prevState.notifications],
          meetings: prevState.meetings.map((m) => {
            if (m.id !== meetingId) return m;
            const participants = m.participants || [];
            const existing = participants.find((p) => p.employee_id === employeeId);
            let updatedParticipants;
            if (existing) {
              updatedParticipants = participants.map((p) =>
                p.employee_id === employeeId
                  ? { ...p, status, decline_reason: declineReason || undefined, joined_at: new Date().toISOString() }
                  : p
              );
            } else {
              updatedParticipants = [
                ...participants,
                {
                  id: 'mp-' + Date.now(),
                  meeting_id: meetingId,
                  employee_id: employeeId,
                  status,
                  decline_reason: declineReason || undefined,
                  joined_at: new Date().toISOString(),
                },
              ];
            }
            return { ...m, participants: updatedParticipants };
          }),
        }));

        if (supabase && isSupabaseConfigured) {
          const client = supabase;
          client
            .from('meeting_participants')
            .upsert({
              meeting_id: meetingId,
              employee_id: employeeId,
              status,
              decline_reason: declineReason || null,
            })
            .then(null, (err: any) => console.warn('Supabase meeting participant upsert:', err?.message || err));

          if (newNotifs.length > 0) {
            client
              .from('notifications')
              .insert(
                newNotifs.map((n) => ({
                  employee_id: n.employee_id,
                  title: n.title,
                  message: n.message,
                  type: n.type,
                  is_read: false,
                  action_url: n.action_url,
                }))
              )
              .then(null, (err: any) => console.warn('Supabase notifications insert:', err?.message || err));
          }
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

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));

        if (supabase && isSupabaseConfigured) {
          supabase.from('projects').delete().eq('id', id).then();
        }
      },

      // Departments
      addDepartment: async (name: string, description?: string) => {
        const cleanName = name.trim();
        if (!cleanName) return null;
        const code = cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'DEPT';
        const generatedCode = `${code}-${Math.floor(Math.random() * 900 + 100)}`;
        
        const tempDept: Department = {
          id: 'dept-' + Date.now(),
          name: cleanName,
          code: generatedCode,
          description: description || '',
          manager_id: undefined,
          created_at: new Date().toISOString(),
        };

        // Update local state immediately for instant feedback
        set((state) => ({
          departments: [
            ...state.departments.filter((d) => d.name.toLowerCase() !== cleanName.toLowerCase()),
            tempDept,
          ],
        }));

        if (supabase && isSupabaseConfigured) {
          try {
            // Check if department already exists in Supabase
            const { data: existingDept } = await supabase
              .from('departments')
              .select('*')
              .ilike('name', cleanName)
              .maybeSingle();

            if (existingDept) {
              set((state) => ({
                departments: [
                  ...state.departments.filter((d) => d.id !== tempDept.id && d.id !== existingDept.id),
                  existingDept as Department,
                ],
              }));
              return existingDept as Department;
            }

            // Insert new department record
            const { data: insertedDept, error } = await supabase
              .from('departments')
              .insert({
                name: cleanName,
                code: generatedCode,
                description: description || '',
              })
              .select()
              .single();

            if (insertedDept && !error) {
              set((state) => ({
                departments: [
                  ...state.departments.filter((d) => d.id !== tempDept.id && d.id !== insertedDept.id),
                  insertedDept as Department,
                ],
              }));
              return insertedDept as Department;
            } else if (error) {
              console.warn('Supabase department insert warning:', error.message);
            }
          } catch (err) {
            console.warn('Supabase department operation exception:', err);
          }
        }
        return tempDept;
      },

      updateDepartment: async (id: string, updates: Partial<Department>) => {
        set((state) => ({
          departments: state.departments.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('departments').update(updates).eq('id', id);
          } catch (err) {
            console.warn('Supabase department update warning:', err);
          }
        }
        return true;
      },

      deleteDepartment: async (id: string) => {
        set((state) => ({ departments: state.departments.filter((d) => d.id !== id) }));
        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('departments').delete().eq('id', id);
          } catch (err) {
            console.warn('Supabase department delete warning:', err);
          }
        }
        return true;
      },

      addDesignation: async (title: string, level: string, departmentId?: string) => {
        const cleanTitle = title.trim();
        if (!cleanTitle) return null;

        const tempDesig: Designation = {
          id: 'desig-' + Date.now(),
          title: cleanTitle,
          level: level || 'Mid',
          department_id: departmentId,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          designations: [
            ...state.designations.filter((d) => d.title.toLowerCase() !== cleanTitle.toLowerCase()),
            tempDesig,
          ],
        }));

        if (supabase && isSupabaseConfigured) {
          try {
            const { data: existing } = await supabase
              .from('designations')
              .select('*')
              .ilike('title', cleanTitle)
              .maybeSingle();

            if (existing) {
              set((state) => ({
                designations: [
                  ...state.designations.filter((d) => d.id !== tempDesig.id && d.id !== existing.id),
                  existing as Designation,
                ],
              }));
              return existing as Designation;
            }

            const { data: inserted, error } = await supabase
              .from('designations')
              .insert({
                title: cleanTitle,
                level: level || 'Mid',
                department_id: departmentId || null,
              })
              .select()
              .single();

            if (inserted && !error) {
              set((state) => ({
                designations: [
                  ...state.designations.filter((d) => d.id !== tempDesig.id && d.id !== inserted.id),
                  inserted as Designation,
                ],
              }));
              return inserted as Designation;
            } else if (error) {
              console.warn('Supabase designation insert warning:', error.message);
            }
          } catch (err) {
            console.warn('Supabase designation operation exception:', err);
          }
        }
        return tempDesig;
      },

      updateDesignation: async (id: string, updates: Partial<Designation>) => {
        set((state) => ({
          designations: state.designations.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }));
        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('designations').update(updates).eq('id', id);
          } catch (err) {
            console.warn('Supabase designation update warning:', err);
          }
        }
        return true;
      },

      deleteDesignation: async (id: string) => {
        set((state) => ({ designations: state.designations.filter((d) => d.id !== id) }));
        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('designations').delete().eq('id', id);
          } catch (err) {
            console.warn('Supabase designation delete warning:', err);
          }
        }
        return true;
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
            // 1. Try provisioning via Supabase RPC function (create_employee_account)
            const { data, error } = await supabase.rpc('create_employee_account', {
              p_email: payload.email.trim(),
              p_password: payload.password.trim(),
              p_full_name: payload.fullName.trim(),
              p_role: payload.role,
              p_department_name: payload.departmentName?.trim() || null,
              p_designation_title: payload.designationTitle?.trim() || 'Software Engineer',
              p_phone: payload.phone?.trim() || null,
              p_work_location: payload.workLocation?.trim() || 'Office',
            });

            if (!error) {
              const rpcData = data as any;
              const newProf: Profile = {
                id: rpcData?.user_id || ('prof-' + Date.now()),
                user_id: rpcData?.user_id || ('prof-' + Date.now()),
                email: payload.email.trim().toLowerCase(),
                full_name: payload.fullName.trim(),
                role: payload.role,
                department_id: rpcData?.department_id || undefined,
                designation_id: rpcData?.designation_id || undefined,
                designation_title: payload.designationTitle?.trim() || 'Software Engineer',
                phone: payload.phone?.trim() || '',
                work_location: payload.workLocation?.trim() || 'Office',
                employment_status: 'active',
                joining_date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              set((state) => {
                const existingIdx = state.profiles.findIndex(
                  (p) => p.email.toLowerCase() === newProf.email.toLowerCase() || p.id === newProf.id
                );
                const nextProfiles = [...state.profiles];
                if (existingIdx >= 0) {
                  nextProfiles[existingIdx] = { ...nextProfiles[existingIdx], ...newProf };
                } else {
                  nextProfiles.unshift(newProf);
                }
                return { profiles: nextProfiles };
              });

              await get().fetchSupabaseData();
              return { success: true };
            }

            console.warn('RPC create_employee_account error, attempting direct GoTrue signUp:', error.message);
            
            // 2. Direct GoTrue Auth registration + Profiles upsert fallback
            let deptId: string | undefined = undefined;

            if (payload.departmentName && payload.departmentName.trim()) {
              const dName = payload.departmentName.trim();
              const existingDept = get().departments.find(
                (d) => d.name.toLowerCase() === dName.toLowerCase()
              );
              if (existingDept) {
                deptId = existingDept.id;
              } else {
                const newDept = await get().addDepartment(dName, `${dName} Department`);
                deptId = newDept?.id;
              }
            }

            // Find or create designation in public.designations
            let desigId: string | undefined = undefined;
            if (payload.designationTitle && payload.designationTitle.trim()) {
              const dTitle = payload.designationTitle.trim();
              const existingDesig = get().designations.find(
                (d) => d.title.toLowerCase() === dTitle.toLowerCase()
              );
              if (existingDesig) {
                desigId = existingDesig.id;
              } else {
                try {
                  const { data: newDesig } = await supabase
                    .from('designations')
                    .insert({
                      title: dTitle,
                      department_id: deptId || null,
                      level: 'Mid',
                    })
                    .select()
                    .single();
                  if (newDesig) desigId = newDesig.id;
                } catch (e) {}
              }
            }

            // Provision user in Supabase auth.users so password verification works strictly
            let authUserId: string | null = null;
            try {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: payload.email.trim().toLowerCase(),
                password: payload.password.trim(),
                options: {
                  data: {
                    full_name: payload.fullName.trim(),
                    role: payload.role,
                    designation_title: payload.designationTitle?.trim() || 'Software Engineer',
                    work_location: payload.workLocation?.trim() || 'Office',
                  },
                },
              });

              if (signUpData?.user?.id) {
                authUserId = signUpData.user.id;
              } else if (signUpError && !signUpError.message?.includes('already registered')) {
                console.warn('Supabase auth signUp warning:', signUpError.message);
              }
            } catch (authErr) {
              console.warn('Supabase auth registration warning:', authErr);
            }

            const newProfileId = authUserId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'prof-' + Date.now());
            const today = new Date().toISOString().split('T')[0];

            const { error: profError } = await supabase.from('profiles').upsert(
              {
                id: newProfileId,
                user_id: authUserId || newProfileId,
                email: payload.email.trim().toLowerCase(),
                full_name: payload.fullName.trim(),
                role: payload.role,
                department_id: deptId || null,
                designation_id: desigId || null,
                phone: payload.phone?.trim() || null,
                work_location: payload.workLocation?.trim() || 'Office',
                employment_status: 'active',
                joining_date: today,
              },
              { onConflict: 'email' }
            );

            if (profError) {
              console.error('Profile creation error:', profError);
              return { success: false, error: 'Unable to create employee profile. Please try again.' };
            }

            const fallbackProf: Profile = {
              id: newProfileId,
              user_id: authUserId || newProfileId,
              email: payload.email.trim().toLowerCase(),
              full_name: payload.fullName.trim(),
              role: payload.role,
              department_id: deptId,
              designation_id: desigId,
              designation_title: payload.designationTitle?.trim() || 'Software Engineer',
              phone: payload.phone?.trim() || '',
              work_location: payload.workLocation?.trim() || 'Office',
              employment_status: 'active',
              joining_date: today,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            set((state) => {
              const existingIdx = state.profiles.findIndex(
                (p) => p.email.toLowerCase() === fallbackProf.email.toLowerCase() || p.id === fallbackProf.id
              );
              const nextProfiles = [...state.profiles];
              if (existingIdx >= 0) {
                nextProfiles[existingIdx] = { ...nextProfiles[existingIdx], ...fallbackProf };
              } else {
                nextProfiles.unshift(fallbackProf);
              }
              return { profiles: nextProfiles };
            });

            await get().fetchSupabaseData();
            return { success: true };
          } catch (err: any) {
            console.error('Failed to provision employee account:', err);
            return { success: false, error: 'Unable to onboard employee account. Please try again.' };
          }
        } else {
          // Local fallback
          get().addProfile({
            full_name: payload.fullName,
            email: payload.email,
            role: payload.role,
            designation_title: payload.designationTitle?.trim() || 'Software Engineer',
            department_id: undefined,
            phone: payload.phone || '',
            work_location: payload.workLocation || 'Office',
            joining_date: new Date().toISOString().split('T')[0],
            employment_status: 'active',
          });
          return { success: true };
        }
      },

      updateProfileData: async (id, updates) => {
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)),
        }));

        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('profiles').update(updates).eq('id', id);
          } catch (err) {
            console.warn('Supabase update profile warning:', err);
            return false;
          }
        }
        return true;
      },

      deleteProfile: async (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        }));

        if (supabase && isSupabaseConfigured) {
          try {
            await supabase.from('profiles').delete().eq('id', id);
          } catch (err) {
            console.warn('Supabase delete profile warning:', err);
            return false;
          }
        }
        return true;
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
    }),
    {
      name: 'tcy_data_store',
    }
  )
);
