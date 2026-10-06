import * as React from 'react';
import {
  MapPin,
  Clock,
  Play,
  Square,
  Building2,
  Home,
  Briefcase,
  Navigation,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { WorkMode } from '@/types';
import { formatTime, formatDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export function PunchLocationModal() {
  const { currentUser } = useAuthStore();
  const { clockIn, clockOut, attendancePolicy } = useDataStore();
  const { activePunchModalOpen, punchModalMode, setPunchModalOpen } = useUIStore();

  const isPunchIn = punchModalMode === 'in';

  const [currentTimeStr, setCurrentTimeStr] = React.useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [workMode, setWorkMode] = React.useState<WorkMode>('office');
  const [locationPreset, setLocationPreset] = React.useState('Office');
  const [customLocation, setCustomLocation] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // GPS State
  const [gpsStatus, setGpsStatus] = React.useState<'detecting' | 'detected' | 'denied' | 'unsupported'>('detecting');
  const [coords, setCoords] = React.useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = React.useState<string | null>(null);

  // Keep live time ticking
  React.useEffect(() => {
    if (!activePunchModalOpen) return;
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, [activePunchModalOpen]);

  // Detect location on modal open
  const detectLocation = React.useCallback(() => {
    setGpsStatus('detecting');
    setCoords(null);

    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      setCoords('System Desktop Location');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        const acc = Math.round(pos.coords.accuracy);
        setCoords(`${lat}°, ${lng}°`);
        setGpsAccuracy(`±${acc}m`);
        setGpsStatus('detected');
      },
      (err) => {
        console.warn('Geolocation prompt response:', err.message);
        setGpsStatus('denied');
        setCoords('Desktop App Workstation (Local IP)');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  React.useEffect(() => {
    if (activePunchModalOpen) {
      detectLocation();
      setLocationPreset(currentUser.work_location || 'Office');
      setCustomLocation('');
      setNotes('');
    }
  }, [activePunchModalOpen, currentUser.work_location, detectLocation]);

  const handleConfirm = () => {
    const finalLocationName =
      locationPreset === 'Custom'
        ? customLocation.trim() || 'Custom Location'
        : locationPreset === 'Office'
        ? `${currentUser.work_location || 'Headquarters'} Office`
        : locationPreset === 'Remote'
        ? 'Remote / Work From Home'
        : 'Client Site / Field';

    const geoTag = coords ? ` [Geo: ${coords}]` : '';
    const fullLocationString = `${finalLocationName}${geoTag}`;

    if (isPunchIn) {
      const rec = clockIn(currentUser.id, workMode, notes.trim() || undefined, fullLocationString);
      const statusNote =
        rec.status === 'late'
          ? ' (Marked Late)'
          : rec.status === 'absent'
          ? ' (Past Threshold: Marked Absent)'
          : ' (On-Time)';
      toast.success(`Clocked in at ${fullLocationString}!${statusNote}`);
    } else {
      const rec = clockOut(currentUser.id, fullLocationString, notes.trim() || undefined);
      const otText = rec && rec.overtime_hours && rec.overtime_hours > 0 ? ` (${rec.overtime_hours}h Overtime recorded)` : '';
      toast.success(`Clocked out at ${fullLocationString}${otText}`);
    }

    setPunchModalOpen(false);
  };

  return (
    <Dialog open={activePunchModalOpen} onOpenChange={(open) => setPunchModalOpen(open)}>
      <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5 text-xs text-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-[#1b202c] pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                isPunchIn
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {isPunchIn ? <Play className="h-4 w-4 fill-current" /> : <Square className="h-4 w-4 fill-current" />}
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white font-mono">
                {isPunchIn ? 'PUNCH IN • LOCATION VERIFICATION' : 'PUNCH OUT • SHIFT CLOSURE'}
              </DialogTitle>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatDate(new Date(), 'EEEE, dd MMM yyyy')} • {currentTimeStr}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 pt-2">
          {/* 1. Live Geolocation Detection Badge */}
          <div className="rounded-lg bg-[#0b0e14] border border-[#1b202c] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] font-semibold">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                <span>DEVICE LOCATION CAPTURE</span>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
              >
                <RefreshCw className={`h-3 w-3 ${gpsStatus === 'detecting' ? 'animate-spin' : ''}`} />
                <span>Re-detect</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#121620] border border-[#1b202c] font-mono text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    gpsStatus === 'detected'
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                      : gpsStatus === 'detecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-blue-400'
                  }`}
                />
                <span className="text-white font-medium">
                  {gpsStatus === 'detecting'
                    ? 'Acquiring GPS / System coordinates...'
                    : coords || 'System Location'}
                </span>
              </div>

              {gpsAccuracy && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {gpsAccuracy}
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-normal">
              Captured automatically via browser GPS / desktop workstation system telemetry.
            </p>
          </div>

          {/* 2. Work Location Preset Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
              Premises / Work Location
            </label>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {[
                { id: 'Office', label: 'Office', icon: Building2 },
                { id: 'Remote', label: 'Remote / Home', icon: Home },
                { id: 'Field', label: 'Client / Field', icon: Briefcase },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = locationPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLocationPreset(p.id)}
                    className={`p-2 rounded-md border flex flex-col items-center justify-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                        : 'bg-[#0b0e14] border-[#1b202c] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Work Mode Selection (Punch In only) */}
          {isPunchIn && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
                Work Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                {(['office', 'remote', 'hybrid'] as WorkMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWorkMode(mode)}
                    className={`py-1.5 rounded-md border uppercase text-center transition-all ${
                      workMode === mode
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#0b0e14] border-[#1b202c] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. Optional Remarks / Location Details */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
              Notes / Shift Remarks (Optional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isPunchIn ? "e.g. Starting sprint deliverables..." : "e.g. Completed today's tasks..."}
              className="h-8 bg-[#0b0e14] border-[#1b202c] text-xs font-mono"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-[#1b202c] flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPunchModalOpen(false)}
            className="h-8 text-xs border-[#222837] bg-[#12151e] hover:bg-[#181d28]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className={`h-8 text-xs font-bold font-mono uppercase tracking-wider gap-1.5 ${
              isPunchIn
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            {isPunchIn ? (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Confirm Punch In</span>
              </>
            ) : (
              <>
                <Square className="h-3 w-3 fill-current" />
                <span>Confirm Punch Out</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
