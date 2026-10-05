import * as React from 'react';
import {
  MessageSquareShare,
  Sparkles,
  Plus,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';

export function StandupsPage() {
  const { currentUser } = useAuthStore();
  const { standups, standupResponses, profiles, tasks, createTask } = useDataStore();
  const { setStandupModalOpen } = useUIStore();

  const activeStandup = standups[0];
  const myResponse = standupResponses.find(
    (r) => r.standup_id === activeStandup?.id && r.employee_id === currentUser.id
  );

  const responses = standupResponses.filter((r) => r.standup_id === activeStandup?.id);

  const handleConvertBlocker = (blocker: string, reporterName: string) => {
    createTask({
      title: `[Unblock] ${blocker.slice(0, 45)}...`,
      description: `Reported by ${reporterName}: "${blocker}"`,
      project_id: tasks[0]?.project_id || '',
      assignee_id: currentUser.id,
      reporter_id: currentUser.id,
      priority: 'urgent',
      status: 'todo',
      due_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
      estimated_hours: 2,
      actual_hours: 0,
      tags: ['Blocker', 'StandupAction'],
    });
    toast.success('Converted blocker to task assigned to you');
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight font-mono">
            DAILY STANDUP SYNCHRONIZATION
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Asynchronous squad updates: completed deliverables, current objectives, and blocker escalations.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setStandupModalOpen(true)}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-300" />
          <span>{myResponse ? 'Update My Standup' : 'Submit Standup'}</span>
        </Button>
      </div>

      {/* Standup Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#1b202c] pb-2">
          <span>{responses.length} / {profiles.length} SQUAD RESPONSES RECORDED</span>
          <span>{formatDate(new Date(), 'EEEE, dd MMM yyyy')}</span>
        </div>

        {responses.length === 0 ? (
          <div className="desktop-panel rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-[#141824] border border-[#232a3a] flex items-center justify-center text-slate-500">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">NO STANDUP UPDATES SUBMITTED TODAY</h3>
              <p className="text-xs text-slate-400 mt-0.5">Be the first squad member to post today's async status checkpoint.</p>
            </div>
            <Button size="sm" onClick={() => setStandupModalOpen(true)} className="h-7 text-xs bg-blue-600 gap-1 font-mono">
              <Sparkles className="h-3.5 w-3.5 text-purple-300" />
              <span>Submit Standup Checkpoint</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {responses.map((resp) => {
            const emp = profiles.find((p) => p.id === resp.employee_id);
            const hasBlocker = resp.blockers && resp.blockers !== 'None' && resp.blockers.trim().length > 0;

            return (
              <div
                key={resp.id}
                className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#1b202c] pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={emp?.full_name || 'Team Member'} avatarUrl={emp?.avatar_url} size="sm" />
                      <div>
                        <span className="font-bold text-xs text-white">{emp?.full_name}</span>
                        <span className="block text-[10px] text-slate-400 capitalize font-mono">
                          {emp?.role} • {emp?.work_location}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatTime(resp.submitted_at)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                        Accomplished:
                      </span>
                      <p className="bg-[#0b0e14] p-2 rounded border border-[#1b202c] text-slate-200 text-[11px] leading-relaxed">
                        {resp.yesterday_work}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                        Planned Today:
                      </span>
                      <p className="bg-[#0b0e14] p-2 rounded border border-[#1b202c] text-slate-200 text-[11px] leading-relaxed">
                        {resp.today_plan}
                      </p>
                    </div>

                    {hasBlocker && (
                      <div className="p-2.5 rounded bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                        <div className="flex items-center justify-between text-rose-400 text-[10px] font-mono">
                          <span className="font-bold uppercase">BLOCKER FLAGGED</span>
                        </div>
                        <p className="text-rose-200 text-[11px] leading-relaxed">{resp.blockers}</p>
                        <button
                          onClick={() => handleConvertBlocker(resp.blockers || '', emp?.full_name || '')}
                          className="w-full text-[10px] font-mono bg-[#161a24] hover:bg-[#1e2430] border border-[#262d3e] text-slate-200 py-1 rounded transition-colors"
                        >
                          Convert Blocker to Assigned Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
