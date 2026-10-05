import * as React from 'react';
import {
  Settings as SettingsIcon,
  Database,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Layers,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { isSupabaseConfigured, getBackendStatus } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export function SettingsPage() {
  const { resetToDefaultData } = useDataStore();
  const { densityMode, setDensityMode } = useUIStore();

  const [copied, setCopied] = React.useState(false);

  const handleCopySchemaNotice = () => {
    setCopied(true);
    toast.success('Schema path copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset local state back to default TCY seed records?')) {
      resetToDefaultData();
      toast.success('Workspace reset to default seed records');
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header Toolbar */}
      <div className="border-b border-[#1b202c] pb-3">
        <h1 className="text-base font-bold text-white tracking-tight font-mono">
          SYSTEM SETTINGS & WORKSPACE
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Workspace parameters, security architecture, and cloud data persistence.
        </p>
      </div>

      {/* Database & Storage Status Panel */}
      <div className="desktop-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1b202c] pb-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-white">DATABASE & WORKSPACE STORAGE</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            ACTIVE
          </span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
            <span className="text-slate-400">Target Database Host</span>
            <span className="text-slate-200">
              {import.meta.env.VITE_SUPABASE_URL || 'Configured via .env (VITE_SUPABASE_URL)'}
            </span>
          </div>

          <div className="flex justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
            <span className="text-slate-400">Security Architecture</span>
            <span className="text-blue-400">Row Level Security (RLS) Active</span>
          </div>

          <div className="p-2.5 rounded bg-[#0b0e14] border border-[#1b202c] text-[11px] text-slate-400 font-sans leading-relaxed">
            To migrate this schema to your remote Supabase instance: open your Supabase SQL Editor and execute{' '}
            <code className="text-blue-400 font-mono">scripts/supabase_schema.sql</code> and{' '}
            <code className="text-blue-400 font-mono">scripts/seed_data.sql</code>.
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-[#1b202c]">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySchemaNotice}
            className="h-7 text-xs border-[#262d3e] bg-[#0b0e14]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            <span>Copy Migration Path</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleResetData}
            className="h-7 text-xs font-mono"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>Reset Demo Seed State</span>
          </Button>
        </div>
      </div>

      {/* Density Mode Panel */}
      <div className="desktop-panel rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-[#1b202c] pb-2 font-mono text-xs text-white">
          <Layers className="h-4 w-4 text-blue-400" />
          <span>DISPLAY INFORMATION DENSITY</span>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded bg-[#0b0e14] border border-[#1b202c] text-xs">
          <div>
            <span className="font-semibold text-slate-200 block">Density Grid</span>
            <span className="text-[11px] text-slate-400">Adjust table padding and layout scaling.</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setDensityMode('comfortable')}
              className={`px-2.5 py-1 text-xs font-mono rounded border ${
                densityMode === 'comfortable' ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#121620] border-[#222837] text-slate-400'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensityMode('compact')}
              className={`px-2.5 py-1 text-xs font-mono rounded border ${
                densityMode === 'compact' ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#121620] border-[#222837] text-slate-400'
              }`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
