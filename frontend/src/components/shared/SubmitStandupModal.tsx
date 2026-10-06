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
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquareShare,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

const standupSchema = z.object({
  yesterday_work: z.string().min(5, 'Please specify what you completed yesterday'),
  today_plan: z.string().min(5, 'Please specify your focus for today'),
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
    } else if (activeStandupModalOpen) {
      reset({
        yesterday_work: '',
        today_plan: '',
        blockers: 'None',
      });
    }
  }, [existingResponse, setValue, reset, activeStandupModalOpen]);

  const onSubmit = (data: StandupFormData) => {
    if (isBeforeStart) {
      toast.error(`Submission is locked until ${meetingTime}.`);
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
      toast.warning('Standup submitted past the cutoff time (Recorded as Late).');
    } else {
      toast.success('Standup submitted successfully!');
    }

    reset();
    setStandupModalOpen(false);
  };

  return (
    <Dialog open={activeStandupModalOpen} onOpenChange={setStandupModalOpen}>
      <DialogContent className="max-w-lg bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-xl">
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#21262d] pr-8">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <MessageSquareShare className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                Daily Standup
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                Sync window: <span className="text-slate-200">{meetingTime} – {cutoff}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            {isPastCutoff ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-3 w-3" /> Past Cutoff ({cutoff})
              </span>
            ) : isBeforeStart ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Lock className="h-3 w-3" /> Opens at {meetingTime}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Window Open
              </span>
            )}
          </div>
        </div>

        {/* Minimal Clean Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Field 1: Yesterday */}
          <div>
            <label className="text-xs font-medium text-slate-200 block mb-1">
              What did you accomplish yesterday? <span className="text-rose-400">*</span>
            </label>
            <Textarea
              placeholder={isBeforeStart ? `Locked until ${meetingTime}...` : "Briefly list completed tasks, PRs merged, tickets closed..."}
              rows={3}
              disabled={isBeforeStart}
              {...register('yesterday_work')}
              className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 rounded-lg"
            />
            {errors.yesterday_work && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.yesterday_work.message}</p>
            )}
          </div>

          {/* Field 2: Today */}
          <div>
            <label className="text-xs font-medium text-slate-200 block mb-1">
              What will you work on today? <span className="text-rose-400">*</span>
            </label>
            <Textarea
              placeholder={isBeforeStart ? `Locked until ${meetingTime}...` : "Key goals, features to build, items to review..."}
              rows={3}
              disabled={isBeforeStart}
              {...register('today_plan')}
              className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 rounded-lg"
            />
            {errors.today_plan && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.today_plan.message}</p>
            )}
          </div>

          {/* Field 3: Blockers */}
          <div>
            <label className="text-xs font-medium text-slate-200 block mb-1">
              Any blockers or dependencies?
            </label>
            <Textarea
              placeholder={isBeforeStart ? `Locked until ${meetingTime}...` : "Type 'None' if clear, or describe what is blocking you..."}
              rows={2}
              disabled={isBeforeStart}
              {...register('blockers')}
              className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 rounded-lg"
            />
          </div>

          {/* Footer Controls */}
          <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
            <span className="text-[11px] text-slate-400">
              Posting as <strong className="text-slate-200">{currentUser.full_name}</strong>
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStandupModalOpen(false)}
                className="h-8 text-xs border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || isBeforeStart}
                className={`h-8 text-xs font-medium px-4 ${
                  isBeforeStart
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                }`}
              >
                {isBeforeStart ? (
                  <>
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Opens at {meetingTime}
                  </>
                ) : (
                  existingResponse ? 'Update Standup' : 'Submit Standup'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

