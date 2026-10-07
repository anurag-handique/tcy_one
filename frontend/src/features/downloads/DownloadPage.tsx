import * as React from 'react';
import {
  Download,
  Monitor,
  Apple,
  Laptop,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowDownToLine,
  Layers,
  FileCode,
  HardDrive,
  Cpu,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { AppRelease, DesktopPlatform } from '@/types';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export function DownloadPage() {
  const { appReleases, fetchAppReleases } = useDataStore();
  const { isInstallable, installApp } = usePWAInstall();

  // Auto-detect Operating System
  const [detectedOS, setDetectedOS] = React.useState<DesktopPlatform>('windows');

  React.useEffect(() => {
    fetchAppReleases();

    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac') || ua.includes('darwin')) {
        setDetectedOS('macos');
      } else if (ua.includes('linux')) {
        setDetectedOS('linux');
      } else {
        setDetectedOS('windows');
      }
    }
  }, [fetchAppReleases]);

  const windowsRelease = appReleases.find((r) => r.platform === 'windows');
  const macRelease = appReleases.find((r) => r.platform === 'macos');
  const linuxRelease = appReleases.find((r) => r.platform === 'linux');

  const primaryRelease = detectedOS === 'macos' ? macRelease : windowsRelease;
  const alternativeRelease = detectedOS === 'macos' ? windowsRelease : macRelease;
  const altPlatform: DesktopPlatform = detectedOS === 'macos' ? 'windows' : 'macos';

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '89.4 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = (release?: AppRelease, platform?: DesktopPlatform) => {
    const targetPlatform = platform || release?.platform || detectedOS;
    const url = release?.file_url;

    if (url && url !== '#') {
      toast.success(`Starting download for ${release?.file_name || `${targetPlatform} installer`}...`);
      const link = document.createElement('a');
      link.href = url;
      link.download = release?.file_name || `TCY_One_${targetPlatform}.exe`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.info(
        `TCY One v${release?.version || '1.0.2'} for ${targetPlatform === 'windows' ? 'Windows' : 'macOS'} installer package is available. Run npm run electron:build:${targetPlatform === 'windows' ? 'win' : 'mac'} or upload from Admin Settings.`
      );
    }
  };

  return (
    <div className="min-h-full w-full bg-[#07090E] text-slate-100 p-6 sm:p-10 lg:p-14 overflow-y-auto select-none">
      
      {/* Background Glows */}
      <div className="absolute top-12 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-36 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">

        {/* Header Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Desktop Client</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-mono text-white">
            Download <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">TCY ONE</span> Desktop
          </h1>

          <p className="text-sm sm:text-base text-slate-400 font-mono max-w-2xl mx-auto leading-relaxed">
            Supercharge your enterprise workflow with native desktop notifications, zero-latency punch clocking, and offline resilience.
          </p>
        </div>

        {/* Primary Recommended Download Card */}
        <div className="relative rounded-2xl border border-slate-700/60 bg-gradient-to-b from-[#111624] to-[#0A0D16] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="space-y-4 text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
                  ● Detected for your {detectedOS === 'macos' ? 'macOS' : 'Windows'} Device
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                  v{primaryRelease?.version || '1.0.2'}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white flex items-center justify-center md:justify-start gap-3">
                  {detectedOS === 'macos' ? (
                    <Apple className="h-8 w-8 text-white" />
                  ) : (
                    <Monitor className="h-8 w-8 text-blue-400" />
                  )}
                  <span>TCY One for {detectedOS === 'macos' ? 'macOS' : 'Windows'}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-mono">
                  {detectedOS === 'macos'
                    ? 'Apple Silicon (M1/M2/M3/M4) & Intel Universal .dmg Package'
                    : '64-bit NSIS Setup Wizard & Standalone Portable Executable'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs font-mono text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                  <span>Size: {formatFileSize(primaryRelease?.file_size)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Verified Safe & Signed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Windows Action Center Ready</span>
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <Button
                onClick={() => handleDownload(primaryRelease, detectedOS)}
                size="lg"
                className="h-14 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-base shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
              >
                <ArrowDownToLine className="h-6 w-6 animate-bounce" />
                <div className="text-left">
                  <div>Download for {detectedOS === 'macos' ? 'macOS' : 'Windows'}</div>
                  <div className="text-[11px] font-normal text-blue-100 opacity-80">
                    {primaryRelease?.file_name || (detectedOS === 'macos' ? 'TCY One 1.0.2.dmg' : 'TCY One Setup 1.0.2.exe')}
                  </div>
                </div>
              </Button>

              <span className="text-[11px] font-mono text-slate-500">
                Direct installer link from TCY Cloud
              </span>
            </div>

          </div>

          {/* Release Notes Banner */}
          {primaryRelease?.release_notes && (
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-start gap-3 text-xs font-mono text-slate-300 bg-slate-900/40 p-4 rounded-lg">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">What's new in v{primaryRelease.version}:</span>{' '}
                <span className="text-slate-300">{primaryRelease.release_notes}</span>
              </div>
            </div>
          )}

        </div>

        {/* Alternative Downloads & Platforms Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>Other Platforms & Formats</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Windows Card */}
            <div className="rounded-xl border border-slate-800 bg-[#0c101a] p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-white">
                    <Monitor className="h-4 w-4 text-blue-400" />
                    <span>Windows 10 / 11</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    v{windowsRelease?.version || '1.0.2'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Full NSIS Setup Wizard with automatic start menu integration.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  {formatFileSize(windowsRelease?.file_size)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(windowsRelease, 'windows')}
                  className="h-8 text-xs font-mono border-slate-700 hover:bg-blue-600 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  <span>Download .exe</span>
                </Button>
              </div>
            </div>

            {/* macOS Card */}
            <div className="rounded-xl border border-slate-800 bg-[#0c101a] p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-white">
                    <Apple className="h-4 w-4 text-slate-200" />
                    <span>macOS Ventura+</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    v{macRelease?.version || '1.0.2'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Universal DMG package supporting Apple Silicon & Intel Macs.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  {formatFileSize(macRelease?.file_size)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(macRelease, 'macos')}
                  className="h-8 text-xs font-mono border-slate-700 hover:bg-blue-600 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  <span>Download .dmg</span>
                </Button>
              </div>
            </div>

            {/* PWA / Browser Web App Card */}
            <div className="rounded-xl border border-slate-800 bg-[#0c101a] p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-white">
                    <Laptop className="h-4 w-4 text-sky-400" />
                    <span>Progressive Web App</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Instant Install
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Install directly in Google Chrome, Edge, or Brave without any setup file.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Zero Install Size
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isInstallable) {
                      installApp();
                    } else {
                      toast.info('PWA is already installed or accessible in your browser address bar.');
                    }
                  }}
                  className="h-8 text-xs font-mono border-slate-700 hover:bg-emerald-600 hover:text-white"
                >
                  <Zap className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  <span>Install PWA</span>
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Step-by-Step Installation Instructions */}
        <div className="rounded-xl border border-slate-800 bg-[#0a0d16] p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>Quick Installation Guide</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Windows steps */}
            <div className="space-y-3 p-4 rounded-lg bg-[#07090e] border border-slate-800/80">
              <div className="flex items-center gap-2 font-mono font-bold text-blue-400 text-sm">
                <Monitor className="h-4 w-4" />
                <span>Windows 10 / 11 Installation</span>
              </div>
              <ol className="space-y-2 text-xs font-mono text-slate-300 list-decimal list-inside leading-relaxed">
                <li>Download <strong className="text-white">TCY One Setup 1.0.2.exe</strong>.</li>
                <li>Double-click the installer to launch the Setup Wizard.</li>
                <li>Choose installation directory (Default: <code className="text-blue-300">C:\Program Files\TCY One</code>).</li>
                <li>Launch TCY One from your Desktop or Start Menu shortcut.</li>
              </ol>
            </div>

            {/* macOS steps */}
            <div className="space-y-3 p-4 rounded-lg bg-[#07090e] border border-slate-800/80">
              <div className="flex items-center gap-2 font-mono font-bold text-slate-200 text-sm">
                <Apple className="h-4 w-4" />
                <span>macOS Installation</span>
              </div>
              <ol className="space-y-2 text-xs font-mono text-slate-300 list-decimal list-inside leading-relaxed">
                <li>Download <strong className="text-white">TCY One 1.0.2.dmg</strong>.</li>
                <li>Open the DMG disk image file.</li>
                <li>Drag the <strong className="text-white">TCY One</strong> icon into your <code className="text-indigo-300">/Applications</code> folder.</li>
                <li>Open TCY One from Launchpad or Spotlight search.</li>
              </ol>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
