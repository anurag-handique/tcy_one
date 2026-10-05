import * as React from 'react';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { toast } from 'sonner';

export function LoginModal() {
  const { isAuthenticated, login, isLoadingAuth } = useAuthStore();
  const { fetchSupabaseData } = useDataStore();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter your email and password');
      return;
    }

    setSubmitting(true);
    const result = await login(cleanEmail, cleanPassword);
    setSubmitting(false);

    if (result.success) {
      toast.success('Welcome to TCY One');
      fetchSupabaseData();
    } else {
      setError(result.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row items-stretch justify-between bg-[#07090e] select-none animate-in fade-in-0 duration-200 overflow-hidden">
      
      {/* Left Section: Full Height Neumorphic Oval Panel Extended to the Right */}
      <div
        className="w-full md:w-[55%] lg:w-[56%] h-full bg-gradient-to-r from-white via-[#fcfdfe] to-[#f1f4f9] border-r border-slate-200/40 rounded-b-[40px] md:rounded-b-none flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative select-none z-20"
        style={{
          borderTopRightRadius: '300px 50%',
          borderBottomRightRadius: '300px 50%',
          boxShadow: '22px 0px 50px rgba(0,0,0,0.7), 8px 0px 20px rgba(0,0,0,0.45), inset -10px 0px 24px rgba(195,205,225,0.4), inset 3px 0px 10px rgba(255,255,255,0.95)',
        }}
      >
        
        {/* Top spacer / header balance */}
        <div className="hidden md:block h-6" />

        {/* Center: Authentic TCY Logo */}
        <div className="flex-1 flex items-center justify-center py-8">
          <img
            src="/logo_black_without_bg.png"
            alt="TCY Logo"
            className="w-48 sm:w-72 md:w-80 lg:w-[460px] max-w-[500px] object-contain pointer-events-none select-none"
          />
        </div>

        {/* Bottom of Left Section: Company Details & Neumorphic Version Capsule */}
        <div className="w-full flex flex-col items-center justify-center gap-2 text-center text-[11px] font-mono text-slate-600 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>© 2026 TCY One</span>
            <span>•</span>
            <span>Developed by TCY Consulting Private Limited</span>
            <span>•</span>
            <a
              href="https://thecodeyogi.com/"
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-blue-600 hover:underline transition-colors"
            >
              thecodeyogi.com
            </a>
          </div>

          {/* Neumorphic Capsule Badge */}
          <div className="inline-flex items-center px-3 py-0.5 rounded-full bg-[#f3f4f6] text-[10px] font-mono font-medium text-slate-700 shadow-[2px_2px_4px_#d1d5db,-2px_-2px_4px_#ffffff] border border-slate-200/60 tracking-wider">
            v1.0.4
          </div>
        </div>

      </div>

      {/* Right Section: Dark Area with Centered White Neumorphic Login Card */}
      <div className="w-full md:w-[45%] lg:w-[44%] h-full flex items-center justify-center p-6 sm:p-8 relative z-10">
        <div className="w-full max-w-[360px]">
          <div
            className="relative overflow-hidden rounded-none border border-slate-200/80 bg-gradient-to-br from-white via-[#fcfdfe] to-[#f2f5f9] p-6 sm:p-7 space-y-5"
            style={{
              boxShadow: '20px 20px 48px rgba(0,0,0,0.65), -6px -6px 20px rgba(255,255,255,0.05), inset 1px 1px 2px #ffffff',
            }}
          >

            {/* Card Brand Header with Animated Typography */}
            <div className="relative flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-[#f3f5f9] border border-slate-200 p-1.5 shadow-[inset_1px_1px_2px_#d1d5db,inset_-1px_-1px_2px_#ffffff]">
                <img
                  src="/favicon (1).ico"
                  alt="TCY Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-mono text-xl tracking-tight leading-none">
                  <span className="font-extrabold text-slate-900 tracking-wider">
                    TCY
                  </span>
                  <span className="font-black bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent animate-text-shimmer tracking-widest">
                    ONE
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-mono tracking-tight font-medium">
                  Unified Enterprise Work Platform
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="relative rounded-none border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 font-mono animate-in fade-in duration-150">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="relative space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-semibold">
                  Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@thecodeyogi.com"
                  autoFocus
                  required
                  autoComplete="email"
                  className="h-8 w-full rounded-none border border-slate-300/80 bg-[#f0f3f8] px-3 text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-[inset_2px_2px_4px_#d1d5db,inset_-2px_-2px_4px_#ffffff] focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-semibold">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="h-8 w-full rounded-none border border-slate-300/80 bg-[#f0f3f8] pl-3 pr-8 text-xs text-slate-900 placeholder:text-slate-400 font-mono shadow-[inset_2px_2px_4px_#d1d5db,inset_-2px_-2px_4px_#ffffff] focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600/30 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isLoadingAuth}
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-none bg-blue-600 px-4 text-xs font-semibold text-white font-mono hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[2px_2px_6px_rgba(37,99,235,0.4)] mt-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
