import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Clock, AlertTriangle, Video, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const standupSchema = z.object({
  yesterday_work: z.string().min(5, 'Please mention what you completed yesterday / previous pending works'),
  today_plan: z.string().min(5, 'Please specify what you will work on today'),
  blockers: z.string().optional(),
});

type StandupFormData = z.infer<typeof standupSchema>;

export function SubmitStandupModal() {
  const { activeStandupModalOpen, setStandupModalOpen } = useUIStore();
  const { standups, standupResponses, submitStandupResponse, createStandup } = useDataStore();
  const { currentUser } = useAuthStore();

  const todayStandup = standups[0];
  const existingResponse = standupResponses.find(
    (r) => (r.standup_id === todayStandup?.id || standups.length <= 1) && r.employee_id === currentUser.id
  );

  const cutoff = todayStandup?.cutoff_time || '09:30';
  const meetingTime = todayStandup?.meeting_time || '09:00';

  const parseTimeToDate = (timeStr: string = '09:00') => {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    const d = new Date();
    d.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
    return d;
  };

  const startTimeDate = parseTimeToDate(meetingTime);
  const cutoffDate = parseTimeToDate(cutoff);
  const now = new Date();

  const isBeforeStart = now.getTime() < startTimeDate.getTime();
  const isPastCutoff = now.getTime() > cutoffDate.getTime();
  const isWindowActive = !isBeforeStart && !isPastCutoff;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StandupFormData>({
    resolver: zodResolver(standupSchema),
    defaultValues: {
      yesterday_work: '',
      today_plan: '',
      blockers: 'None',
    },
  });

  React.useEffect(() => {
    if (existingResponse) {
      setValue('yesterday_work', existingResponse.yesterday_work);
      setValue('today_plan', existingResponse.today_plan);
      setValue('blockers', existingResponse.blockers || 'None');
    }
  }, [existingResponse, setValue, activeStandupModalOpen]);

  const onSubmit = (data: StandupFormData) => {
    if (isBeforeStart) {
      toast.error(`Submission window is locked. Submissions open at ${meetingTime}.`);
      return;
    }

    let standupId = todayStandup?.id;
    if (!standupId) {
      const newStandup = createStandup({
        title: 'Daily Engineering & Squad Standup',
        date: new Date().toISOString().split('T')[0],
        meeting_url: '',
        cutoff_time: '09:30',
        meeting_time: '09:00',
      });
      standupId = newStandup.id;
    }

    const resp = submitStandupResponse({
      standup_id: standupId,
      employee_id: currentUser.id,
      yesterday_work: data.yesterday_work.trim(),
      today_plan: data.today_plan.trim(),
      blockers: data.blockers?.trim() || 'None',
      action_items: [],
    });

    if (resp.status === 'missed') {
      toast.warning('Standup submitted past the threshold cutoff time. Recorded as Late / Missed.');
    } else {
      toast.success('Standup response posted to team sync successfully!');
    }

    reset();
    setStandupModalOpen(false);
  };

  return (
    <Dialog open={activeStandupModalOpen} onOpenChange={setStandupModalOpen}>
      <DialogContent className="max-w-lg bg-[#0c0f17] border-[#1f2637] p-5 shadow-2xl">
        <DialogHeader className="border-b border-[#1b2230] pb-2.5 pr-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <DialogTitle className="text-base text-white font-mono font-bold">
                Daily Standup Update
              </DialogTitle>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>Start: <strong className="text-slate-200">{meetingTime}</strong></span>
              <span>•</span>
              <span>Cutoff: <strong className={isPastCutoff ? 'text-rose-400' : 'text-amber-300'}>{cutoff}</strong></span>
            </div>
          </div>
        </DialogHeader>

        {/* Window State Banner */}
        {isPastCutoff ? (
          <div className="flex items-start gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-bold block">Cutoff Threshold Passed ({cutoff})</span>
              <span className="text-[11px] text-rose-200/80">
                Submission window closed at {cutoff}. Submissions now are marked as <strong>MISSED / ABSENT</strong>.
              </span>
            </div>
          </div>
        ) : isBeforeStart ? (
          <div className="flex items-start gap-2 p-2.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono">
            <Clock className="h-4 w-4 shrink-0 mt-0.5 text-sky-400" />
            <div>
              <span className="font-bold block">Submission Window Locked (Opens at {meetingTime})</span>
              <span className="text-[11px] text-sky-200/80">
                The scheduled submission window is from <strong>{meetingTime}</strong> to <strong>{cutoff}</strong>. You cannot submit before {meetingTime}.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <span className="font-bold block">Submission Window is Active ({meetingTime} – {cutoff})</span>
              <span className="text-[11px] text-emerald-200/80">
                Please submit today's focus and pending works before the <strong>{cutoff}</strong> threshold.
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-1 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">
              1. Yesterday's Accomplishments & Pending Works
            </label>
            <Textarea
              placeholder={isBeforeStart ? `Locked until ${meetingTime}...` : "e.g. Completed user profile API endpoints, ongoing database migrations..."}
              rows={3}
              disabled={isBeforeStart}
              {...register('yesterday_work')}
              className="bg-[#0b0e14] border-[#1b202c] text-xs text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.yesterday_work && (
              <p className="text-xs text-rose-400 mt-1 font-mono">{errors.yesterday_work.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">
              2. Today's Planned Tasks & Deliverables
            </label>
            <Textarea
              placeholder={isBeforeStart ? `Locked until ${meetingTime}...` : "e.g. Implement Jira-style drag and drop Kanban, write unit tests..."}
              rows={3}
              disabled={isBeforeStart}
              {...register('today_plan')}
              className="bg-[#0b0e14] border-[#1b202c] text-xs text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.today_plan && (
              <p className="text-xs text-rose-400 mt-1 font-mono">{errors.today_plan.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1">
              3. Any Blockers, Dependencies or Obstacles?
            </label>
            <Textarea
              placeholder={isBeforeStart ? `Locked until ${meetingTime}...` : "Type 'None' if fully unblocked, or describe what is holding you up..."}
              rows={2}
              disabled={isBeforeStart}
              {...register('blockers')}
              className="bg-[#0b0e14] border-[#1b202c] text-xs text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#1b202c] flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStandupModalOpen(false)}
              className="h-8 text-xs border-[#232b3f] bg-[#141824] font-mono text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isBeforeStart}
              className={`h-8 text-xs font-mono gap-1.5 ${
                isBeforeStart
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isBeforeStart ? (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  <span>Opens at {meetingTime}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{existingResponse ? 'Update Standup' : 'Submit Standup'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
