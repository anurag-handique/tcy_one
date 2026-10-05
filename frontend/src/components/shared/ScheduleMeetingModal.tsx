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

const meetingSchema = z.object({
  title: z.string().min(3, 'Meeting title is required'),
  description: z.string().optional(),
  agenda: z.string().optional(),
  meeting_url: z.string().optional(),
  room_location: z.string().optional(),
  start_time: z.string().min(1, 'Please select start time'),
  end_time: z.string().min(1, 'Please select end time'),
  project_id: z.string().optional(),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

export function ScheduleMeetingModal() {
  const { activeMeetingModalOpen, setMeetingModalOpen } = useUIStore();
  const { projects, profiles, createMeeting } = useDataStore();
  const { currentUser } = useAuthStore();

  const defaultStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16);
  const defaultEnd = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      description: '',
      agenda: '1. Agenda point 1\n2. Agenda point 2',
      meeting_url: 'https://meet.google.com/tcy-workhub-sync',
      room_location: 'Virtual / Room 1',
      start_time: defaultStart,
      end_time: defaultEnd,
      project_id: projects[0]?.id || '',
    },
  });

  const onSubmit = (data: MeetingFormData) => {
    createMeeting({
      title: data.title,
      description: data.description,
      agenda: data.agenda,
      meeting_url: data.meeting_url,
      room_location: data.room_location,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      status: 'scheduled',
      created_by: currentUser.id,
      project_id: data.project_id || undefined,
      participants: profiles.map((p) => ({
        id: 'mp-' + Math.random(),
        meeting_id: '',
        employee_id: p.id,
        status: p.id === currentUser.id ? 'accepted' : 'invited',
      })),
    });

    toast.success('Meeting scheduled successfully');
    reset();
    setMeetingModalOpen(false);
  };

  return (
    <Dialog open={activeMeetingModalOpen} onOpenChange={setMeetingModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Internal Meeting</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">Meeting Subject / Title</label>
            <Input
              placeholder="e.g. Sprint Backlog Grooming"
              {...register('title')}
              className="mt-1"
            />
            {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Start Time</label>
              <Input type="datetime-local" {...register('start_time')} className="mt-1" />
              {errors.start_time && (
                <p className="text-xs text-rose-400 mt-1">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">End Time</label>
              <Input type="datetime-local" {...register('end_time')} className="mt-1" />
              {errors.end_time && (
                <p className="text-xs text-rose-400 mt-1">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Location / Room</label>
              <Input placeholder="Conference Room A / Remote" {...register('room_location')} className="mt-1" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Associated Project</label>
              <select
                {...register('project_id')}
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">None (General Team)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Meeting Link URL</label>
            <Input placeholder="https://meet.google.com/..." {...register('meeting_url')} className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Agenda & Notes</label>
            <Textarea
              placeholder="Outline discussion items..."
              rows={3}
              {...register('agenda')}
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMeetingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="glow-primary">
              Schedule Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
