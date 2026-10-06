import * as React from 'react';
import {
  MessageSquareShare,
  Sparkles,
  Plus,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Video,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Settings,
  Users,
  AlertCircle,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export function StandupsPage() {
  const { currentUser, activeRole } = useAuthStore();
  const { standups, standupResponses, profiles, tasks, createTask, updateStandup, createStandup } = useDataStore();
  const { setStandupModalOpen } = useUIStore();

  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || activeRole === 'super_admin';

  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
  const [copiedAll, setCopiedAll] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Active Standup Session (or fallback default)
  const activeStandup = standups[0] || {
    id: 'e0000000-0000-0000-0000-000000000001',
    title: 'Daily Engineering & Squad Standup',
    date: new Date().toISOString().split('T')[0],
    meeting_url: '',
    cutoff_time: '09:30',
    meeting_time: '09:00',
    created_at: new Date().toISOString(),
  };

  // Form State for Admin Standup Settings
  const [meetUrl, setMeetUrl] = React.useState(activeStandup.meeting_url || '');
  const [cutoffTime, setCutoffTime] = React.useState(activeStandup.cutoff_time || '09:30');
  const [meetingTime, setMeetingTime] = React.useState(activeStandup.meeting_time || '09:00');
  const [sessionTitle, setSessionTitle] = React.useState(activeStandup.title || 'Daily Engineering & Squad Standup');

  // Keep form fields synced whenever activeStandup is updated or fetched from Supabase
  React.useEffect(() => {
    if (activeStandup) {
      setMeetUrl(activeStandup.meeting_url || '');
      setCutoffTime(activeStandup.cutoff_time || '09:30');
      setMeetingTime(activeStandup.meeting_time || '09:00');
      setSessionTitle(activeStandup.title || 'Daily Engineering & Squad Standup');
    }
  }, [
    activeStandup.id,
    activeStandup.meeting_url,
    activeStandup.cutoff_time,
    activeStandup.meeting_time,
    activeStandup.title,
  ]);

  // Time calculations: Window starts at meeting_time and ends at cutoff_time
  const parseTimeToDate = (timeStr: string = '09:00') => {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  };

  const startTimeDate = parseTimeToDate(activeStandup.meeting_time || '09:00');
  const cutoffTimeDate = parseTimeToDate(activeStandup.cutoff_time || '09:30');
  const now = new Date();

  const isBeforeStart = now.getTime() < startTimeDate.getTime();
  const isPastCutoff = now.getTime() > cutoffTimeDate.getTime();
  const isWindowActive = !isBeforeStart && !isPastCutoff;

  const displayProfiles = React.useMemo(() => {
    if (!profiles || profiles.length === 0) {
      return [currentUser];
    }
    if (!profiles.some((p) => p.id === currentUser.id)) {
      return [currentUser, ...profiles];
    }
    return profiles;
  }, [profiles, currentUser]);

  const myResponse = standupResponses.find(
    (r) => (r.standup_id === activeStandup?.id || standups.length <= 1) && r.employee_id === currentUser.id
  );

  const responses = standupResponses.filter(
    (r) => r.standup_id === activeStandup?.id || standups.length <= 1
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (standups.length > 0 && activeStandup.id) {
      updateStandup(activeStandup.id, {
        title: sessionTitle.trim(),
        meeting_url: meetUrl.trim(),
        cutoff_time: cutoffTime.trim(),
        meeting_time: meetingTime.trim(),
      });
    } else {
      createStandup({
        title: sessionTitle.trim(),
        date: new Date().toISOString().split('T')[0],
        meeting_url: meetUrl.trim(),
        cutoff_time: cutoffTime.trim(),
        meeting_time: meetingTime.trim(),
      });
    }
    toast.success('Standup meeting settings and cutoff threshold updated!');
    setSettingsModalOpen(false);
  };

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

  // Copy Single Employee's Update in "Name - Task" format
  const handleCopySingle = (empName: string, plan: string, pending: string, blockers?: string) => {
    const text = `• ${empName} - [Today: ${plan} | Pending: ${pending || 'None'} | Blockers: ${blockers || 'None'}]`;
    navigator.clipboard.writeText(text);
    setCopiedId(empName);
    toast.success(`Copied update for ${empName}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy All Standup Updates in "Name - Task" Digest Format
  const handleCopyAllUpdates = () => {
    const todayFormatted = formatDate(new Date(), 'EEEE, dd MMM yyyy');
    const headerLines = [
      `DAILY STANDUP UPDATES — ${todayFormatted.toUpperCase()}`,
      `Google Meet Link: ${activeStandup.meeting_url || 'Not configured'}`,
      `Submission Cutoff: ${activeStandup.cutoff_time} | Meeting Time: ${activeStandup.meeting_time}`,
      `--------------------------------------------------`,
      '',
    ];

    const bodyLines = displayProfiles.map((p) => {
      const resp = responses.find((r) => r.employee_id === p.id);
      if (resp) {
        const isMissed = resp.status === 'missed';
        if (isMissed) {
          return `• ${p.full_name} - [LATE SUBMISSION / MISSED CUTOFF] Today: ${resp.today_plan} | Pending: ${resp.yesterday_work} | Blockers: ${resp.blockers || 'None'}`;
        }
        return `• ${p.full_name} - [Today: ${resp.today_plan} | Pending: ${resp.yesterday_work} | Blockers: ${resp.blockers || 'None'}]`;
      }
      if (isPastCutoff) {
        return `• ${p.full_name} - [MISSED STANDUP (Marked Absent in Standup)]`;
      }
      return `• ${p.full_name} - [PENDING SUBMISSION]`;
    });

    const fullDigest = [...headerLines, ...bodyLines].join('\n');
    navigator.clipboard.writeText(fullDigest);
    setCopiedAll(true);
    toast.success('All squad standup updates copied to clipboard!');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              DAILY STANDUP SYNCHRONIZATION
            </h1>
            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              Meet: {activeStandup.meeting_time}
            </span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                isPastCutoff
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              Cutoff: {activeStandup.cutoff_time}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Asynchronous daily task checkpoints, Google Meet synchronization, and cutoff threshold enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Standup Settings Button */}
          {isManagerOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMeetUrl(activeStandup.meeting_url || '');
                setCutoffTime(activeStandup.cutoff_time || '09:30');
                setMeetingTime(activeStandup.meeting_time || '09:00');
                setSessionTitle(activeStandup.title || 'Daily Engineering & Squad Standup');
                setSettingsModalOpen(true);
              }}
              className="h-8 text-xs border-[#232c3f] bg-[#121622] hover:bg-[#1a2130] text-slate-200 font-mono gap-1.5"
            >
              <Settings className="h-3.5 w-3.5 text-blue-400" />
              <span>Standup Setup</span>
            </Button>
          )}

          {/* Direct Google Meet Launch Button */}
          {activeStandup.meeting_url ? (
            <a
              href={activeStandup.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-md transition-all"
            >
              <Video className="h-4 w-4" />
              <span>Join Google Meet</span>
              <ExternalLink className="h-3 w-3 opacity-80" />
            </a>
          ) : isManagerOrAdmin ? (
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 font-mono text-xs transition-all"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Set Meet Link</span>
            </button>
          ) : null}

          {/* Employee Standup Submission Button */}
          <Button
            size="sm"
            onClick={() => setStandupModalOpen(true)}
            className={`h-8 text-xs font-medium font-mono gap-1.5 shadow-sm ${
              isBeforeStart
                ? 'bg-slate-800 text-sky-300 border border-slate-700 hover:bg-slate-750'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isBeforeStart ? <Clock className="h-3.5 w-3.5 text-sky-300" /> : <Sparkles className="h-3.5 w-3.5 text-purple-300" />}
            <span>
              {myResponse
                ? 'Update My Standup'
                : isBeforeStart
                ? `Opens at ${activeStandup.meeting_time}`
                : 'Submit Standup'}
            </span>
          </Button>
        </div>
      </div>

      {/* Standup Meeting Status Card & Cutoff Notice */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Left: Meeting & Cutoff Overview (8 cols) */}
        <div className="md:col-span-8 p-3.5 rounded-lg bg-[#0a0d14] border border-[#1b2230] flex flex-col justify-between space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1b2230] pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wide">
                {activeStandup.title}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">Scheduled:</span>
              <span className="text-white font-bold">{activeStandup.meeting_time}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Cutoff:</span>
              <span className={isPastCutoff ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                {activeStandup.cutoff_time}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-300 font-mono text-[11px] leading-relaxed">
              {isBeforeStart ? (
                <span className="flex items-center gap-1.5 text-sky-300">
                  <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  Submission window is not yet open. Submissions start at <strong>{activeStandup.meeting_time}</strong> and close at <strong>{activeStandup.cutoff_time}</strong>.
                </span>
              ) : isWindowActive ? (
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  Submission window is active ({activeStandup.meeting_time} – {activeStandup.cutoff_time}). Please submit today's focus and pending works before {activeStandup.cutoff_time}.
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  Cutoff threshold has passed ({activeStandup.cutoff_time}). Submission window closed. Unsubmitted employees are marked <strong>MISSED / ABSENT</strong>.
                </span>
              )}
            </div>

            {/* Prominent Copy All Updates Button */}
            <Button
              size="sm"
              onClick={handleCopyAllUpdates}
              className="h-7.5 text-xs bg-[#161c28] hover:bg-[#1e2637] border border-[#263145] text-white font-mono gap-1.5"
            >
              {copiedAll ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-blue-400" />}
              <span>{copiedAll ? 'Copied to Clipboard!' : 'Copy All Updates'}</span>
            </Button>
          </div>
        </div>

        {/* Right: Squad Submission Metrics (4 cols) */}
        <div className="md:col-span-4 p-3.5 rounded-lg bg-[#0a0d14] border border-[#1b2230] flex flex-col justify-between font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase border-b border-[#1b2230] pb-1.5">
            <span>SQUAD COMPLIANCE</span>
            <span>{responses.length}/{profiles.length} SUBMITTED</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center my-1">
            <div className="bg-[#11141c] p-2 rounded border border-[#1b202c]">
              <span className="text-lg font-bold text-emerald-400 block">
                {responses.filter((r) => r.status === 'submitted').length}
              </span>
              <span className="text-[9px] text-slate-400 uppercase">Present</span>
            </div>
            <div className="bg-[#11141c] p-2 rounded border border-[#1b202c]">
              <span className="text-lg font-bold text-amber-400 block">
                {isPastCutoff ? 0 : profiles.length - responses.length}
              </span>
              <span className="text-[9px] text-slate-400 uppercase">Pending</span>
            </div>
            <div className="bg-[#11141c] p-2 rounded border border-[#1b202c]">
              <span className="text-lg font-bold text-rose-400 block">
                {isPastCutoff
                  ? profiles.length - responses.filter((r) => r.status === 'submitted').length
                  : responses.filter((r) => r.status === 'missed').length}
              </span>
              <span className="text-[9px] text-slate-400 uppercase">Absent</span>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 truncate font-mono">
            Google Meet: {activeStandup.meeting_url || 'Not configured (Set via Standup Setup)'}
          </span>
        </div>
      </div>

      {/* Squad Standup Register & Updates List */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#1b202c] pb-2">
          <span className="font-bold text-slate-200">
            SQUAD STANDUP ROSTER ({displayProfiles.length} MEMBERS)
          </span>
          <span>{formatDate(new Date(), 'EEEE, dd MMM yyyy')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayProfiles.map((emp) => {
            const resp = responses.find((r) => r.employee_id === emp.id);
            const isMissed = (isPastCutoff && !resp) || resp?.status === 'missed';
            const isSubmitted = Boolean(resp && resp.status === 'submitted');
            const isPending = !resp && !isPastCutoff;

            const hasBlocker = resp?.blockers && resp.blockers !== 'None' && resp.blockers.trim().length > 0;

            return (
              <div
                key={emp.id}
                className={`desktop-panel rounded-lg p-3.5 flex flex-col justify-between space-y-3 transition-all border ${
                  isSubmitted
                    ? 'border-emerald-500/30 bg-[#0d1413]/80'
                    : isMissed
                    ? 'border-rose-500/30 bg-[#140e10]/80'
                    : 'border-[#1b2230] bg-[#0c0f17]/80'
                }`}
              >
                <div>
                  {/* Top Row: Employee Profile + Attendance Badge + Copy Button */}
                  <div className="flex items-center justify-between border-b border-[#1b2230] pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={emp.full_name} avatarUrl={emp.avatar_url} size="sm" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{emp.full_name}</span>
                          {emp.id === currentUser.id && (
                            <span className="text-[9px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30 px-1 py-0.2 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-slate-400 capitalize font-mono">
                          {emp.designation_title || emp.role.replace('_', ' ')} • {emp.work_location}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Attendance Status Badge */}
                      {isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>SUBMITTED</span>
                        </span>
                      ) : isMissed ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase bg-rose-500/20 text-rose-300 border-rose-500/40">
                          <AlertCircle className="h-3 w-3" />
                          <span>ABSENT / MISSED</span>
                        </span>
                      ) : isBeforeStart ? (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase bg-sky-500/20 text-sky-300 border-sky-500/40">
                          <Clock className="h-3 w-3" />
                          <span>OPENS {activeStandup.meeting_time}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border uppercase bg-amber-500/20 text-amber-300 border-amber-500/40">
                          <Clock className="h-3 w-3" />
                          <span>AWAITING</span>
                        </span>
                      )}

                      {/* Single Copy Button */}
                      {resp && (
                        <button
                          type="button"
                          onClick={() => handleCopySingle(emp.full_name, resp.today_plan, resp.yesterday_work, resp.blockers)}
                          className="p-1 rounded bg-[#161c28] hover:bg-[#202838] border border-[#242e42] text-slate-300 hover:text-white transition-colors"
                          title="Copy update"
                        >
                          {copiedId === emp.full_name ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  {resp ? (
                    <div className="space-y-2 text-xs">
                      {/* Accomplishments / Pending Works */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                          Previous Pending Works & Accomplished:
                        </span>
                        <p className="bg-[#0b0e14] p-2.5 rounded border border-[#1b202c] text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap">
                          {resp.yesterday_work}
                        </p>
                      </div>

                      {/* Planned Today */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                          Today's Planned Tasks & Deliverables:
                        </span>
                        <p className="bg-[#0b0e14] p-2.5 rounded border border-[#1b202c] text-slate-200 text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                          {resp.today_plan}
                        </p>
                      </div>

                      {/* Blockers */}
                      {hasBlocker ? (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                          <div className="flex items-center justify-between text-rose-400 text-[10px] font-mono">
                            <span className="font-bold uppercase flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              BLOCKER FLAGGED
                            </span>
                          </div>
                          <p className="text-rose-200 text-[11px] leading-relaxed">{resp.blockers}</p>
                          <button
                            onClick={() => handleConvertBlocker(resp.blockers || '', emp.full_name)}
                            className="w-full text-[10px] font-mono bg-[#161a24] hover:bg-[#1e2430] border border-[#262d3e] text-slate-200 py-1 rounded transition-colors"
                          >
                            Convert Blocker to Assigned Task
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-slate-500">
                          Blockers: None
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs font-mono text-slate-500 flex flex-col items-center justify-center gap-1">
                      {isPastCutoff ? (
                        <>
                          <span className="text-rose-400 font-bold">MISSED STANDUP SUBMISSION</span>
                          <span className="text-[10px] text-slate-500">
                            Cutoff threshold ({activeStandup.cutoff_time}) passed without submission.
                          </span>
                        </>
                      ) : isBeforeStart ? (
                        <>
                          <span className="text-sky-400">UPCOMING STANDUP</span>
                          <span className="text-[10px] text-slate-500">
                            Submission window opens at {activeStandup.meeting_time}.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400">AWAITING SUBMISSION</span>
                          <span className="text-[10px] text-slate-500">
                            Window active. Submit before threshold {activeStandup.cutoff_time}.
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer timestamp */}
                {resp && (
                  <div className="pt-2 border-t border-[#1b2230] flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Submitted at {formatTime(resp.submitted_at)}</span>
                    {resp.status === 'missed' && (
                      <span className="text-rose-400 font-semibold">Late / Past Cutoff</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Standup Settings Modal */}
      {isManagerOrAdmin && (
        <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
          <DialogContent className="max-w-md bg-[#0c0f17] border-[#1f2637] p-5 shadow-2xl">
            <DialogHeader className="border-b border-[#1b2230] pb-2.5 pr-10">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-400" />
                <DialogTitle className="text-base text-white font-mono font-bold">
                  Standup Meet & Cutoff Setup
                </DialogTitle>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveSettings} className="space-y-3 pt-2 text-xs">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Standup Meeting Title
                </label>
                <Input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Daily Engineering & Squad Standup"
                  className="h-7.5 bg-[#0b0e14] border-[#1b202c]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Google Meet Link (Meeting URL)
                </label>
                <Input
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abc-def"
                  className="h-7.5 bg-[#0b0e14] border-[#1b202c] font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Daily Cutoff Threshold Time
                  </label>
                  <Input
                    type="time"
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    className="h-7.5 bg-[#0b0e14] border-[#1b202c] font-mono"
                    required
                  />
                  <span className="text-[9.5px] text-slate-500 font-mono block mt-1">
                    Submissions after this time are marked as Absent.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Meeting Scheduled Time
                  </label>
                  <Input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="h-7.5 bg-[#0b0e14] border-[#1b202c] font-mono"
                    required
                  />
                  <span className="text-[9.5px] text-slate-500 font-mono block mt-1">
                    Live call start time on Google Meet.
                  </span>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-[#1b202c] flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsModalOpen(false)}
                  className="h-8 text-xs border-[#232b3f] bg-[#141824] font-mono text-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-500 font-mono text-white"
                >
                  Save Standup Setup
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
