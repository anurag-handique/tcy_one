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
import { toast } from 'sonner';

const standupSchema = z.object({
  yesterday_work: z.string().min(5, 'Please mention what you completed yesterday'),
  today_plan: z.string().min(5, 'Please specify what you will work on today'),
  blockers: z.string().optional(),
});

type StandupFormData = z.infer<typeof standupSchema>;

export function SubmitStandupModal() {
  const { activeStandupModalOpen, setStandupModalOpen } = useUIStore();
  const { standups, submitStandupResponse } = useDataStore();
  const { currentUser } = useAuthStore();

  const todayStandup = standups[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StandupFormData>({
    resolver: zodResolver(standupSchema),
    defaultValues: {
      yesterday_work: '',
      today_plan: '',
      blockers: 'None',
    },
  });

  const onSubmit = (data: StandupFormData) => {
    if (!todayStandup) {
      toast.error('No active standup session found');
      return;
    }

    submitStandupResponse({
      standup_id: todayStandup.id,
      employee_id: currentUser.id,
      yesterday_work: data.yesterday_work,
      today_plan: data.today_plan,
      blockers: data.blockers || 'None',
      action_items: [],
    });

    toast.success('Standup response posted to team sync');
    reset();
    setStandupModalOpen(false);
  };

  return (
    <Dialog open={activeStandupModalOpen} onOpenChange={setStandupModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Daily Standup Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">
              1. What did you accomplish yesterday / recently?
            </label>
            <Textarea
              placeholder="e.g. Completed Supabase auth schema and connected desktop UI..."
              rows={3}
              {...register('yesterday_work')}
              className="mt-1"
            />
            {errors.yesterday_work && (
              <p className="text-xs text-rose-400 mt-1">{errors.yesterday_work.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">
              2. What is your primary focus for today?
            </label>
            <Textarea
              placeholder="e.g. Build Kanban board drag and drop and manager review flow..."
              rows={3}
              {...register('today_plan')}
              className="mt-1"
            />
            {errors.today_plan && (
              <p className="text-xs text-rose-400 mt-1">{errors.today_plan.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">
              3. Any blockers or dependencies?
            </label>
            <Textarea
              placeholder="Leave 'None' if unblocked, or describe what is holding you up..."
              rows={2}
              {...register('blockers')}
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStandupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="glow-primary">
              Post Standup
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
