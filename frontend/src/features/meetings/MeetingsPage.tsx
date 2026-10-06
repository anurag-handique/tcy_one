import * as React from 'react';
import {
  Video,
  Plus,
  Clock,
  Building,
  ExternalLink,
  CheckCircle,
  XCircle,
  Users,
  Search,
  MessageSquare,
  Crown,
  Check,
  X,
  Pencil,
  Trash2,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';
import { Meeting } from '@/types';

export function MeetingsPage() {
  const { currentUser, activeRole } = useAuthStore();
  const { meetings, projects, profiles, respondToMeeting, deleteMeeting } = useDataStore();
  const { setMeetingModalOpen } = useUIStore();

  const isElevatedUser =
    activeRole === 'super_admin' || activeRole === 'admin' || activeRole === 'manager';

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | 'invites' | 'hosted' | 'upcoming'>('all');

  // Decline Dialog State
  const [declineModalOpen, setDeclineModalOpen] = React.useState(false);
  const [targetMeeting, setTargetMeeting] = React.useState<Meeting | null>(null);
  const [declineReason, setDeclineReason] = React.useState('');

  // Delete Confirmation Dialog State
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [meetingToDelete, setMeetingToDelete] = React.useState<Meeting | null>(null);

  // Attendee Roster Modal State
  const [rosterModalOpen, setRosterModalOpen] = React.useState(false);
  const [rosterMeeting, setRosterMeeting] = React.useState<Meeting | null>(null);

  const presetReasons = [
    'Schedule Conflict',
    'Client Call / Sync',
    'On Planned Leave',
    'Focus Time / Critical Deadline',
    'Not Relevant to My Squad Role',
  ];

  // Open Decline Dialog
  const handleOpenDeclineModal = (meeting: Meeting) => {
    setTargetMeeting(meeting);
    const existingP = meeting.participants?.find((p) => p.employee_id === currentUser.id);
    setDeclineReason(existingP?.decline_reason || '');
    setDeclineModalOpen(true);
  };

  // Submit Decline
  const handleConfirmDecline = () => {
    if (!targetMeeting) return;
    respondToMeeting(targetMeeting.id, currentUser.id, 'declined', declineReason.trim() || undefined);
    toast.success('Declined invitation and notified organizer');
    setDeclineModalOpen(false);
    setTargetMeeting(null);
    setDeclineReason('');
  };

  // Accept Meeting
  const handleAcceptMeeting = (meeting: Meeting) => {
    respondToMeeting(meeting.id, currentUser.id, 'accepted');
    toast.success('Accepted meeting invitation');
  };

  // Open Delete Confirmation
  const handleOpenDeleteModal = (meeting: Meeting) => {
    setMeetingToDelete(meeting);
    setDeleteModalOpen(true);
  };

  // Confirm Delete Meeting
  const handleConfirmDelete = () => {
    if (!meetingToDelete) return;
    deleteMeeting(meetingToDelete.id);
    toast.success(`Meeting "${meetingToDelete.title}" deleted`);
    setDeleteModalOpen(false);
    setMeetingToDelete(null);
  };

  // Open Edit Modal
  const handleEditMeeting = (meeting: Meeting) => {
    setMeetingModalOpen(true, meeting.id);
  };

  // Filtered Meetings
  const filteredMeetings = React.useMemo(() => {
    let list = meetings;

    // Tab filtering
    if (activeTab === 'invites') {
      list = list.filter((m) => {
        const myP = m.participants?.find((p) => p.employee_id === currentUser.id);
        return myP && myP.status === 'invited';
      });
    } else if (activeTab === 'hosted') {
      list = list.filter((m) => m.created_by === currentUser.id);
    } else if (activeTab === 'upcoming') {
      const now = new Date().toISOString();
      list = list.filter((m) => m.end_time >= now);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const host = profiles.find((p) => p.id === m.created_by);
        const proj = projects.find((p) => p.id === m.project_id);
        return (
          m.title?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.room_location?.toLowerCase().includes(q) ||
          host?.full_name?.toLowerCase().includes(q) ||
          proj?.name?.toLowerCase().includes(q) ||
          proj?.code?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [meetings, activeTab, searchQuery, currentUser.id, profiles, projects]);

  const awaitingCount = React.useMemo(() => {
    return meetings.filter((m) => {
      const myP = m.participants?.find((p) => p.employee_id === currentUser.id);
      return myP && myP.status === 'invited';
    }).length;
  }, [meetings, currentUser.id]);

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              MEETINGS & SYNCS
            </h1>
            {awaitingCount > 0 && (
              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                {awaitingCount} RSVP Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Squad syncs, client calls, sprint reviews, and live RSVP attendee tracking.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setMeetingModalOpen(true, null)}
          className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 rounded-full gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-[#0a0d14] border border-[#1b202c] p-1 rounded-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'invites'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Invited</span>
            {awaitingCount > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                {awaitingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('hosted')}
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all whitespace-nowrap ${
              activeTab === 'hosted'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hosted by Me
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upcoming
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search meetings, host, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-[#0a0d14] border border-[#1b202c] rounded-full pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Meeting Cards Grid */}
      {filteredMeetings.length === 0 ? (
        <div className="desktop-panel rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3 bg-[#0a0d14] border border-[#1b202c]">
          <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono">NO MEETINGS FOUND</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchQuery || activeTab !== 'all'
                ? 'Try adjusting your search query or tab filter.'
                : 'Schedule a sprint review, squad sync, or client check-in.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setMeetingModalOpen(true, null)}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 gap-1.5 font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Schedule Meeting</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMeetings.map((m) => {
            const host = profiles.find((p) => p.id === m.created_by) || m.creator;
            const proj = projects.find((p) => p.id === m.project_id);
            const isCreator = m.created_by === currentUser.id;
            const canManage = isCreator || isElevatedUser;

            const participants = m.participants || [];
            const myParticipant = participants.find((p) => p.employee_id === currentUser.id);
            const myRsvp = isCreator ? 'accepted' : (myParticipant?.status || 'invited');

            const acceptedCount = participants.filter((p) => p.status === 'accepted').length;
            const declinedCount = participants.filter((p) => p.status === 'declined').length;
            const pendingCount = participants.filter((p) => p.status === 'invited').length;

            return (
              <div
                key={m.id}
                className="desktop-panel rounded-xl p-4 flex flex-col justify-between space-y-3 border border-[#1b202c] hover:border-[#2a3449] transition-all bg-[#0a0d14] group"
              >
                <div className="space-y-2.5">
                  {/* Row 1: Project, Status & Manage buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-300 font-semibold">
                        {proj ? `${proj.code || 'PRJ'} • ${proj.name}` : 'GENERAL SQUAD'}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                          m.status === 'scheduled'
                            ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                            : m.status === 'ongoing'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-pulse'
                            : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditMeeting(m)}
                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          title="Edit Meeting"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(m)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="Delete Meeting"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                      {m.title}
                    </h3>
                    {m.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  {/* Time & Location meta */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 font-mono pt-1">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>
                        {formatDate(m.start_time, 'EEE, dd MMM')} • {formatTime(m.start_time)} - {formatTime(m.end_time)}
                      </span>
                    </div>

                    {m.room_location && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>{m.room_location}</span>
                      </div>
                    )}
                  </div>

                  {/* Organizer & Attendees row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#161b26]">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        name={host?.full_name || 'Organizer'}
                        avatarUrl={host?.avatar_url}
                        size="sm"
                        className="h-5.5 w-5.5 text-[9px] border border-blue-500/30"
                      />
                      <span className="text-xs text-slate-300 truncate font-medium">
                        {host?.full_name || 'Squad Organizer'}
                        {isCreator && <span className="text-blue-400 font-mono text-[10px] ml-1">(You)</span>}
                      </span>
                    </div>

                    {/* Compact Attendees Stack */}
                    <button
                      onClick={() => {
                        setRosterMeeting(m);
                        setRosterModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      title="View attendee details"
                    >
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {participants.slice(0, 4).map((p) => {
                          const emp = profiles.find((prof) => prof.id === p.employee_id);
                          return (
                            <UserAvatar
                              key={p.id || p.employee_id}
                              name={emp?.full_name || 'Member'}
                              avatarUrl={emp?.avatar_url}
                              size="sm"
                              className={`h-5 w-5 text-[8px] ring-1 ring-[#0a0d14] ${
                                p.status === 'accepted'
                                  ? 'border-emerald-500'
                                  : p.status === 'declined'
                                  ? 'border-rose-500'
                                  : 'border-slate-600'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {participants.length}
                        {acceptedCount > 0 && (
                          <span className="text-emerald-400 ml-1">({acceptedCount}✓)</span>
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 border-t border-[#161b26] flex items-center justify-between gap-2">
                  {/* Left: Join Call link (only if creator or accepted) */}
                  <div>
                    {m.meeting_url ? (
                      isCreator || myRsvp === 'accepted' ? (
                        <a
                          href={m.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 px-3 py-1 rounded-full border border-blue-500/20 font-semibold transition-all"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Join Call</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500">
                          Accept invite to join
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 italic">
                        In-person sync
                      </span>
                    )}
                  </div>

                  {/* Right: RSVP controls */}
                  <div>
                    {isCreator ? (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-semibold flex items-center gap-1">
                        <Crown className="h-3 w-3" />
                        <span>Host</span>
                      </span>
                    ) : myRsvp === 'accepted' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" />
                          <span>Attending</span>
                        </span>
                        <button
                          onClick={() => handleOpenDeclineModal(m)}
                          className="text-[10px] font-mono text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    ) : myRsvp === 'declined' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <XCircle className="h-3 w-3" />
                          <span>Declined</span>
                        </span>
                        <button
                          onClick={() => handleAcceptMeeting(m)}
                          className="text-[10px] font-mono text-slate-400 hover:text-emerald-400 px-1.5 py-0.5 rounded transition-colors"
                        >
                          Accept
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAcceptMeeting(m)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-medium transition-colors shadow-sm"
                        >
                          <Check className="h-3 w-3 stroke-[2.5]" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleOpenDeclineModal(m)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#121620] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-[#232a3a] hover:border-rose-500/30 text-[11px] font-mono transition-colors"
                        >
                          <X className="h-3 w-3" />
                          <span>Decline</span>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                Delete Meeting
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                This action will remove the meeting for all invited attendees.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] space-y-1">
              <p className="text-sm font-semibold text-white">{meetingToDelete?.title}</p>
              {meetingToDelete && (
                <p className="text-[11px] text-slate-400 font-mono">
                  {formatDate(meetingToDelete.start_time, 'EEE, dd MMM yyyy')} • {formatTime(meetingToDelete.start_time)}
                </p>
              )}
            </div>

            <p className="text-xs text-rose-300">
              Are you sure you want to cancel and delete this meeting?
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setMeetingToDelete(null);
              }}
              className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 shadow-sm"
            >
              Delete Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Reason Dialog */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <XCircle className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                Decline Invitation
              </DialogTitle>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {targetMeeting?.title}
              </p>
            </div>
          </div>

          <div className="space-y-3.5 pt-2 text-xs">
            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1.5">
                Quick Reason
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setDeclineReason(reason)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all border ${
                      declineReason === reason
                        ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                        : 'bg-[#161b22] border-[#30363d] text-slate-400 hover:text-white hover:border-[#484f58]'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Note for Organizer (Optional)
              </label>
              <Textarea
                placeholder="Reason for declining..."
                rows={2}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-rose-500"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeclineModalOpen(false);
                setTargetMeeting(null);
                setDeclineReason('');
              }}
              className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDecline}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 shadow-sm"
            >
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendee Roster Modal */}
      <Dialog open={rosterModalOpen} onOpenChange={setRosterModalOpen}>
        <DialogContent className="max-w-md bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white">
                Attendees & Responses
              </DialogTitle>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {rosterMeeting?.title}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            {rosterMeeting?.participants?.map((p) => {
              const emp = profiles.find((prof) => prof.id === p.employee_id);
              const isHost = p.employee_id === rosterMeeting.created_by;
              const isAccepted = p.status === 'accepted';
              const isDeclined = p.status === 'declined';

              return (
                <div
                  key={p.id || p.employee_id}
                  className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        name={emp?.full_name || 'Member'}
                        avatarUrl={emp?.avatar_url}
                        size="sm"
                        className="h-6 w-6 text-[10px]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white truncate">
                            {emp?.full_name || 'Squad Member'}
                          </span>
                          {isHost && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Host
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {emp?.designation_title || emp?.role?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAccepted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          <CheckCircle className="h-3 w-3" />
                          <span>Accepted</span>
                        </span>
                      )}
                      {isDeclined && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          <XCircle className="h-3 w-3" />
                          <span>Declined</span>
                        </span>
                      )}
                      {!isAccepted && !isDeclined && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {isDeclined && p.decline_reason && (
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300">
                      <div className="flex items-center gap-1 text-[10px] font-mono text-rose-400 mb-0.5">
                        <MessageSquare className="h-3 w-3" />
                        <span>Reason:</span>
                      </div>
                      <p className="text-[11px] italic">"{p.decline_reason}"</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-3 border-t border-[#21262d]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRosterModalOpen(false);
                setRosterMeeting(null);
              }}
              className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
