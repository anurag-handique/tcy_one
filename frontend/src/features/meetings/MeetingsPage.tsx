import * as React from 'react';
import {
  Video,
  Plus,
  Clock,
  Building,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { formatDate, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';

export function MeetingsPage() {
  const { currentUser } = useAuthStore();
  const { meetings, projects, profiles, respondToMeeting } = useDataStore();
  const { setMeetingModalOpen } = useUIStore();

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight font-mono">
            INTERNAL SYNCHRONIZATIONS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sprint ceremonies, client reviews, architecture check-ins, and meeting minutes.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setMeetingModalOpen(true)}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Grid */}
      {meetings.length === 0 ? (
        <div className="desktop-panel rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-[#141824] border border-[#232a3a] flex items-center justify-center text-slate-500">
            <Video className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono">NO MEETINGS SCHEDULED</h3>
            <p className="text-xs text-slate-400 mt-0.5">Schedule a sprint review, sync checkpoint, or architecture check-in.</p>
          </div>
          <Button size="sm" onClick={() => setMeetingModalOpen(true)} className="h-7 text-xs bg-blue-600 gap-1 font-mono">
            <Plus className="h-3.5 w-3.5" />
            <span>Schedule Meeting</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {meetings.map((m) => {
          const host = profiles.find((p) => p.id === m.created_by);
          const proj = projects.find((p) => p.id === m.project_id);
          const myRsvp = m.participants?.find((p) => p.employee_id === currentUser.id)?.status || 'invited';

          return (
            <div key={m.id} className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] bg-[#171b26] border border-[#232a38] px-1.5 py-0.2 rounded text-slate-300">
                    {proj?.code || 'GENERAL'}
                  </span>
                  <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 uppercase">
                    {m.status}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white">{m.title}</h3>
                {m.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                    {m.description}
                  </p>
                )}

                <div className="mt-2.5 space-y-1 bg-[#0b0e14] p-2.5 rounded border border-[#1b202c] text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                    <Clock className="h-3 w-3 text-blue-400" />
                    <span>{formatDate(m.start_time, 'EEE, dd MMM')} • {formatTime(m.start_time)} - {formatTime(m.end_time)}</span>
                  </div>

                  {m.room_location && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Building className="h-3 w-3 text-purple-400" />
                      <span>{m.room_location}</span>
                    </div>
                  )}

                  {m.agenda && (
                    <div className="pt-1.5 border-t border-[#1b202c] text-[10px] text-slate-400 whitespace-pre-line">
                      <span className="uppercase font-mono block text-slate-400">Agenda:</span>
                      {m.agenda}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#1b202c] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <UserAvatar name={host?.full_name || 'Host'} avatarUrl={host?.avatar_url} size="sm" className="h-4 w-4 text-[8px]" />
                  <span className="text-[11px] text-slate-400">{host?.full_name?.split(' ')[0]}</span>
                </div>

                <div className="flex items-center gap-2">
                  {m.meeting_url && (
                    <a
                      href={m.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:underline bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                    >
                      <Video className="h-3 w-3" />
                      <span>Join Link</span>
                    </a>
                  )}

                  <div className="flex items-center gap-1 bg-[#0c0e15] p-0.5 rounded border border-[#1b202c]">
                    <button
                      onClick={() => {
                        respondToMeeting(m.id, currentUser.id, 'accepted');
                        toast.success('Accepted meeting');
                      }}
                      className={`p-0.5 rounded text-[10px] ${
                        myRsvp === 'accepted' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
                      }`}
                      title="Accept"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        respondToMeeting(m.id, currentUser.id, 'declined');
                        toast.error('Declined meeting');
                      }}
                      className={`p-0.5 rounded text-[10px] ${
                        myRsvp === 'declined' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-400'
                      }`}
                      title="Decline"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
