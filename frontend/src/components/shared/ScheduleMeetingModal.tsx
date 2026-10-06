import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Users,
  Search,
  Check,
  Video,
  Clock,
  Building,
  FolderKanban,
  FileText,
} from 'lucide-react';
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
  title: z.string().min(3, 'Meeting subject is required'),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: '',
      description: '',
      agenda: '',
      meeting_url: '',
      room_location: 'Virtual',
      start_time: defaultStart,
      end_time: defaultEnd,
      project_id: '',
    },
  });

  const startTimeVal = watch('start_time');

  // Load meeting data when opening modal
  React.useEffect(() => {
    if (activeMeetingModalOpen) {
      if (editingMeeting) {
        setValue('title', editingMeeting.title);
        setValue('description', editingMeeting.description || '');
        setValue('agenda', editingMeeting.agenda || '');
        setValue('meeting_url', editingMeeting.meeting_url || '');
        setValue('room_location', editingMeeting.room_location || 'Virtual');
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
          agenda: '',
          meeting_url: '',
          room_location: 'Virtual',
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

  // Duration helper
  const handleSetDuration = (minutes: number) => {
    const base = startTimeVal ? new Date(startTimeVal) : new Date();
    const end = new Date(base.getTime() + minutes * 60 * 1000);
    setValue('end_time', end.toISOString().slice(0, 16), { shouldValidate: true });
  };

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
    if (empId === hostId) return; // Organizer stays selected
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

  const onSubmit = (data: MeetingFormData) => {
    const hostId = editingMeeting ? editingMeeting.created_by : currentUser.id;
    const allIds = Array.from(new Set([hostId, ...selectedEmployeeIds]));

    if (isEditMode && editingMeeting) {
      const existingParticipants = editingMeeting.participants || [];
      const updatedParticipants = allIds.map((empId) => {
        const found = existingParticipants.find((p) => p.employee_id === empId);
        if (found) return found;
        return {
          id: 'mp-' + Date.now() + '-' + empId,
          meeting_id: editingMeeting.id,
          employee_id: empId,
          status: empId === hostId ? ('accepted' as const) : ('invited' as const),
        };
      });

      updateMeeting(editingMeeting.id, {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        agenda: data.agenda?.trim() || undefined,
        meeting_url: data.meeting_url?.trim() || undefined,
        room_location: data.room_location?.trim() || undefined,
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
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        agenda: data.agenda?.trim() || undefined,
        meeting_url: data.meeting_url?.trim() || undefined,
        room_location: data.room_location?.trim() || undefined,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        status: 'scheduled',
        created_by: currentUser.id,
        project_id: data.project_id || undefined,
        participants,
      });

      toast.success(`Meeting scheduled with ${participants.length} teammates`);
      reset();
      setMeetingModalOpen(false);
    }
  };

  return (
    <Dialog open={activeMeetingModalOpen} onOpenChange={setMeetingModalOpen}>
      <DialogContent className="max-w-4xl w-[94vw] bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-xl">
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Video className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                {isEditMode ? 'Edit Internal Meeting' : 'Schedule Internal Meeting'}
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                Organizer: <span className="text-slate-200">{currentUser.full_name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Desktop Grid to Avoid Scrolling */}
        <form onSubmit={handleSubmit(onSubmit)} className="pt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Column: Meeting Details (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Meeting Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Sprint Backlog Planning & Sync"
                  {...register('title')}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Project & Location Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Associated Project
                  </label>
                  <select
                    {...register('project_id')}
                    className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (General Team Sync)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code || 'PRJ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Room / Location
                  </label>
                  <Input
                    placeholder="Virtual / Main Room"
                    {...register('room_location')}
                    className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Time & Duration Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Start Time <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    {...register('start_time')}
                    className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg focus:border-blue-500"
                  />
                  {errors.start_time && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.start_time.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-200">
                      End Time <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      {[15, 30, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSetDuration(m)}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-[#21262d] text-slate-300 hover:text-white hover:bg-blue-600/30"
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    type="datetime-local"
                    {...register('end_time')}
                    className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg focus:border-blue-500"
                  />
                  {errors.end_time && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.end_time.message}</p>
                  )}
                </div>
              </div>

              {/* Meeting Video Link */}
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Meeting Video Link
                </label>
                <Input
                  placeholder="https://meet.google.com/abc-defg-hij"
                  {...register('meeting_url')}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-blue-300 font-mono placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                />
              </div>

              {/* Agenda */}
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Agenda & Notes (Optional)
                </label>
                <Textarea
                  placeholder="Outline discussion points, deliverables, or notes..."
                  rows={2}
                  {...register('agenda')}
                  className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                />
              </div>
            </div>

            {/* Right Column: Teammates Attendee Roster (5 cols) */}
            <div className="md:col-span-5 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  <span>Invite Teammates ({selectedEmployeeIds.length})</span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={selectAllEmployees}
                    className="text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={deselectAllEmployees}
                    className="text-slate-400 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search teammates..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-full pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="h-[285px] overflow-y-auto rounded-lg border border-[#30363d] bg-[#161b22] divide-y divide-[#21262d]">
                {filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No teammates found.
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const hostId = editingMeeting ? editingMeeting.created_by : currentUser.id;
                    const isHost = emp.id === hostId;
                    const isSelected = isHost || selectedEmployeeIds.includes(emp.id);

                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-600/10 text-white'
                            : 'hover:bg-[#21262d] text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'border-slate-600 bg-transparent'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <UserAvatar
                            name={emp.full_name}
                            avatarUrl={emp.avatar_url}
                            size="sm"
                            className="h-5 w-5 text-[9px]"
                          />
                          <div className="truncate">
                            <span className="text-xs font-medium text-slate-200 truncate">
                              {emp.full_name}
                            </span>
                            {isHost && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Host
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                          {emp.designation_title || emp.role?.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMeetingModalOpen(false)}
              className="h-8 text-xs border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 shadow-sm"
            >
              {isEditMode ? 'Save Changes' : `Schedule (${selectedEmployeeIds.length} Invited)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

