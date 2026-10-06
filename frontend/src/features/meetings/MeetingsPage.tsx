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
  Calendar,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  Sparkles,
  Pencil,
  Trash2,
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
import { Meeting, MeetingParticipant } from '@/types';

export function MeetingsPage() {
  const { currentUser, activeRole } = useAuthStore();
  const { meetings, projects, profiles, respondToMeeting, deleteMeeting, updateMeetingStatus } = useDataStore();
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
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              INTERNAL SYNCHRONIZATIONS & MEETINGS
            </h1>
            {awaitingCount > 0 && (
              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded animate-pulse">
                {awaitingCount} RSVP{awaitingCount > 1 ? 's' : ''} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Squad ceremonies, client syncs, architecture reviews, and live RSVP attendee tracking.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setMeetingModalOpen(true, null)}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-[#090b10] border border-[#1b202c] p-1 rounded">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Meetings ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'invites'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Awaiting RSVP</span>
            {awaitingCount > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 flex items-center justify-center">
                {awaitingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('hosted')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
              activeTab === 'hosted'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hosted by Me
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search meetings, host, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 bg-[#090b10] border border-[#1b202c] rounded pl-7 pr-2.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredMeetings.length === 0 ? (
        <div className="desktop-panel rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-[#141824] border border-[#232a3a] flex items-center justify-center text-slate-500">
            <Video className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono">NO MEETINGS MATCHED</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchQuery || activeTab !== 'all'
                ? 'Try adjusting your filter or search query.'
                : 'Schedule a sprint review, squad sync, or architecture check-in.'}
            </p>
          </div>
          <Button size="sm" onClick={() => setMeetingModalOpen(true, null)} className="h-7 text-xs bg-blue-600 gap-1 font-mono">
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
                className="desktop-panel rounded-lg p-4 flex flex-col justify-between space-y-3.5 border border-[#1b202c] hover:border-[#2a3449] transition-all bg-[#0d1017]"
              >
                <div>
                  {/* Top Bar: Project Tag, Status & Action Icons (Edit / Delete) */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] bg-[#141824] border border-[#232a38] px-2 py-0.5 rounded text-blue-300 font-semibold">
                        {proj ? `${proj.code || 'PRJ'} • ${proj.name}` : 'GENERAL SQUAD'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                          m.status === 'scheduled'
                            ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
                            : m.status === 'ongoing'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 animate-pulse'
                            : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        }`}
                      >
                        {m.status}
                      </span>

                      {canManage && (
                        <div className="flex items-center gap-1 ml-1 bg-[#090b10] p-0.5 rounded border border-[#1b202c]">
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
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-white tracking-tight leading-snug">{m.title}</h3>
                  {m.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}

                  {/* Meeting Metadata Box */}
                  <div className="mt-3 space-y-1.5 bg-[#080a0f] p-3 rounded border border-[#1a1f2c] text-xs">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span className="font-medium">
                        {formatDate(m.start_time, 'EEE, dd MMM yyyy')} • {formatTime(m.start_time)} - {formatTime(m.end_time)}
                      </span>
                    </div>

                    {m.room_location && (
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                        <Building className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span>{m.room_location}</span>
                      </div>
                    )}

                    {m.agenda && (
                      <div className="pt-2 mt-2 border-t border-[#171b26] text-[11px] text-slate-400 whitespace-pre-line">
                        <span className="uppercase font-mono block text-[10px] text-slate-500 mb-0.5">
                          Agenda & Discussion Items:
                        </span>
                        {m.agenda}
                      </div>
                    )}
                  </div>

                  {/* Meeting Creator / Host Profile Highlight */}
                  <div className="mt-3 p-2.5 rounded bg-[#10141f] border border-[#1f2637] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar
                        name={host?.full_name || 'Organizer'}
                        avatarUrl={host?.avatar_url}
                        size="sm"
                        className="h-6 w-6 text-[10px] border border-blue-500/40"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {host?.full_name || 'Squad Organizer'}
                          </span>
                          {isCreator && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          Organizer • {host?.designation_title || host?.role?.replace('_', ' ') || 'Team Lead'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-[#090b10] px-2 py-0.5 rounded border border-[#1b202c]">
                      <Crown className="h-3 w-3 text-amber-400" />
                      <span>Host</span>
                    </div>
                  </div>

                  {/* Attendee Roster Preview & RSVP Stats */}
                  <div className="mt-3 pt-2.5 border-t border-[#181d2a]">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-[11px] uppercase font-bold text-slate-200">
                          Squad Attendees ({participants.length})
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setRosterMeeting(m);
                          setRosterModalOpen(true);
                        }}
                        className="text-[10px] font-mono text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        View All Details
                      </button>
                    </div>

                    {/* Summary Badges */}
                    <div className="flex items-center gap-2 text-[10px] font-mono mb-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {acceptedCount} Accepted
                      </span>
                      {declinedCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {declinedCount} Declined
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          {pendingCount} Pending
                        </span>
                      )}
                    </div>

                    {/* Roster Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {participants.slice(0, 5).map((p) => {
                        const emp = profiles.find((prof) => prof.id === p.employee_id);
                        const isAccepted = p.status === 'accepted';
                        const isDeclined = p.status === 'declined';

                        return (
                          <div
                            key={p.id || p.employee_id}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                              isAccepted
                                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                                : isDeclined
                                ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                                : 'bg-[#10141f] border-[#222838] text-slate-400'
                            }`}
                            title={
                              isDeclined && p.decline_reason
                                ? `Declined: "${p.decline_reason}"`
                                : `${emp?.full_name || 'Member'}: ${p.status}`
                            }
                          >
                            <UserAvatar
                              name={emp?.full_name || 'Member'}
                              avatarUrl={emp?.avatar_url}
                              size="sm"
                              className="h-3.5 w-3.5 text-[8px]"
                            />
                            <span className="truncate max-w-[100px]">{emp?.full_name?.split(' ')[0] || 'Member'}</span>
                            {isAccepted && <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />}
                            {isDeclined && <XCircle className="h-3 w-3 text-rose-400 shrink-0" />}
                            {!isAccepted && !isDeclined && <Clock className="h-3 w-3 text-slate-500 shrink-0" />}
                          </div>
                        );
                      })}

                      {participants.length > 5 && (
                        <button
                          onClick={() => {
                            setRosterMeeting(m);
                            setRosterModalOpen(true);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-mono bg-[#141824] border border-[#232a38] text-slate-400 hover:text-white"
                        >
                          +{participants.length - 5} more
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer: RSVP Actions & Join Call */}
                <div className="pt-3 border-t border-[#1b202c] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {m.meeting_url ? (
                      <a
                        href={m.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded border border-blue-500/30 font-semibold transition-colors"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Join Call</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 italic">
                        In-person / No link
                      </span>
                    )}
                  </div>

                  {/* User's RSVP Controls & Host Actions */}
                  <div className="flex items-center gap-1.5">
                    {isCreator ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                          Host
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMeeting(m)}
                          className="h-6 text-[10px] font-mono border-[#242b3c] bg-[#10141f] text-slate-300 hover:text-white gap-1 px-2"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          <span>Edit</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-[#090b10] p-1 rounded border border-[#1b202c]">
                        {myRsvp === 'accepted' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 px-1.5">
                              <CheckCircle className="h-3 w-3" />
                              <span>Attending</span>
                            </span>
                            <button
                              onClick={() => handleOpenDeclineModal(m)}
                              className="text-[10px] font-mono text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                              title="Change RSVP to Decline"
                            >
                              Decline
                            </button>
                          </div>
                        ) : myRsvp === 'declined' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-rose-400 flex items-center gap-1 px-1.5">
                              <XCircle className="h-3 w-3" />
                              <span>Declined</span>
                            </span>
                            <button
                              onClick={() => handleAcceptMeeting(m)}
                              className="text-[10px] font-mono text-slate-400 hover:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-500/10"
                              title="Change RSVP to Accept"
                            >
                              Accept
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAcceptMeeting(m)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-semibold transition-colors"
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleOpenDeclineModal(m)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-mono transition-colors"
                            >
                              <X className="h-3 w-3" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white font-mono">
                  DELETE INTERNAL MEETING
                </DialogTitle>
                <p className="text-[11px] text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-2 text-xs">
            <div className="p-3 rounded bg-[#090b10] border border-[#1b202c] space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Meeting:</span>
              <p className="text-sm font-bold text-slate-100">{meetingToDelete?.title}</p>
              {meetingToDelete && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Scheduled for {formatDate(meetingToDelete.start_time, 'EEE, dd MMM yyyy')} ({formatTime(meetingToDelete.start_time)})
                </p>
              )}
            </div>

            <p className="text-[11px] text-rose-400 font-mono">
              Are you sure you want to cancel and permanently delete this internal meeting for all invited participants?
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-[#1b202c]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setMeetingToDelete(null);
              }}
              className="h-7 text-xs border-[#222837] bg-[#12151e]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDelete}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Meeting</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Reason Dialog */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white font-mono">
                  DECLINE MEETING INVITATION
                </DialogTitle>
                <p className="text-[11px] text-slate-400">
                  {targetMeeting?.title}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block mb-1.5">
                Select Quick Reason
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setDeclineReason(reason)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors border ${
                      declineReason === reason
                        ? 'bg-rose-600 text-white border-rose-500 font-semibold'
                        : 'bg-[#090b10] border-[#1b202c] text-slate-400 hover:text-white hover:border-[#2d3648]'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block mb-1">
                Additional Comments / Note for Organizer
              </label>
              <Textarea
                placeholder="Explain reason for declining (e.g., conflicting client demo, away from keyboard)..."
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="mt-1 rounded-none border-[#1f2637] bg-[#0c1018] text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[#1b202c]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeclineModalOpen(false);
                setTargetMeeting(null);
                setDeclineReason('');
              }}
              className="h-7 text-xs border-[#222837] bg-[#12151e]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmDecline}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium gap-1"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Confirm Decline</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Attendee Roster & Comments Modal */}
      <Dialog open={rosterModalOpen} onOpenChange={setRosterModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-white font-mono">
                  ATTENDEE ROSTER & LIVE RESPONSES
                </DialogTitle>
                <p className="text-[11px] text-slate-400">
                  {rosterMeeting?.title}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 pt-2">
            {rosterMeeting?.participants?.map((p) => {
              const emp = profiles.find((prof) => prof.id === p.employee_id);
              const isHost = p.employee_id === rosterMeeting.created_by;
              const isAccepted = p.status === 'accepted';
              const isDeclined = p.status === 'declined';

              return (
                <div
                  key={p.id || p.employee_id}
                  className="p-2.5 rounded bg-[#090b10] border border-[#1b202c] space-y-1.5"
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
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {emp?.full_name || 'Squad Member'}
                          </span>
                          {isHost && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              Host
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {emp?.designation_title || emp?.role?.replace('_', ' ')} • {emp?.email}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isAccepted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          <CheckCircle className="h-3 w-3" />
                          <span>Accepted</span>
                        </span>
                      )}
                      {isDeclined && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          <XCircle className="h-3 w-3" />
                          <span>Declined</span>
                        </span>
                      )}
                      {!isAccepted && !isDeclined && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          <Clock className="h-3 w-3" />
                          <span>Awaiting</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Display Decline Reason if exists */}
                  {isDeclined && p.decline_reason && (
                    <div className="mt-1 p-2 rounded bg-rose-950/30 border border-rose-500/20 text-xs text-rose-200">
                      <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-rose-400 font-semibold mb-0.5">
                        <MessageSquare className="h-3 w-3" />
                        <span>Decline Note / Reason:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed italic">
                        "{p.decline_reason}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-3 border-t border-[#1b202c]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRosterModalOpen(false);
                setRosterMeeting(null);
              }}
              className="h-7 text-xs border-[#222837] bg-[#12151e]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

