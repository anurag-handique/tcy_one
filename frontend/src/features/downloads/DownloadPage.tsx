import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  Bell,
  HardDrive,
  Laptop,
  ArrowDownToLine,
} from 'lucide-react';
import { WindowsLogo, AppleLogo } from '@/components/icons/PlatformIcons';
import { useDataStore } from '@/stores/dataStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { AppRelease, DesktopPlatform } from '@/types';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import appIcon from '@/assets/app-icon.png';

export function DownloadPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { appReleases, fetchAppReleases } = useDataStore();
  const { isInstallable, installApp } = usePWAInstall();

  // Auto-detect Operating System
  const [selectedOS, setSelectedOS] = React.useState<DesktopPlatform>('windows');

  React.useEffect(() => {
    fetchAppReleases();

    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('mac') || ua.includes('darwin')) {
        setSelectedOS('macos');
      } else {
        setSelectedOS('windows');
      }
    }
  }, [fetchAppReleases]);

  const windowsRelease = appReleases.find((r) => r.platform === 'windows');
  const macRelease = appReleases.find((r) => r.platform === 'macos');

  const activeRelease = selectedOS === 'macos' ? macRelease : windowsRelease;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return selectedOS === 'macos' ? '238.6 MB' : '94.5 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = (platform: DesktopPlatform) => {
    const release = platform === 'macos' ? macRelease : windowsRelease;
    const defaultFilename = platform === 'macos' ? 'TCY_One_1.0.2.dmg' : 'TCY_One_Setup_1.0.2.exe';
    const defaultR2Url = `https://pub-75125c1dec6e471f88324befd8b64812.r2.dev/releases/${defaultFilename}`;
    const targetUrl = release?.file_url && release.file_url !== '#' && release.file_url !== '' ? release.file_url : defaultR2Url;

    toast.success(`Starting download for ${release?.file_name || defaultFilename}...`);
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = release?.file_name || defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen w-full bg-[#07090E] text-slate-100 flex flex-col items-center justify-between p-6 sm:p-10 lg:p-12 select-none overflow-y-auto">
      
      {/* Background Subtle Ambient Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-3xl mx-auto space-y-10 relative z-10">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/60 border border-slate-800/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isAuthenticated ? 'Back to Workspace' : 'Sign In to TCY One'}</span>
          </button>
        </div>

        {/* Minimal Hero Section with Logo */}
        <div className="text-center space-y-4 pt-2">
          <div className="flex justify-center">
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-b from-[#161c2c] to-[#0d121c] border border-slate-700/60 shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(59,130,246,0.2)]">
              <img
                src={appIcon}
                alt="TCY ONE Desktop App Icon"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-contain filter drop-shadow-md"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
              TCY ONE for Desktop
            </h1>
            <p className="text-sm text-slate-400 font-mono max-w-md mx-auto leading-relaxed">
              Fast, focused workspace with offline resilience, native notifications, and seamless attendance punch.
            </p>
          </div>
        </div>

        {/* Platform Selector Switch with Official OS Logos */}
        <div className="flex justify-center">
          <div className="p-1 rounded-xl bg-[#0e131d] border border-slate-800 flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setSelectedOS('windows')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedOS === 'windows'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <WindowsLogo className="h-3.5 w-3.5 fill-current" />
              <span>Windows</span>
            </button>

            <button
              onClick={() => setSelectedOS('macos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedOS === 'macos'
                  ? 'bg-blue-600 text-white font-semibold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <AppleLogo className="h-3.5 w-3.5 fill-current" />
              <span>macOS</span>
            </button>
          </div>
        </div>

        {/* Primary Download Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0e131e] to-[#080b11] p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Left Info with Official OS Logo */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                {selectedOS === 'macos' ? (
                  <AppleLogo className="h-5 w-5 text-slate-100 fill-current" />
                ) : (
                  <WindowsLogo className="h-5 w-5 text-sky-400 fill-current" />
                )}
                <span className="text-base font-bold text-white font-mono">
                  {selectedOS === 'macos' ? 'TCY One for macOS' : 'TCY One for Windows'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {activeRelease?.version ? `v${activeRelease.version}` : 'v1.0.2'}
                </span>
              </div>

              <p className="text-xs text-slate-400 font-mono">
                {selectedOS === 'macos'
                  ? 'Universal DMG (Apple Silicon M1/M2/M3/M4 & Intel)'
                  : '64-bit NSIS Setup Wizard (Windows 10 & 11)'}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs font-mono text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                  <span>{formatFileSize(activeRelease?.file_size)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Safe</span>
                </span>
              </div>
            </div>

            {/* Right CTA Button with Official OS Logo */}
            <Button
              onClick={() => handleDownload(selectedOS)}
              size="lg"
              className="h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-sm shadow-[0_0_25px_rgba(37,99,235,0.4)] flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              {selectedOS === 'macos' ? (
                <AppleLogo className="h-4 w-4 fill-current" />
              ) : (
                <WindowsLogo className="h-4 w-4 fill-current" />
              )}
              <span>
                Download for {selectedOS === 'macos' ? 'macOS' : 'Windows'}
              </span>
              <ArrowDownToLine className="h-4 w-4 opacity-75 ml-0.5" />
            </Button>

          </div>

          {/* Secondary Options */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <span className="text-slate-400">
              Need another format?
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload(selectedOS === 'macos' ? 'windows' : 'macos')}
                className="hover:text-blue-400 transition-colors flex items-center gap-1.5"
              >
                {selectedOS === 'macos' ? (
                  <WindowsLogo className="h-3 w-3 fill-current text-sky-400" />
                ) : (
                  <AppleLogo className="h-3 w-3 fill-current text-slate-300" />
                )}
                <span>Download for {selectedOS === 'macos' ? 'Windows (.exe)' : 'macOS (.dmg)'}</span>
              </button>

              <span className="text-slate-700">|</span>

              <button
                onClick={() => {
                  if (isInstallable) {
                    installApp();
                  } else {
                    toast.info('PWA is installable via browser address bar or already active.');
                  }
                }}
                className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>Web PWA</span>
              </button>
            </div>
          </div>

        </div>

        {/* Minimal 3-Pill Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a0d15] space-y-1.5">
            <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-bold">
              <Bell className="h-3.5 w-3.5" />
              <span>Native Notifications</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-normal">
              Instant desktop alerts for tasks, standups, and meetings.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a0d15] space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
              <Zap className="h-3.5 w-3.5" />
              <span>Instant Punch In</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-normal">
              Zero-latency attendance check-in right from system tray.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a0d15] space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Offline Resilience</span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 leading-normal">
              Work uninterrupted with automated offline state cache.
            </p>
          </div>
        </div>

        {/* Minimal Setup Steps */}
        <div className="p-5 rounded-xl border border-slate-800/80 bg-[#0a0d15] space-y-3">
          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            Quick Installation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-slate-200">Download</strong>
                <p className="text-[11px] text-slate-400">Get the installer file for your device.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-slate-200">Run Installer</strong>
                <p className="text-[11px] text-slate-400">Follow the standard setup wizard.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-slate-200">Sign In</strong>
                <p className="text-[11px] text-slate-400">Enter your company email to start.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="text-center text-[11px] font-mono text-slate-400 pt-2 pb-6">
          © {new Date().getFullYear()} The Code Yogi. All rights reserved.
        </div>

      </div>

    </div>
  );
}
