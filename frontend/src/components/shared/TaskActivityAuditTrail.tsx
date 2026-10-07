import * as React from 'react';
import { Task, TaskActivity, TaskComment, Profile } from '@/types';
import { useDataStore } from '@/stores/dataStore';
import { formatDate } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/Avatar';
import {
  History,
  CheckCircle2,
  PlayCircle,
  Circle,
  Eye,
  UserCheck,
  Tag,
  MessageSquare,
  Sparkles,
  Zap,
  ArrowRight,
  ListChecks,
} from 'lucide-react';

interface TaskActivityAuditTrailProps {
  task: Task;
  className?: string;
}

export function TaskActivityAuditTrail({ task, className = '' }: TaskActivityAuditTrailProps) {
  const { profiles } = useDataStore();
  const [filter, setFilter] = React.useState<'all' | 'audits' | 'comments'>('all');

  const profileMap = new Map<string, Profile>(profiles.map((p) => [p.id, p]));

  // Build unified chronological timeline of activity_logs and comments
  const auditLogs: {
    id: string;
    type: 'activity' | 'comment';
    action: string;
    actorName: string;
    actorId?: string;
    details: string;
    createdAt: string;
  }[] = [];

  // Add activities
  if (task.activity_log && task.activity_log.length > 0) {
    task.activity_log.forEach((act) => {
      const actor = act.employee_id ? profileMap.get(act.employee_id) : null;
      auditLogs.push({
        id: act.id,
        type: 'activity',
        action: act.action || 'activity',
        actorName: act.actor_name || act.user_name || actor?.full_name || 'System',
        actorId: act.employee_id || act.user_id,
        details: act.details || act.action || 'Task updated',
        createdAt: act.created_at,
      });
    });
  } else {
    // If no prior activity_log saved, create initial task creation audit point
    const creator = task.reporter_id ? profileMap.get(task.reporter_id) : null;
    auditLogs.push({
      id: 'init-' + task.id,
      type: 'activity',
      action: 'created',
      actorName: creator?.full_name || 'Creator',
      actorId: task.reporter_id,
      details: `Created task "${task.title}" with priority ${task.priority.toUpperCase()}`,
      createdAt: task.created_at,
    });
  }

  // Add comments to unified timeline
  if (task.comments && task.comments.length > 0) {
    task.comments.forEach((cm) => {
      const commenter = profileMap.get(cm.employee_id);
      auditLogs.push({
        id: cm.id,
        type: 'comment',
        action: 'comment_added',
        actorName: commenter?.full_name || 'Team Member',
        actorId: cm.employee_id,
        details: cm.comment,
        createdAt: cm.created_at,
      });
    });
  }

  // Sort descending (most recent first)
  const sortedLogs = auditLogs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredLogs = sortedLogs.filter((l) => {
    if (filter === 'all') return true;
    if (filter === 'audits') return l.type === 'activity';
    if (filter === 'comments') return l.type === 'comment';
    return true;
  });

  const getActionIcon = (action: string, type: string) => {
    if (type === 'comment') {
      return <MessageSquare className="h-3.5 w-3.5 text-blue-400" />;
    }
    switch (action) {
      case 'created':
        return <Sparkles className="h-3.5 w-3.5 text-emerald-400" />;
      case 'status_changed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />;
      case 'reassigned':
        return <UserCheck className="h-3.5 w-3.5 text-indigo-400" />;
      case 'priority_changed':
        return <Zap className="h-3.5 w-3.5 text-rose-400" />;
      case 'subtask_updated':
        return <ListChecks className="h-3.5 w-3.5 text-cyan-400" />;
      default:
        return <History className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getActionBadge = (action: string, type: string) => {
    if (type === 'comment') {
      return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">Comment</span>;
    }
    switch (action) {
      case 'created':
        return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">Created</span>;
      case 'status_changed':
        return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">Status Change</span>;
      case 'reassigned':
        return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">Reassigned</span>;
      case 'priority_changed':
        return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold">Priority</span>;
      case 'subtask_updated':
        return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">Subtasks</span>;
      default:
        return <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">Activity</span>;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#1b2230] pb-2">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <History className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-bold text-slate-300 uppercase tracking-wide">Audit Trail & History</span>
          <span className="text-[10px] text-slate-500">({sortedLogs.length})</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded transition-all ${
              filter === 'all' ? 'bg-[#1b2230] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({sortedLogs.length})
          </button>
          <span className="text-slate-700">•</span>
          <button
            onClick={() => setFilter('audits')}
            className={`px-2 py-0.5 rounded transition-all ${
              filter === 'audits' ? 'bg-[#1b2230] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Logs
          </button>
          <span className="text-slate-700">•</span>
          <button
            onClick={() => setFilter('comments')}
            className={`px-2 py-0.5 rounded transition-all ${
              filter === 'comments' ? 'bg-[#1b2230] text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Comments ({task.comments?.length || 0})
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-3 text-center">No audit entries found.</p>
        ) : (
          filteredLogs.map((item) => (
            <div
              key={item.id}
              className="bg-[#0e121c] p-3 rounded-xl border border-[#1b2230] hover:border-[#273248] transition-colors text-xs space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#141a27] border border-[#232c3f] shrink-0 text-slate-300">
                    {getActionIcon(item.action, item.type)}
                  </div>
                  <UserAvatar name={item.actorName} size="sm" className="h-5 w-5 text-[8px]" />
                  <span className="font-semibold text-slate-200">{item.actorName}</span>
                  {getActionBadge(item.action, item.type)}
                </div>
                <span className="text-slate-500">{formatDate(item.createdAt, 'dd MMM, hh:mm a')}</span>
              </div>
              <p className="text-slate-300 pl-7 leading-relaxed font-sans text-xs">
                {item.details}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
