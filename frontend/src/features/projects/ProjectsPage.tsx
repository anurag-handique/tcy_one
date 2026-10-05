import * as React from 'react';
import {
  FolderKanban,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Project, PriorityLevel, ProjectStatus } from '@/types';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';

export function ProjectsPage() {
  const { projects, tasks, profiles, createProject } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();

  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || activeRole === 'super_admin';

  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [priority, setPriority] = React.useState<PriorityLevel>('medium');
  const [status, setStatus] = React.useState<ProjectStatus>('active');
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = React.useState(new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [budget, setBudget] = React.useState('50000');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Project Name and Code required');
      return;
    }

    createProject({
      name,
      code: code.toUpperCase(),
      description,
      client_name: clientName,
      priority,
      status,
      start_date: startDate,
      due_date: dueDate,
      manager_id: currentUser.id,
      budget: parseFloat(budget) || 0,
    });

    toast.success('Project created');
    setCreateModalOpen(false);
    setName('');
    setCode('');
    setDescription('');
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight font-mono">
            PROJECT WORKSPACES
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Client deliverables, team allocations, milestones, and project budgets.
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Button>
        )}
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="desktop-panel rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-[#141824] border border-[#232a3a] flex items-center justify-center text-slate-500">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono">NO PROJECT WORKSPACES</h3>
            <p className="text-xs text-slate-400 mt-0.5">Create your first client or internal deliverable workspace.</p>
          </div>
          {isManagerOrAdmin && (
            <Button size="sm" onClick={() => setCreateModalOpen(true)} className="h-7 text-xs bg-blue-600 gap-1 font-mono">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.map((proj) => {
          const projTasks = tasks.filter((t) => t.project_id === proj.id);
          const doneTasks = projTasks.filter((t) => t.status === 'done');
          const completionPct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
          const manager = profiles.find((p) => p.id === proj.manager_id);
          const prio = getPriorityColor(proj.priority);
          const stat = getStatusColor(proj.status);

          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProject(proj)}
              className="desktop-panel rounded-lg p-3.5 flex flex-col justify-between cursor-pointer hover:border-[#2f384c] transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-[#161a24] px-1.5 py-0.2 rounded border border-[#212735]">
                    {proj.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded border uppercase ${prio.bg}`}>
                      {proj.priority}
                    </span>
                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded border uppercase ${stat.text} ${stat.border}`}>
                      {proj.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                  {proj.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>

                {proj.client_name && (
                  <span className="text-[10px] text-slate-400 font-mono block mt-1.5">
                    Client: {proj.client_name}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#1b202c] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Progress</span>
                  <span className="text-slate-200">{doneTasks.length}/{projTasks.length} ({completionPct}%)</span>
                </div>
                <Progress value={completionPct} indicatorColor="bg-blue-500" className="h-1" />

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar name={manager?.full_name || 'Lead'} avatarUrl={manager?.avatar_url} size="sm" className="h-4 w-4 text-[8px]" />
                    <span>{manager?.full_name?.split(' ')[0]}</span>
                  </div>
                  <span>{proj.due_date ? formatDate(proj.due_date, 'dd MMM yyyy') : 'Ongoing'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <Dialog open={Boolean(selectedProject)} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-xl bg-[#0e1118] border-[#1f2533] p-5">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1 font-mono text-[10px]">
                <span className="bg-[#181d28] px-1.5 py-0.5 rounded text-slate-300 border border-[#252c3c]">
                  {selectedProject.code}
                </span>
                <span className={`px-1.5 py-0.5 rounded border uppercase ${getPriorityColor(selectedProject.priority).bg}`}>
                  {selectedProject.priority}
                </span>
              </div>
              <DialogTitle className="text-base text-white">{selectedProject.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <p className="bg-[#0b0e14] p-2.5 rounded border border-[#1b202c] text-slate-300 leading-relaxed text-[11px]">
                {selectedProject.description}
              </p>

              <div className="grid grid-cols-3 gap-2 bg-[#0b0e14] p-2 rounded border border-[#1b202c] font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block uppercase">Start</span>
                  <span className="text-slate-200">{formatDate(selectedProject.start_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase">Target Due</span>
                  <span className="text-slate-200">{formatDate(selectedProject.due_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase">Budget</span>
                  <span className="text-emerald-400 font-bold">${(selectedProject.budget || 0).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
                  Tasks ({tasks.filter((t) => t.project_id === selectedProject.id).length})
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {tasks
                    .filter((t) => t.project_id === selectedProject.id)
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded bg-[#0b0e14] border border-[#1b202c] text-[11px]">
                        <span className="text-slate-200 truncate">{t.title}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase bg-[#141822] px-1 py-0.2 rounded border border-[#212735]">
                          {t.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Project Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5">
          <DialogHeader>
            <DialogTitle className="text-base text-white">Create Project Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-mono uppercase text-slate-400">Project Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" required />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Code</label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c] font-mono uppercase" required />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Client</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 bg-[#0b0e14] border-[#1b202c] text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-7 w-full rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono">
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400">Due Date</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-7 mt-1 bg-[#0b0e14] border-[#1b202c]" />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)} className="h-7 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs bg-blue-600">
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
