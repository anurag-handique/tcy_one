import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Search, Check, CheckSquare, Square, Video, Sparkles, UserCheck } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { UserAvatar } from '@/components/ui/Avatar';
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
  const { activeMeetingModalOpen, editingMeetingId, setMeetingModalOpen } = useUIStore();
  const { projects, profiles, meetings, createMeeting, updateMeeting } = useDataStore();
  const { currentUser } = useAuthStore();

  const isEditMode = !!editingMeetingId;
  const editingMeeting = React.useMemo(() => {
    if (!editingMeetingId) return null;
    return meetings.find((m) => m.id === editingMeetingId) || null;
  }, [editingMeetingId, meetings]);

  const defaultStart = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16);
  const defaultEnd = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16);

  // Attendee multi-select state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = React.useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      description: '',
      agenda: '1. Sync objectives\n2. Key deliverables\n3. Action items & Q&A',
      meeting_url: '',
      room_location: 'Virtual / Room 1',
      start_time: defaultStart,
      end_time: defaultEnd,
      project_id: '',
    },
  });

  // Load meeting data when opening modal
  React.useEffect(() => {
    if (activeMeetingModalOpen) {
      if (editingMeeting) {
        setValue('title', editingMeeting.title);
        setValue('description', editingMeeting.description || '');
        setValue('agenda', editingMeeting.agenda || '');
        setValue('meeting_url', editingMeeting.meeting_url || '');
        setValue('room_location', editingMeeting.room_location || 'Virtual / Room 1');
        setValue(
          'start_time',
          editingMeeting.start_time
            ? new Date(editingMeeting.start_time).toISOString().slice(0, 16)
            : defaultStart
        );
        setValue(
          'end_time',
          editingMeeting.end_time
            ? new Date(editingMeeting.end_time).toISOString().slice(0, 16)
            : defaultEnd
        );
        setValue('project_id', editingMeeting.project_id || '');

        const existingParticipantIds = (editingMeeting.participants || []).map((p) => p.employee_id);
        setSelectedEmployeeIds(
          existingParticipantIds.length > 0
            ? existingParticipantIds
            : profiles.map((p) => p.id)
        );
      } else {
        reset({
          title: '',
          description: '',
          agenda: '1. Sync objectives\n2. Key deliverables\n3. Action items & Q&A',
          meeting_url: '',
          room_location: 'Virtual / Room 1',
          start_time: defaultStart,
          end_time: defaultEnd,
          project_id: '',
        });
        if (profiles && profiles.length > 0) {
          setSelectedEmployeeIds(profiles.map((p) => p.id));
        }
      }
    }
  }, [activeMeetingModalOpen, editingMeeting, profiles, reset, setValue, defaultStart, defaultEnd]);

  const filteredEmployees = React.useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.designation_title?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q)
    );
  }, [profiles, employeeSearch]);

  const toggleEmployee = (empId: string) => {
    const hostId = editingMeeting ? editingMeeting.created_by : currentUser.id;
    if (empId === hostId) return; // Organizer always stays included
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployeeIds(profiles.map((p) => p.id));
  };

  const deselectAllEmployees = () => {
    const hostId = editingMeeting ? editingMeeting.created_by : currentUser.id;
    setSelectedEmployeeIds([hostId]);
  };

  const handleGenerateLink = () => {
    const randomCode =
      Math.random().toString(36).substring(2, 5) +
      '-' +
      Math.random().toString(36).substring(2, 6) +
      '-' +
      Math.random().toString(36).substring(2, 5);
    const generatedUrl = `https://meet.google.com/${randomCode}`;
    setValue('meeting_url', generatedUrl, { shouldValidate: true });
    toast.success('Generated Google Meet link');
  };

  const onSubmit = (data: MeetingFormData) => {
    const hostId = editingMeeting ? editingMeeting.created_by : currentUser.id;
    const allIds = Array.from(new Set([hostId, ...selectedEmployeeIds]));

    if (isEditMode && editingMeeting) {
      // Preserve existing participant statuses if already responded
      const existingParticipants = editingMeeting.participants || [];
      const updatedParticipants = allIds.map((empId) => {
        const found = existingParticipants.find((p) => p.employee_id === empId);
        if (found) {
          return found;
        }
        return {
          id: 'mp-' + Date.now() + '-' + empId,
          meeting_id: editingMeeting.id,
          employee_id: empId,
          status: empId === hostId ? ('accepted' as const) : ('invited' as const),
        };
      });

      updateMeeting(editingMeeting.id, {
        title: data.title,
        description: data.description || undefined,
        agenda: data.agenda || undefined,
        meeting_url: data.meeting_url || undefined,
        room_location: data.room_location || undefined,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        project_id: data.project_id || undefined,
        participants: updatedParticipants,
      });

      toast.success('Meeting updated successfully');
      reset();
      setMeetingModalOpen(false);
    } else {
      const participants = allIds.map((empId) => ({
        id: 'mp-' + Date.now() + '-' + empId,
        meeting_id: '',
        employee_id: empId,
        status: empId === currentUser.id ? ('accepted' as const) : ('invited' as const),
      }));

      createMeeting({
        title: data.title,
        description: data.description || undefined,
        agenda: data.agenda || undefined,
        meeting_url: data.meeting_url || undefined,
        room_location: data.room_location || undefined,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        status: 'scheduled',
        created_by: currentUser.id,
        project_id: data.project_id || undefined,
        participants,
      });

      toast.success(`Meeting scheduled with ${participants.length} team members invited`);
      reset();
      setMeetingModalOpen(false);
    }
  };

  return (
    <Dialog open={activeMeetingModalOpen} onOpenChange={setMeetingModalOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white font-mono uppercase">
                {isEditMode ? 'EDIT INTERNAL MEETING' : 'SCHEDULE INTERNAL MEETING'}
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                {isEditMode
                  ? 'Update meeting details, time slot, agenda, and invited attendees.'
                  : 'Set meeting schedule, project alignment, and invite squad members.'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-2">
          {/* Title */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
              Meeting Subject / Title <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Sprint Backlog Grooming & Architecture Review"
              {...register('title')}
              className="mt-1"
            />
            {errors.title && <p className="text-[10px] text-rose-400 mt-0.5">{errors.title.message}</p>}
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                Start Time <span className="text-rose-400">*</span>
              </label>
              <Input type="datetime-local" {...register('start_time')} className="mt-1" />
              {errors.start_time && (
                <p className="text-[10px] text-rose-400 mt-0.5">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                End Time <span className="text-rose-400">*</span>
              </label>
              <Input type="datetime-local" {...register('end_time')} className="mt-1" />
              {errors.end_time && (
                <p className="text-[10px] text-rose-400 mt-0.5">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          {/* Location & Associated Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                Location / Room
              </label>
              <Input placeholder="Conference Room A / Remote" {...register('room_location')} className="mt-1" />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                Associated Project
              </label>
              <select
                {...register('project_id')}
                className="mt-1 flex h-7.5 w-full rounded-none border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono shadow-sm transition-all focus:outline-none focus:border-blue-500"
              >
                <option value="">None (General Team Sync)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code || 'PRJ'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Meeting URL */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                Meeting Link URL
              </label>
              <button
                type="button"
                onClick={handleGenerateLink}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300 hover:underline"
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>Generate Meet Link</span>
              </button>
            </div>
            <Input placeholder="https://meet.google.com/... or Zoom link" {...register('meeting_url')} className="mt-1" />
          </div>

          {/* Agenda & Notes */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
              Agenda & Discussion Points
            </label>
            <Textarea
              placeholder="Outline meeting points..."
              rows={2}
              {...register('agenda')}
              className="mt-1 rounded-none border-[#1f2637] bg-[#0c1018] text-xs font-mono"
            />
          </div>

          {/* Employee Invite Section */}
          <div className="pt-2 border-t border-[#1b202c]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] font-mono uppercase font-bold text-slate-200 tracking-wider">
                  Invite Squad Members
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {selectedEmployeeIds.length} Selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllEmployees}
                  className="text-[10px] font-mono text-slate-400 hover:text-white"
                >
                  Select All
                </button>
                <span className="text-slate-600 text-xs">|</span>
                <button
                  type="button"
                  onClick={deselectAllEmployees}
                  className="text-[10px] font-mono text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Employee search filter */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search teammates by name or designation..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full h-7 bg-[#090b10] border border-[#1b202c] rounded pl-7 pr-2.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Scrollable employee list */}
            <div className="max-h-40 overflow-y-auto rounded border border-[#1b202c] bg-[#090b10] divide-y divide-[#151924] p-1 space-y-0.5">
              {filteredEmployees.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500 font-mono">
                  No teammates match your search.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isCreator = emp.id === currentUser.id;
                  const isSelected = isCreator || selectedEmployeeIds.includes(emp.id);

                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployee(emp.id)}
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-600/10 border border-blue-500/30 text-white'
                          : 'hover:bg-[#121622] text-slate-400 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-slate-700 bg-[#0c1018]'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <UserAvatar name={emp.full_name} avatarUrl={emp.avatar_url} size="sm" className="h-5 w-5 text-[9px]" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-200 truncate">
                              {emp.full_name}
                            </span>
                            {isCreator && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Host (You)
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {emp.designation_title || emp.role.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-[10px] font-mono text-slate-400">
                          {emp.email}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-[#1b202c]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMeetingModalOpen(false)}
              className="h-7 text-xs border-[#222837] bg-[#12151e]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {isEditMode ? 'Update Meeting' : `Schedule & Invite (${selectedEmployeeIds.length})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

