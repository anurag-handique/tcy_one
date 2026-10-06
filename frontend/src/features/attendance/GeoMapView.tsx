import * as React from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Globe,
  Radio,
  Search,
  Building2,
  Home,
  Briefcase,
  ShieldCheck,
  Compass,
  CheckCircle2,
  Clock,
  Crosshair,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Attendance, Profile, WorkMode } from '@/types';
import { formatTime, formatWorkingDuration } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface GeoMapViewProps {
  attendance: Attendance[];
  profiles: Profile[];
  todayStr: string;
}

interface ParsedGeoItem {
  profile: Profile;
  attendance?: Attendance;
  isClockedIn: boolean;
  isPresent: boolean;
  locationStr: string;
  hasGps: boolean;
  lat: number;
  lng: number;
  label: string;
  workMode: WorkMode;
  punchTime: string;
  accuracy?: string;
}

// HQ anchor (New Delhi / Global Office center)
const DEFAULT_HQ_LAT = 28.6139;
const DEFAULT_HQ_LNG = 77.2090;

export function GeoMapView({ attendance, profiles, todayStr }: GeoMapViewProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<'all' | 'working' | 'office' | 'remote' | 'field'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [zoomLevel, setZoomLevel] = React.useState<'city' | 'regional' | 'global'>('city');

  // Parse location and coordinates for each profile
  const geoItems: ParsedGeoItem[] = React.useMemo(() => {
    return profiles.map((p, idx) => {
      const att = attendance.find((a) => a.employee_id === p.id && a.date === todayStr);
      const isClockedIn = Boolean(att && !att.clock_out);
      const isPresent = Boolean(att);
      const locStr = att?.punch_in_location || (isPresent ? 'Office' : p.work_location || 'Office');

      // Check for explicit [Geo: lat, lng]
      const geoMatch = locStr.match(/\[Geo:\s*([-\d.]+)°?,\s*([-\d.]+)°?\]/);
      let lat = DEFAULT_HQ_LAT;
      let lng = DEFAULT_HQ_LNG;
      let hasGps = false;

      if (geoMatch) {
        lat = parseFloat(geoMatch[1]);
        lng = parseFloat(geoMatch[2]);
        hasGps = true;
      } else {
        // Deterministic hash offset based on profile ID so pins don't stack exactly on top of each other
        const hash = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const offsetLat = ((hash % 100) - 50) * 0.008;
        const offsetLng = (((hash * 13) % 100) - 50) * 0.008;
        lat = DEFAULT_HQ_LAT + offsetLat;
        lng = DEFAULT_HQ_LNG + offsetLng;
      }

      // Determine work mode
      const workMode: WorkMode = att?.work_mode || (p.work_location?.toLowerCase().includes('remote') ? 'remote' : 'office');

      const label = locStr.replace(/\[Geo:.*?\]/, '').trim() || (workMode === 'office' ? 'HQ Office' : 'Remote');

      return {
        profile: p,
        attendance: att,
        isClockedIn,
        isPresent,
        locationStr: locStr,
        hasGps,
        lat,
        lng,
        label,
        workMode,
        punchTime: att?.clock_in ? formatTime(att.clock_in) : 'Not Clocked In',
      };
    });
  }, [profiles, attendance, todayStr]);

  // Filtered items
  const filteredItems = React.useMemo(() => {
    return geoItems.filter((item) => {
      // Filter tab
      if (filterMode === 'working' && !item.isClockedIn) return false;
      if (filterMode === 'office' && item.workMode !== 'office') return false;
      if (filterMode === 'remote' && item.workMode !== 'remote') return false;
      if (filterMode === 'field' && item.workMode !== 'hybrid') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.profile.full_name.toLowerCase().includes(q);
        const matchEmail = item.profile.email.toLowerCase().includes(q);
        const matchLoc = item.locationStr.toLowerCase().includes(q);
        return matchName || matchEmail || matchLoc;
      }
      return true;
    });
  }, [geoItems, filterMode, searchQuery]);

  // Selected item object
  const selectedItem = React.useMemo(() => {
    if (!selectedId) return filteredItems[0] || geoItems[0] || null;
    return geoItems.find((item) => item.profile.id === selectedId) || filteredItems[0] || null;
  }, [selectedId, geoItems, filteredItems]);

  // KPI counters
  const totalEmployees = profiles.length;
  const activeWorkingCount = geoItems.filter((g) => g.isClockedIn).length;
  const officeCount = geoItems.filter((g) => g.isClockedIn && g.workMode === 'office').length;
  const remoteCount = geoItems.filter((g) => g.isClockedIn && g.workMode === 'remote').length;
  const gpsVerifiedCount = geoItems.filter((g) => g.hasGps).length;

  return (
    <div className="space-y-4">
      {/* 1. Header Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="desktop-panel p-3 rounded flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Active On-Map</div>
            <div className="text-lg font-bold font-mono text-white">
              {activeWorkingCount} <span className="text-xs text-slate-500 font-normal">/ {totalEmployees}</span>
            </div>
          </div>
        </div>

        <div className="desktop-panel p-3 rounded flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Office Premises</div>
            <div className="text-lg font-bold font-mono text-emerald-400">{officeCount}</div>
          </div>
        </div>

        <div className="desktop-panel p-3 rounded flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Home className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Remote / WFH</div>
            <div className="text-lg font-bold font-mono text-purple-400">{remoteCount}</div>
          </div>
        </div>

        <div className="desktop-panel p-3 rounded flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Crosshair className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">GPS Telemetry</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {gpsVerifiedCount} <span className="text-[10px] text-slate-500">Live</span>
            </div>
          </div>
        </div>

        <div className="desktop-panel p-3 rounded flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="h-8 w-8 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400">Super Admin Radar</div>
            <div className="text-xs font-mono font-bold text-cyan-300">Live Synchronized</div>
          </div>
        </div>
      </div>

      {/* 2. Map & Roster Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Map Viewport (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Map Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5 px-2">
                <Globe className="h-3.5 w-3.5 text-blue-400" /> SQUAD SATELLITE RADAR
              </span>
              <div className="flex items-center gap-1 bg-[#121622] p-0.5 rounded border border-[#1e2434] text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setZoomLevel('city')}
                  className={`px-2 py-0.5 rounded ${zoomLevel === 'city' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  City Radar
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('regional')}
                  className={`px-2 py-0.5 rounded ${zoomLevel === 'regional' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Regional
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('global')}
                  className={`px-2 py-0.5 rounded ${zoomLevel === 'global' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Global
                </button>
              </div>
            </div>

            {selectedItem && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                  Target: <strong className="text-white">{selectedItem.profile.full_name}</strong> ({selectedItem.lat.toFixed(4)}°, {selectedItem.lng.toFixed(4)}°)
                </span>
                <a
                  href={`https://www.google.com/maps?q=${selectedItem.lat},${selectedItem.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2 py-1 rounded transition-colors"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Tactical Radar Canvas Container */}
          <div className="relative h-[440px] w-full rounded-lg bg-[#07090e] border border-[#1b202c] overflow-hidden shadow-inner flex items-center justify-center select-none">
            {/* Dark Grid Background Lines */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #25334d 1px, transparent 1px),
                  linear-gradient(to bottom, #25334d 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
              }}
            />

            {/* Concentric Radar Rings & Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-[380px] w-[380px] rounded-full border border-blue-500/10" />
              <div className="absolute h-[260px] w-[260px] rounded-full border border-blue-500/15" />
              <div className="absolute h-[140px] w-[140px] rounded-full border border-blue-500/20" />
              <div className="absolute h-[20px] w-[20px] rounded-full bg-blue-500/20 border border-blue-400" />
              {/* Radar Axis Lines */}
              <div className="absolute w-full h-[1px] bg-blue-500/10" />
              <div className="absolute h-full w-[1px] bg-blue-500/10" />
            </div>

            {/* Radar Scan Line Animation */}
            <div
              className="absolute inset-0 pointer-events-none origin-center animate-[spin_10s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(59, 130, 246, 0.12) 360deg)',
              }}
            />

            {/* Map Telemetry Watermark Labels */}
            <div className="absolute top-3 left-3 text-[9px] font-mono text-slate-500 space-y-0.5 pointer-events-none">
              <div>LAT 28.6139° N • LON 77.2090° E</div>
              <div>TCY-GEO SAT-18 LIVE LINK</div>
              <div className="text-emerald-400 font-bold">RADAR STATUS: ACTIVE</div>
            </div>

            <div className="absolute bottom-3 right-3 text-[9px] font-mono text-slate-500 text-right pointer-events-none">
              <div>GRID PROJECTION: WGS-84</div>
              <div>RANGE: {zoomLevel === 'city' ? '50 KM' : zoomLevel === 'regional' ? '250 KM' : '1500 KM'}</div>
            </div>

            {/* HQ Central Base Marker */}
            <div className="absolute flex flex-col items-center pointer-events-none z-10" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className="h-6 w-6 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Building2 className="h-3 w-3 text-white" />
              </div>
              <span className="text-[9px] font-mono font-bold text-blue-300 bg-[#07090e]/90 px-1.5 py-0.5 rounded border border-blue-500/30 mt-1 shadow">
                TCY HQ BASE
              </span>
            </div>

            {/* Interactive Employee Location Pins */}
            {filteredItems.map((item, idx) => {
              // Calculate pin position relative to center
              const latDiff = item.lat - DEFAULT_HQ_LAT;
              const lngDiff = item.lng - DEFAULT_HQ_LNG;

              const zoomMultiplier = zoomLevel === 'city' ? 1200 : zoomLevel === 'regional' ? 500 : 150;
              const offsetX = lngDiff * zoomMultiplier;
              const offsetY = -latDiff * zoomMultiplier;

              // Clamp to viewport
              const posX = Math.max(8, Math.min(92, 50 + (offsetX / 4)));
              const posY = Math.max(8, Math.min(92, 50 + (offsetY / 4)));

              const isSelected = selectedItem?.profile.id === item.profile.id;

              return (
                <div
                  key={item.profile.id}
                  onClick={() => setSelectedId(item.profile.id)}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-transform hover:scale-125 group"
                >
                  {/* Pulsing ring for active working employees */}
                  {item.isClockedIn && (
                    <span
                      className={`absolute -inset-2 rounded-full animate-ping opacity-60 pointer-events-none ${
                        item.workMode === 'office'
                          ? 'bg-emerald-500'
                          : item.workMode === 'remote'
                          ? 'bg-purple-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  )}

                  {/* Marker Pin Icon */}
                  <div
                    className={`relative flex items-center justify-center h-8 w-8 rounded-full border shadow-xl transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-white scale-125 ring-4 ring-blue-500/40 z-30'
                        : item.isClockedIn
                        ? item.workMode === 'office'
                          ? 'bg-[#0f241a] text-emerald-400 border-emerald-500/60'
                          : item.workMode === 'remote'
                          ? 'bg-[#20132e] text-purple-400 border-purple-500/60'
                          : 'bg-[#2b1f0c] text-amber-400 border-amber-500/60'
                        : 'bg-[#141824] text-slate-400 border-[#283144]'
                    }`}
                  >
                    <UserAvatar name={item.profile.full_name} avatarUrl={item.profile.avatar_url} size="sm" className="h-6 w-6 text-[9px]" />
                  </div>

                  {/* Hover Tag & Label */}
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap transition-opacity duration-150 ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <div className="bg-[#0b0e14]/95 text-white border border-[#232b3e] px-2 py-1 rounded shadow-xl text-[10px] font-mono flex flex-col items-center">
                      <div className="font-bold flex items-center gap-1">
                        <span>{item.profile.full_name}</span>
                        {item.hasGps && <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded">GPS</span>}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {item.isClockedIn ? `Clocked in at ${item.punchTime}` : 'Offline / Closed'}
                      </div>
                      <div className="text-[8px] text-blue-300 max-w-[130px] truncate">
                        {item.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Employee Telemetry Detail Inspector Card */}
          {selectedItem && (
            <div className="p-3.5 rounded-lg bg-[#0e121a] border border-[#1f2638] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b2130] pb-2.5">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={selectedItem.profile.full_name}
                    avatarUrl={selectedItem.profile.avatar_url}
                    size="md"
                    className="h-10 w-10 text-xs ring-2 ring-blue-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">{selectedItem.profile.full_name}</span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
                          selectedItem.isClockedIn
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : selectedItem.isPresent
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {selectedItem.isClockedIn ? 'CURRENTLY ACTIVE' : selectedItem.isPresent ? 'SHIFT COMPLETED' : 'OFFLINE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {selectedItem.profile.role.toUpperCase()} • {selectedItem.profile.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${selectedItem.lat},${selectedItem.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs flex items-center gap-1.5 shadow transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>View Exact Google Pin</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Geolocation Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[#090b10] p-2 rounded border border-[#171b26]">
                  <span className="text-[9px] text-slate-500 uppercase block">PUNCH IN LOCATION</span>
                  <span className="text-slate-200 font-medium text-[11px] break-words">
                    {selectedItem.attendance?.punch_in_location || 'Not Recorded'}
                  </span>
                </div>

                <div className="bg-[#090b10] p-2 rounded border border-[#171b26]">
                  <span className="text-[9px] text-slate-500 uppercase block">COORDINATES</span>
                  <span className="text-blue-400 font-bold text-[11px]">
                    {selectedItem.lat.toFixed(5)}°, {selectedItem.lng.toFixed(5)}°
                  </span>
                </div>

                <div className="bg-[#090b10] p-2 rounded border border-[#171b26]">
                  <span className="text-[9px] text-slate-500 uppercase block">WORK PREMISES</span>
                  <span className="text-slate-200 capitalize font-medium text-[11px]">
                    {selectedItem.workMode} Mode
                  </span>
                </div>

                <div className="bg-[#090b10] p-2 rounded border border-[#171b26]">
                  <span className="text-[9px] text-slate-500 uppercase block">SHIFT TIMING</span>
                  <span className="text-slate-200 font-medium text-[11px]">
                    {selectedItem.attendance?.clock_in ? `${formatTime(selectedItem.attendance.clock_in)} In` : '—'}
                    {selectedItem.attendance?.clock_out ? ` → ${formatTime(selectedItem.attendance.clock_out)} Out` : selectedItem.isClockedIn ? ' (Active)' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Employee Location Roster (4 Cols) */}
        <div className="lg:col-span-4 desktop-panel rounded-lg p-3 space-y-3 flex flex-col h-[600px]">
          <div className="border-b border-[#1b202c] pb-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-blue-400" /> SQUAD RADAR ROSTER
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {filteredItems.length} listed
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Filter employee or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-8 text-xs bg-[#0b0e14] border-[#1b202c] font-mono"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              {(['all', 'working', 'office', 'remote', 'field'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFilterMode(mode)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded capitalize transition-colors ${
                    filterMode === mode
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#121622] text-slate-400 hover:text-slate-200 border border-[#1d2332]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 font-mono">No matching records found.</p>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.profile.id === item.profile.id;

                return (
                  <div
                    key={item.profile.id}
                    onClick={() => setSelectedId(item.profile.id)}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#121826] border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-[#0b0e14] border-[#191e2b] hover:bg-[#10141f]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={item.profile.full_name} avatarUrl={item.profile.avatar_url} size="sm" className="h-6 w-6 text-[9px]" />
                        <div>
                          <div className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                            <span>{item.profile.full_name}</span>
                            {item.hasGps && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-mono">
                                GPS
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.profile.role}</div>
                        </div>
                      </div>

                      <span
                        className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                          item.isClockedIn
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : item.isPresent
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {item.isClockedIn ? 'ACTIVE' : item.isPresent ? 'OUT' : 'OFFLINE'}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-[#161a26] flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <div className="truncate max-w-[190px] flex items-center gap-1" title={item.locationStr}>
                        <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-slate-500 shrink-0">{item.punchTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
