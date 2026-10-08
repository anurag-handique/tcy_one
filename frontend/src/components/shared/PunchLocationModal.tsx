import * as React from 'react';
import {
  MapPin,
  Clock,
  Play,
  Square,
  Building2,
  Home,
  Briefcase,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { WorkMode } from '@/types';
import { formatDate, formatWorkingDuration } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

// Reverse geocode latitude and longitude to readable address text
async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  // Method 1: BigDataCloud Reverse Geocoding API (Fast, Free, Client-side CORS allowed)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const parts = [
        data.locality || data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name,
        data.city || data.principalSubdivision,
        data.countryName,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch (e) {
    console.warn('Reverse geocode primary API failed, trying fallback:', e);
  }

  // Method 2: OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.address) {
        const addr = data.address;
        const parts = [
          addr.suburb || addr.neighbourhood || addr.road,
          addr.city || addr.town || addr.village || addr.county,
          addr.state,
          addr.country,
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
        if (data.display_name) return data.display_name.split(',').slice(0, 3).join(',');
      }
    }
  } catch (e) {
    console.warn('Reverse geocode fallback failed:', e);
  }

  return 'Verified Workstation Location';
}

export function PunchLocationModal() {
  const { currentUser } = useAuthStore();
  const { clockIn, clockOut, attendancePolicy, attendance } = useDataStore();
  const { activePunchModalOpen, punchModalMode, setPunchModalOpen } = useUIStore();

  const isPunchIn = punchModalMode === 'in';

  // Admin Location Policy
  const isLocationTrackingEnabled = attendancePolicy?.enable_location_tracking ?? true;
  const isLocationRequired = isPunchIn
    ? Boolean(isLocationTrackingEnabled && attendancePolicy?.require_punch_in_location)
    : Boolean(isLocationTrackingEnabled && attendancePolicy?.require_punch_out_location);
  const allowManualOverride = attendancePolicy?.allow_manual_location_override ?? true;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAtt = attendance.find(
    (a) =>
      (a.employee_id === currentUser.id ||
        (currentUser.user_id && a.employee_id === currentUser.user_id) ||
        (currentUser.email && a.employee_id.toLowerCase() === currentUser.email.toLowerCase())) &&
      a.date === todayStr
  );
  const isShiftCompleted = Boolean(todayAtt?.clock_in && todayAtt?.clock_out);

  const [currentTimeStr, setCurrentTimeStr] = React.useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [workMode, setWorkMode] = React.useState<WorkMode>('office');
  const [notes, setNotes] = React.useState('');

  // GPS & Address State (Active only when location is required)
  const [gpsStatus, setGpsStatus] = React.useState<'detecting' | 'detected' | 'denied' | 'unsupported' | 'disabled'>('disabled');
  const [coords, setCoords] = React.useState<string | null>(null);
  const [addressText, setAddressText] = React.useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = React.useState<string | null>(null);

  // Keep live time ticking
  React.useEffect(() => {
    if (!activePunchModalOpen) return;
    const timer = setInterval(() => {
      setCurrentTimeStr(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [activePunchModalOpen]);

  // Detect location and reverse-geocode to address (only if required by policy)
  const detectLocation = React.useCallback(() => {
    if (!isLocationRequired) {
      setGpsStatus('disabled');
      setCoords(null);
      setAddressText(null);
      return;
    }

    setGpsStatus('detecting');
    setCoords(null);
    setAddressText(null);

    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      setAddressText('Desktop Workstation');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        setCoords(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
        setGpsAccuracy(`±${acc}m`);
        setGpsStatus('detected');

        try {
          const resolvedAddress = await reverseGeocodeCoords(lat, lng);
          setAddressText(resolvedAddress);
        } catch {
          setAddressText('Office Workstation');
        }
      },
      (err) => {
        console.warn('Geolocation prompt response:', err.message);
        setGpsStatus('denied');
        setAddressText('Desktop Workstation (Local)');
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }, [isLocationRequired]);

  React.useEffect(() => {
    if (activePunchModalOpen) {
      if (isLocationRequired) {
        detectLocation();
      } else {
        setGpsStatus('disabled');
        setCoords(null);
        setAddressText(null);
      }
      setNotes('');
    }
  }, [activePunchModalOpen, isLocationRequired, detectLocation]);

  const handleConfirm = () => {
    // Check if location is strictly required and not present
    if (isLocationRequired && !allowManualOverride && (gpsStatus === 'denied' || gpsStatus === 'unsupported' || (gpsStatus === 'detecting' && !coords))) {
      toast.error('Verified GPS location is mandatory for this action by admin policy. Please enable device location.');
      return;
    }

    const finalLocationName =
      workMode === 'office'
        ? `${currentUser.work_location || 'Headquarters'} Office`
        : workMode === 'remote'
        ? 'Remote / Home'
        : 'Client Site / Field';

    let fullLocationString: string;
    if (!isLocationRequired) {
      fullLocationString = finalLocationName;
    } else {
      const locationDetail = addressText || (coords ? coords : 'Verified Workstation');
      fullLocationString = `${finalLocationName} • ${locationDetail}`;
    }

    if (isPunchIn) {
      if (isShiftCompleted) {
        toast.error('Shift already completed for today. Multiple punches per day are not permitted.');
        setPunchModalOpen(false);
        return;
      }
      const rec = clockIn(currentUser.id, workMode, notes.trim() || undefined, fullLocationString);
      const statusNote =
        rec.status === 'late'
          ? ' (Marked Late)'
          : rec.status === 'absent'
          ? ' (Past Threshold: Marked Absent)'
          : ' (On-Time)';
      toast.success(`Clocked in!${statusNote}`);
    } else {
      const rec = clockOut(currentUser.id, fullLocationString, notes.trim() || undefined);
      const otText = rec && rec.overtime_hours && rec.overtime_hours > 0 ? ` (${rec.overtime_hours}h Overtime)` : '';
      toast.success(`Clocked out successfully${otText}`);
    }

    setPunchModalOpen(false);
  };

  // Determine policy window indicator
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = (attendancePolicy?.office_start_time || '09:30').split(':').map(Number);
  const startTimeMins = (startH || 9) * 60 + (startM || 30);
  const [maxH, maxM] = (attendancePolicy?.max_punch_in_time || '10:30').split(':').map(Number);
  const maxTimeMins = (maxH || 10) * 60 + (maxM || 30);

  const isStrictLocationBlock =
    isLocationRequired &&
    !allowManualOverride &&
    (gpsStatus === 'denied' || gpsStatus === 'unsupported' || (gpsStatus === 'detecting' && !coords));

  const isLate = isPunchIn && currentMins > startTimeMins && currentMins <= maxTimeMins;
  const isPastMax = isPunchIn && currentMins > maxTimeMins;

  return (
    <Dialog open={activePunchModalOpen} onOpenChange={(open) => setPunchModalOpen(open)}>
      <DialogContent className="max-w-[430px] p-0 overflow-hidden border border-white/[0.08] bg-[#0c0e14]/95 backdrop-blur-2xl rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-slate-200">
        {/* Ambient Top Glow */}
        <div
          className={`absolute top-0 inset-x-0 h-36 pointer-events-none transition-all duration-500 ${
            isShiftCompleted
              ? 'bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(99,102,241,0.15),transparent)]'
              : isPunchIn
              ? isPastMax
                ? 'bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(239,68,68,0.15),transparent)]'
                : isLate
                ? 'bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(245,158,11,0.15),transparent)]'
                : 'bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(16,185,129,0.18),transparent)]'
              : 'bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(244,63,94,0.18),transparent)]'
          }`}
        />

        <div className="relative p-6 space-y-5">
          {/* Header & Hero Time Block */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase border border-white/[0.08] bg-white/[0.03] text-slate-400">
              <ShieldCheck className="h-3 w-3 text-blue-400" />
              <span>Attendance Station</span>
            </div>

            <div className="pt-2 pb-1">
              <div className="text-4xl font-extrabold font-mono tracking-tight text-white select-none">
                {currentTimeStr}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1">
                {formatDate(new Date(), 'EEEE, dd MMMM yyyy')}
              </div>
            </div>

            {/* Live Timing Status Badge */}
            <div className="flex justify-center">
              {isShiftCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                  Shift Completed Today ({todayAtt ? formatWorkingDuration(todayAtt.clock_in, todayAtt.clock_out) : ''})
                </span>
              ) : isPunchIn ? (
                isPastMax ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                    Past Cutoff Threshold ({attendancePolicy?.max_punch_in_time})
                  </span>
                ) : isLate ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Late Punch (Grace limit {attendancePolicy?.max_punch_in_time})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    On-Time Window (Start: {attendancePolicy?.office_start_time})
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  Active Shift: {todayAtt?.clock_in ? formatWorkingDuration(todayAtt.clock_in, null) : 'Logged In'}
                </span>
              )}
            </div>
          </div>

          {/* If already completed notification */}
          {isPunchIn && isShiftCompleted ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 text-center space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Your shift for today has already been concluded. Daily timesheet records are locked once punched out.
              </p>
              <p className="text-[11px] text-slate-400">
                To correct timings or request adjustments, use the <span className="text-blue-400 font-medium">Regularization</span> request tool in the Attendance page.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Work Mode Segmented Switch (Punch In only) */}
              {isPunchIn && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Working From</span>
                    <span className="text-slate-400 capitalize">{workMode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    {[
                      { id: 'office', label: 'Office', icon: Building2 },
                      { id: 'remote', label: 'Remote', icon: Home },
                      { id: 'hybrid', label: 'Client / Field', icon: Briefcase },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = workMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setWorkMode(item.id as WorkMode)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                            isSelected
                              ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Verified Location Box (Rendered ONLY when location tracking is Required by Admin Policy) */}
              {isLocationRequired && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span
                          className={`inline-flex rounded-full h-2 w-2 ${
                            gpsStatus === 'detected'
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                              : gpsStatus === 'detecting'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-rose-400'
                          }`}
                        />
                      </span>
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                        <span>Device Geolocation</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Required
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={detectLocation}
                      title="Refresh GPS capture"
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors"
                    >
                      <RefreshCw className={`h-3 w-3 ${gpsStatus === 'detecting' ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-200 truncate">
                      {gpsStatus === 'detecting'
                        ? 'Acquiring required device telemetry...'
                        : isStrictLocationBlock
                        ? 'GPS permission denied or unavailable'
                        : addressText || coords || 'Desktop System Location'}
                    </span>
                    {gpsAccuracy && (
                      <span className="text-[10px] font-mono text-emerald-400/90 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {gpsAccuracy}
                      </span>
                    )}
                  </div>

                  {isStrictLocationBlock && (
                    <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg mt-1">
                      Location tracking is required for this action by company policy. Please allow location permissions in your browser.
                    </p>
                  )}
                </div>
              )}

              {/* Optional Remarks Note */}
              <div>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isPunchIn ? 'Optional punch note (e.g. starting Sprint #4)...' : 'Optional shift closing remarks...'}
                  className="w-full h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] focus:border-white/20 px-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPunchModalOpen(false)}
              className="flex-1 h-9 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              Close
            </Button>

            {isPunchIn && isShiftCompleted ? (
              <Button
                type="button"
                disabled
                size="sm"
                className="flex-[2] h-9 rounded-xl text-xs font-medium bg-white/[0.05] text-slate-500 border border-white/[0.08] cursor-not-allowed"
              >
                Shift Completed
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isStrictLocationBlock}
                onClick={handleConfirm}
                className={`flex-[2] h-9 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 gap-2 shadow-lg active:scale-[0.99] ${
                  isStrictLocationBlock
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                    : isPunchIn
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 font-bold'
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 font-bold'
                }`}
              >
                {isPunchIn ? (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Confirm Punch In</span>
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>Confirm Punch Out</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
