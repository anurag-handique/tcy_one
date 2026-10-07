import * as React from 'react';
import { useDataStore } from '@/stores/dataStore';
import { Profile, Task } from '@/types';
import { UserAvatar } from '@/components/ui/Avatar';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Flame,
  Zap,
  Filter,
  Layers,
} from 'lucide-react';

interface TeamCapacityHeatmapProps {
  projectId?: string;
  className?: string;
}

export function TeamCapacityHeatmap({ projectId, className = '' }: TeamCapacityHeatmapProps) {
  const { profiles, tasks, projects } = useDataStore();
  const [filterMode, setFilterMode] = React.useState<'all' | 'overloaded' | 'balanced' | 'available'>('all');

  // Filter tasks by project if specified
  const relevantTasks = projectId
    ? tasks.filter((t) => t.project_id === projectId)
    : tasks;

  // Compute stats per team member
  const memberWorkloads = profiles
    .filter((p) => p.employment_status !== 'terminated')
    .map((member) => {
      const assignedTasks = relevantTasks.filter((t) => t.assignee_id === member.id);
      const activeTasks = assignedTasks.filter((t) => t.status !== 'done');
      const inProgressTasks = assignedTasks.filter((t) => t.status === 'in_progress');
      const reviewTasks = assignedTasks.filter((t) => t.status === 'review');
      const todoTasks = assignedTasks.filter((t) => t.status === 'todo');
      const urgentTasks = activeTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');

      const estimatedHours = activeTasks.reduce((sum, t) => sum + (t.estimated_hours || 4), 0);
      const weeklyCapacityHours = 40;
      const loadPercentage = Math.round((estimatedHours / weeklyCapacityHours) * 100);

      let capacityStatus: 'available' | 'balanced' | 'overloaded' = 'balanced';
      if (loadPercentage < 50) {
        capacityStatus = 'available';
      } else if (loadPercentage > 100) {
        capacityStatus = 'overloaded';
      }

      return {
        member,
        assignedCount: assignedTasks.length,
        activeCount: activeTasks.length,
        inProgressCount: inProgressTasks.length,
        reviewCount: reviewTasks.length,
        todoCount: todoTasks.length,
        urgentCount: urgentTasks.length,
        estimatedHours,
        weeklyCapacityHours,
        loadPercentage,
        capacityStatus,
      };
    });

  // Summary tallies
  const totalOverloaded = memberWorkloads.filter((m) => m.capacityStatus === 'overloaded').length;
  const totalBalanced = memberWorkloads.filter((m) => m.capacityStatus === 'balanced').length;
  const totalAvailable = memberWorkloads.filter((m) => m.capacityStatus === 'available').length;
  const avgLoad = Math.round(
    memberWorkloads.reduce((s, m) => s + m.loadPercentage, 0) / Math.max(1, memberWorkloads.length)
  );

  const filteredMembers = memberWorkloads.filter((m) => {
    if (filterMode === 'all') return true;
    return m.capacityStatus === filterMode;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Executive Capacity Utilization Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="desktop-panel rounded-xl p-3.5 border border-[#1e2638] bg-[#0d111a] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Average Team Load</span>
            <div className="flex items-baseline gap-1.5 mt-1 font-mono">
              <span className="text-2xl font-extrabold text-white">{avgLoad}%</span>
              <span className="text-xs text-slate-400">capacity</span>
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'overloaded' ? 'all' : 'overloaded')}
          className={`desktop-panel rounded-xl p-3.5 border transition-all cursor-pointer ${
            filterMode === 'overloaded' ? 'border-rose-500/50 bg-rose-950/20 shadow-md shadow-rose-500/10' : 'border-[#1e2638] bg-[#0d111a] hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">Overloaded / At Risk</span>
              <div className="flex items-baseline gap-1.5 mt-1 font-mono">
                <span className="text-2xl font-extrabold text-rose-300">{totalOverloaded}</span>
                <span className="text-xs text-rose-400/80">members</span>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'balanced' ? 'all' : 'balanced')}
          className={`desktop-panel rounded-xl p-3.5 border transition-all cursor-pointer ${
            filterMode === 'balanced' ? 'border-blue-500/50 bg-blue-950/20 shadow-md shadow-blue-500/10' : 'border-[#1e2638] bg-[#0d111a] hover:border-blue-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block">Balanced Pace</span>
              <div className="flex items-baseline gap-1.5 mt-1 font-mono">
                <span className="text-2xl font-extrabold text-blue-300">{totalBalanced}</span>
                <span className="text-xs text-blue-400/80">members</span>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterMode(filterMode === 'available' ? 'all' : 'available')}
          className={`desktop-panel rounded-xl p-3.5 border transition-all cursor-pointer ${
            filterMode === 'available' ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-500/10' : 'border-[#1e2638] bg-[#0d111a] hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Available Bandwidth</span>
              <div className="flex items-baseline gap-1.5 mt-1 font-mono">
                <span className="text-2xl font-extrabold text-emerald-300">{totalAvailable}</span>
                <span className="text-xs text-emerald-400/80">ready</span>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Pills & Heatmap Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            SPRINT CAPACITY & RESOURCE HEATMAP
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#182030] text-slate-300 border border-[#263147]">
            {filteredMembers.length} Members
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-slate-500 text-[10px] mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'bg-[#121622] text-slate-400 border-[#222a3d] hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('overloaded')}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              filterMode === 'overloaded'
                ? 'bg-rose-600 text-white border-rose-500 font-bold'
                : 'bg-[#121622] text-rose-400 border-[#222a3d] hover:bg-rose-500/10'
            }`}
          >
            🔥 Overloaded
          </button>
          <button
            onClick={() => setFilterMode('balanced')}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              filterMode === 'balanced'
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'bg-[#121622] text-blue-400 border-[#222a3d] hover:bg-blue-500/10'
            }`}
          >
            ⚡ Balanced
          </button>
          <button
            onClick={() => setFilterMode('available')}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              filterMode === 'available'
                ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                : 'bg-[#121622] text-emerald-400 border-[#222a3d] hover:bg-emerald-500/10'
            }`}
          >
            🟢 Available
          </button>
        </div>
      </div>

      {/* 3. Heatmap Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredMembers.map((wl) => {
          const { member, loadPercentage, estimatedHours, capacityStatus, activeCount, inProgressCount, reviewCount, todoCount, urgentCount } = wl;

          const statusColor =
            capacityStatus === 'overloaded'
              ? { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', bar: 'bg-rose-500' }
              : capacityStatus === 'balanced'
              ? { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', bar: 'bg-blue-500' }
              : { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500' };

          return (
            <div
              key={member.id}
              className="desktop-panel rounded-xl p-4 border border-[#1f2738] bg-[#0c1018]/90 hover:border-[#2f3b54] transition-all space-y-3"
            >
              {/* Member Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={member.full_name || 'Member'} size="md" className="h-9 w-9 border border-[#2a3449]" />
                  <div>
                    <span className="text-xs font-bold text-white block truncate max-w-[150px]">
                      {member.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[150px]">
                      {member.designation?.title || member.role.replace('_', ' ')} • {member.department?.name || 'General'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                >
                  {capacityStatus === 'overloaded' ? '🔥 Overloaded' : capacityStatus === 'balanced' ? '⚡ Balanced' : '🟢 Available'}
                </span>
              </div>

              {/* Workload Metric Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Assigned Load</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-white">{estimatedHours}h</span>
                    <span className="text-[10px] text-slate-500">/ 40h</span>
                    <span className={`font-bold ml-1 ${statusColor.text}`}>({loadPercentage}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#161a25] rounded-full overflow-hidden border border-[#222a3a]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${statusColor.bar}`}
                    style={{ width: `${Math.min(100, loadPercentage)}%` }}
                  />
                </div>
              </div>

              {/* Task Breakdown Chips */}
              <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[10px] text-center">
                <div className="bg-[#121622] p-1.5 rounded-lg border border-[#1e2638]">
                  <span className="text-slate-500 block text-[9px]">Active</span>
                  <span className="font-bold text-white">{activeCount}</span>
                </div>
                <div className="bg-blue-500/5 p-1.5 rounded-lg border border-blue-500/20 text-blue-300">
                  <span className="text-blue-400/70 block text-[9px]">In Prog</span>
                  <span className="font-bold">{inProgressCount}</span>
                </div>
                <div className="bg-purple-500/5 p-1.5 rounded-lg border border-purple-500/20 text-purple-300">
                  <span className="text-purple-400/70 block text-[9px]">Review</span>
                  <span className="font-bold">{reviewCount}</span>
                </div>
                <div className="bg-slate-800/40 p-1.5 rounded-lg border border-slate-700/60 text-slate-300">
                  <span className="text-slate-500 block text-[9px]">To Do</span>
                  <span className="font-bold">{todoCount}</span>
                </div>
              </div>

              {/* Urgent Alert if present */}
              {urgentCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-300">
                  <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
                  <span>{urgentCount} High/Urgent priority task{urgentCount > 1 ? 's' : ''} assigned</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
