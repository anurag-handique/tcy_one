import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sun,
  CheckSquare,
  Clock,
  CalendarDays,
  FolderKanban,
  MessageSquareShare,
  Video,
  Users2,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { currentUser, activeRole } = useAuthStore();
  const { leaveRequests, tasks } = useDataStore();

  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || activeRole === 'super_admin';

  const pendingLeaveCount = isManagerOrAdmin
    ? leaveRequests.filter((l) => l.status === 'pending').length
    : 0;

  const myPendingTasksCount = tasks.filter(
    (t) => t.assignee_id === currentUser.id && t.status !== 'done'
  ).length;

  const navGroups = [
    {
      group: 'CORE',
      items: [
        { to: '/', label: 'My Day', icon: Sun, badge: null },
        { to: '/tasks', label: 'Tasks & Kanban', icon: CheckSquare, badge: myPendingTasksCount > 0 ? myPendingTasksCount : null },
        { to: '/attendance', label: 'Attendance', icon: Clock, badge: null },
      ],
    },
    {
      group: 'COLLABORATION',
      items: [
        { to: '/standup', label: 'Daily Standup', icon: MessageSquareShare, badge: null },
        { to: '/meetings', label: 'Meetings', icon: Video, badge: null },
        { to: '/projects', label: 'Projects', icon: FolderKanban, badge: null },
        { to: '/leave', label: 'Leave & Holidays', icon: CalendarDays, badge: pendingLeaveCount > 0 ? `${pendingLeaveCount}` : null },
      ],
    },
    {
      group: 'ORGANIZATION',
      items: [
        { to: '/team', label: 'Team Directory', icon: Users2, badge: null },
        { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, badge: null },
        { to: '/settings', label: 'System Settings', icon: Settings, badge: null },
      ],
    },
  ];

  return (
    <aside className="relative flex w-14 flex-col border-r border-[#1a1f2b] bg-[#0c0e15] select-none z-30 shrink-0">
      {/* Brand Icon Header */}
      <div className="flex h-12 items-center justify-center border-b border-[#1a1f2b]">
        <img
          src="/favicon (1).ico"
          alt="TCY Logo"
          className="h-6 w-6 object-contain"
        />
      </div>

      {/* Navigation Icons */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {grp.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-9 w-9 mx-auto items-center justify-center rounded transition-all duration-150',
                      isActive
                        ? 'bg-[#1c2230] text-blue-400 border border-[#2b3548] shadow-sm'
                        : 'text-slate-400 hover:bg-[#141822] hover:text-slate-200'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0 transition-colors" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-mono font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
