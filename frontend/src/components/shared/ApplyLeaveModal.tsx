import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';

const leaveSchema = z.object({
  leave_type_id: z.string().min(1, 'Please select a leave category'),
  start_date: z.string().min(1, 'Please choose start date'),
  end_date: z.string().min(1, 'Please choose end date'),
  total_days: z.coerce.number().min(0.5, 'Minimum 0.5 day').max(30),
  reason: z.string().min(5, 'Please provide a clear reason for the leave'),
});

type LeaveFormData = z.infer<typeof leaveSchema>;

export function ApplyLeaveModal() {
  const { activeLeaveModalOpen, setLeaveModalOpen } = useUIStore();
  const { leaveTypes, applyLeave } = useDataStore();
  const { currentUser } = useAuthStore();

  const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type_id: leaveTypes[0]?.id || '',
      start_date: tomorrowStr,
      end_date: tomorrowStr,
      total_days: 1,
      reason: '',
    },
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');

  React.useEffect(() => {
    if (startDate && endDate) {
      const d1 = new Date(startDate).getTime();
      const d2 = new Date(endDate).getTime();
      if (d2 >= d1) {
        const diffDays = Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1;
        setValue('total_days', diffDays);
      }
    }
  }, [startDate, endDate, setValue]);

  const onSubmit = (data: LeaveFormData) => {
    applyLeave({
      employee_id: currentUser.id,
      leave_type_id: data.leave_type_id,
      start_date: data.start_date,
      end_date: data.end_date,
      total_days: data.total_days,
      reason: data.reason,
    });

    toast.success('Leave application submitted to your manager');
    reset();
    setLeaveModalOpen(false);
  };

  return (
    <Dialog open={activeLeaveModalOpen} onOpenChange={setLeaveModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">Leave Category</label>
            <select
              {...register('leave_type_id')}
              className="mt-1 flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code}) — {t.default_days} days/yr
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">From Date</label>
              <Input type="date" {...register('start_date')} className="mt-1" />
              {errors.start_date && (
                <p className="text-xs text-rose-400 mt-1">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">To Date</label>
              <Input type="date" {...register('end_date')} className="mt-1" />
              {errors.end_date && (
                <p className="text-xs text-rose-400 mt-1">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Total Working Days</label>
            <Input type="number" step="0.5" {...register('total_days')} className="mt-1" />
            {errors.total_days && (
              <p className="text-xs text-rose-400 mt-1">{errors.total_days.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Reason / Notes</label>
            <Textarea
              placeholder="Please describe reason for leave and handoff notes..."
              rows={3}
              {...register('reason')}
              className="mt-1"
            />
            {errors.reason && (
              <p className="text-xs text-rose-400 mt-1">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLeaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="glow-primary">
              Submit Leave Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
