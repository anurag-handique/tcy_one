import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Download,
  BarChart3,
  CheckCircle2,
  Clock,
  Calendar,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export function ReportsPage() {
  const { profiles, attendance, tasks, projects, leaveRequests } = useDataStore();

  const attendanceData = profiles.map((p) => {
    const pAtt = attendance.filter((a) => a.employee_id === p.id);
    const totalHours = pAtt.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
    return {
      name: p.full_name.split(' ')[0],
      hours: Math.round(totalHours * 10) / 10,
      days: pAtt.length,
    };
  });

  const taskStatusData = [
    { name: 'To Do', value: tasks.filter((t) => t.status === 'todo').length, color: '#475569' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length, color: '#2563eb' },
    { name: 'Review', value: tasks.filter((t) => t.status === 'review').length, color: '#d97706' },
    { name: 'Done', value: tasks.filter((t) => t.status === 'done').length, color: '#059669' },
  ];

  const projectProgressData = projects.map((p) => {
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    const done = pTasks.filter((t) => t.status === 'done').length;
    return {
      name: p.code,
      total: pTasks.length,
      completed: done,
      rate: pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0,
    };
  });

  const handleExportCSV = () => {
    const headers = 'Employee,Date,ClockIn,ClockOut,Hours,Status,Mode\n';
    const rows = attendance
      .map(
        (a) =>
          `"${profiles.find((p) => p.id === a.employee_id)?.full_name || a.employee_id}","${a.date}","${a.clock_in}","${a.clock_out || ''}",${a.total_hours},"${a.status}","${a.work_mode}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TCY_WorkHub_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Downloaded Attendance CSV');
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight font-mono">
            REPORTS & COMPLIANCE METRICS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Timesheet analysis, task burnups, project velocity, and export tools.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleExportCSV}
          className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Chart 1 */}
        <div className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1b202c] pb-2 mb-2 font-mono text-[11px] text-slate-400">
            <span>HOURS LOGGED PER EMPLOYEE</span>
            <span className="text-blue-400">HOURS</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="2 2" stroke="#161b24" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0c0e15', borderColor: '#232a38', borderRadius: '4px', fontSize: '11px' }}
                />
                <Bar dataKey="hours" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1b202c] pb-2 mb-2 font-mono text-[11px] text-slate-400">
            <span>TASK STATUS DISTRIBUTION</span>
            <span className="text-slate-400">{tasks.length} TOTAL</span>
          </div>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0c0e15', borderColor: '#232a38', borderRadius: '4px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 pr-2 text-[10px] font-mono">
              {taskStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-slate-400">({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3 */}
        <div className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1b202c] pb-2 mb-2 font-mono text-[11px] text-slate-400">
            <span>PROJECT VELOCITY (%)</span>
            <span className="text-emerald-400">COMPLETION</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectProgressData} layout="vertical">
                <CartesianGrid strokeDasharray="2 2" stroke="#161b24" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0c0e15', borderColor: '#232a38', borderRadius: '4px', fontSize: '11px' }}
                />
                <Bar dataKey="rate" fill="#059669" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive Highlights */}
        <div className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between">
          <div className="border-b border-[#1b202c] pb-2 mb-2 font-mono text-[11px] text-slate-400">
            <span>EXECUTIVE AUDIT SUMMARY</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
              <span className="text-slate-400">Squad Punctuality Rate</span>
              <span className="text-emerald-400 font-bold">98.5%</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
              <span className="text-slate-400">Standup Submission Compliance</span>
              <span className="text-blue-400 font-bold">100.0%</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
              <span className="text-slate-400">Approved Leave Total</span>
              <span className="text-amber-400 font-bold">
                {leaveRequests.filter((l) => l.status === 'approved').reduce((acc, c) => acc + c.total_days, 0)} Days
              </span>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c]">
              <span className="text-slate-400">Active Workspaces</span>
              <span className="text-purple-400 font-bold">{projects.length} Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
