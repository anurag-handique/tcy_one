import * as React from 'react';
import {
  FolderKanban,
  Plus,
  Clock,
  CheckCircle2,
  Edit,
  Trash2,
  Search,
  Filter,
  ShieldAlert,
  User,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Project, PriorityLevel, ProjectStatus } from '@/types';
import { formatDate, formatRupees, getPriorityColor, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';

export function ProjectsPage() {
  const { projects, tasks, profiles, createProject, updateProject, deleteProject } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { setTaskModalOpen } = useUIStore();

  const isSuperAdmin = activeRole === 'super_admin';
  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || isSuperAdmin;

  // Search and Filter State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');

  // Modal States
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);

  // Form State for Create (Budget is optional)
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [priority, setPriority] = React.useState<PriorityLevel>('medium');
  const [status, setStatus] = React.useState<ProjectStatus>('active');
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = React.useState(new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0]);
  const [budget, setBudget] = React.useState('');
  const [managerId, setManagerId] = React.useState(currentUser.id);

  // Form State for Edit (Budget is optional)
  const [editName, setEditName] = React.useState('');
  const [editCode, setEditCode] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editClientName, setEditClientName] = React.useState('');
  const [editPriority, setEditPriority] = React.useState<PriorityLevel>('medium');
  const [editStatus, setEditStatus] = React.useState<ProjectStatus>('active');
  const [editStartDate, setEditStartDate] = React.useState('');
  const [editDueDate, setEditDueDate] = React.useState('');
  const [editBudget, setEditBudget] = React.useState('');
  const [editManagerId, setEditManagerId] = React.useState('');

  const openEditModal = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setEditName(proj.name);
    setEditCode(proj.code);
    setEditDescription(proj.description || '');
    setEditClientName(proj.client_name || '');
    setEditPriority(proj.priority);
    setEditStatus(proj.status);
    setEditStartDate(proj.start_date ? proj.start_date.split('T')[0] : '');
    setEditDueDate(proj.due_date ? proj.due_date.split('T')[0] : '');
    setEditBudget(proj.budget && proj.budget > 0 ? proj.budget.toString() : '');
    setEditManagerId(proj.manager_id || currentUser.id);
    setEditModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Project Name and Code required');
      return;
    }

    createProject({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      client_name: clientName.trim(),
      priority,
      status,
      start_date: startDate,
      due_date: dueDate,
      manager_id: managerId || currentUser.id,
      budget: budget.trim() ? parseFloat(budget) : 0,
    });

    toast.success(`Project "${name.trim()}" created successfully!`);
    setCreateModalOpen(false);
    setName('');
    setCode('');
    setDescription('');
    setClientName('');
    setBudget('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editName.trim() || !editCode.trim()) {
      toast.error('Project Name and Code required');
      return;
    }

    const updates: Partial<Project> = {
      name: editName.trim(),
      code: editCode.trim().toUpperCase(),
      description: editDescription.trim(),
      client_name: editClientName.trim(),
      priority: editPriority,
      status: editStatus,
      start_date: editStartDate,
      due_date: editDueDate,
      manager_id: editManagerId,
      budget: editBudget.trim() ? parseFloat(editBudget) : 0,
    };

    updateProject(editingProject.id, updates);

    // Also update selectedProject if currently viewing
    if (selectedProject && selectedProject.id === editingProject.id) {
      setSelectedProject({ ...selectedProject, ...updates });
    }

    toast.success(`Project "${editName.trim()}" updated successfully!`);
    setEditModalOpen(false);
    setEditingProject(null);
  };

  const handleDeleteProject = () => {
    if (!editingProject) return;
    deleteProject(editingProject.id);
    toast.success(`Project "${editingProject.name}" deleted`);
    setDeleteConfirmOpen(false);
    setEditModalOpen(false);
    if (selectedProject?.id === editingProject.id) {
      setSelectedProject(null);
    }
    setEditingProject(null);
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.client_name && p.client_name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter;

    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              PROJECT WORKSPACES
            </h1>
            {isSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full">
                <Sparkles className="h-2.5 w-2.5" />
                Super Admin Access
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSuperAdmin
              ? 'Unrestricted access to list, view, create, edit, reassign, and manage all company projects & budgets.'
              : 'Client deliverables, team allocations, milestones, and project budgets.'}
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setManagerId(currentUser.id);
              setCreateModalOpen(true);
            }}
            className="h-7.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1 font-mono rounded-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0b0e14] p-2.5 border border-[#1b202c]">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, code, client..."
              className="pl-8 h-7 text-xs bg-[#10141e] border-[#1f2637]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-7 bg-[#10141e] border border-[#1f2637] px-2 text-xs text-slate-200 rounded-none focus:outline-none"
            >
              <option value="all">All ({projects.length})</option>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-7 bg-[#10141e] border border-[#1f2637] px-2 text-xs text-slate-200 rounded-none focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="desktop-panel p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 bg-[#141824] border border-[#232a3a] flex items-center justify-center text-slate-500">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono">NO PROJECTS FOUND</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'No projects matching your search filter.'
                : 'Create your first client or internal deliverable workspace.'}
            </p>
          </div>
          {isManagerOrAdmin && (
            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-7 text-xs bg-blue-600 gap-1 font-mono rounded-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProjects.map((proj) => {
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
                className="desktop-panel p-3.5 flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-all group relative border border-[#1b202c] bg-[#0c1018]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-[#161a24] px-1.5 py-0.2 rounded-none border border-[#212735]">
                      {proj.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded-none border uppercase ${prio.bg}`}>
                        {proj.priority}
                      </span>
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded-none border uppercase ${stat.text} ${stat.border}`}>
                        {proj.status.replace('_', ' ')}
                      </span>

                      {/* Quick Edit button for Super Admin / Managers */}
                      {isManagerOrAdmin && (
                        <button
                          type="button"
                          onClick={(e) => openEditModal(proj, e)}
                          title="Edit Project"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      )}
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
                    <span className="text-slate-200">
                      {doneTasks.length}/{projTasks.length} ({completionPct}%)
                    </span>
                  </div>
                  <Progress value={completionPct} indicatorColor="bg-blue-500" className="h-1 rounded-none" />

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                    <div className="flex items-center gap-1.5" title={`Manager: ${manager?.full_name || 'Unassigned'}`}>
                      <UserAvatar
                        name={manager?.full_name || 'Lead'}
                        avatarUrl={manager?.avatar_url}
                        size="sm"
                        className="h-4 w-4 text-[8px]"
                      />
                      <span>{manager?.full_name || 'Unassigned'}</span>
                    </div>
                    <span>{proj.due_date ? formatDate(proj.due_date, 'dd MMM yyyy') : 'Ongoing'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Project Detail Modal */}
      {/* ===================================================================== */}
      {selectedProject && (
        <Dialog open={Boolean(selectedProject)} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-2xl bg-[#0e1118] border-[#1f2533] p-5">
            <DialogHeader className="border-b border-[#1b202c] pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-[#181d28] px-2 py-0.5 font-mono text-xs font-bold text-blue-400 border border-[#252c3c]">
                  {selectedProject.code}
                </span>
                <span className={`px-1.5 py-0.5 font-mono text-[9px] border uppercase ${getPriorityColor(selectedProject.priority).bg}`}>
                  {selectedProject.priority}
                </span>
                <span className={`px-1.5 py-0.5 font-mono text-[9px] border uppercase ${getStatusColor(selectedProject.status).text} ${getStatusColor(selectedProject.status).border}`}>
                  {selectedProject.status.replace('_', ' ')}
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-white font-mono mt-1">
                {selectedProject.name}
              </DialogTitle>
              {selectedProject.client_name && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Client: <strong className="text-slate-200">{selectedProject.client_name}</strong>
                </span>
              )}
            </DialogHeader>

            <div className="space-y-3.5 pt-2 text-xs">
              {/* Description */}
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Scope & Objectives
                </span>
                <p className="bg-[#0b0e14] p-3 border border-[#1b202c] text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap">
                  {selectedProject.description || 'No detailed scope description provided.'}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0b0e14] p-2.5 border border-[#1b202c] font-mono text-[10px]">
                <div>
                  <span className="text-slate-500 block uppercase">Project Lead</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <UserAvatar
                      name={profiles.find((p) => p.id === selectedProject.manager_id)?.full_name || 'Lead'}
                      size="sm"
                      className="h-4 w-4 text-[8px]"
                    />
                    <span className="text-slate-200 font-semibold truncate">
                      {profiles.find((p) => p.id === selectedProject.manager_id)?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase">Start Date</span>
                  <span className="text-slate-200 font-semibold block mt-1">
                    {formatDate(selectedProject.start_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase">Due Date</span>
                  <span className="text-slate-200 font-semibold block mt-1">
                    {formatDate(selectedProject.due_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase">Budget (Optional)</span>
                  <span className="text-emerald-400 font-bold block mt-1 font-mono">
                    {selectedProject.budget && selectedProject.budget > 0 ? formatRupees(selectedProject.budget) : '—'}
                  </span>
                </div>
              </div>

              {/* Tasks in Project */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400">
                    Allocated Tasks ({tasks.filter((t) => t.project_id === selectedProject.id).length})
                  </span>
                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setTaskModalOpen(true)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {tasks.filter((t) => t.project_id === selectedProject.id).length === 0 ? (
                    <div className="p-4 text-center text-slate-500 bg-[#0b0e14] border border-[#1b202c] text-xs font-mono">
                      No tasks allocated to this project yet.
                    </div>
                  ) : (
                    tasks
                      .filter((t) => t.project_id === selectedProject.id)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2 bg-[#0b0e14] border border-[#1b202c] text-xs"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span
                              className={`h-2 w-2 shrink-0 ${
                                t.status === 'done'
                                  ? 'bg-emerald-400'
                                  : t.status === 'in_progress'
                                  ? 'bg-blue-400'
                                  : 'bg-slate-500'
                              }`}
                            />
                            <span className="text-slate-200 truncate">{t.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
                            <span className="uppercase text-slate-400 bg-[#141822] px-1.5 py-0.2 border border-[#212735]">
                              {t.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#1b202c] flex items-center justify-between sm:justify-between w-full">
              <div>
                {isManagerOrAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingProject(selectedProject);
                      setDeleteConfirmOpen(true);
                    }}
                    className="h-7 text-xs gap-1 border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 font-mono"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isManagerOrAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(selectedProject)}
                    className="h-7 text-xs gap-1 border-[#2a3449] bg-[#141924] hover:bg-[#1c2333] text-slate-200 font-mono"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Project</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProject(null)}
                  className="h-7 text-xs border-[#232b3c] bg-[#121620] font-mono text-slate-200"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ===================================================================== */}
      {/* Create Project Modal */}
      {/* ===================================================================== */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5">
          <DialogHeader>
            <DialogTitle className="text-base text-white font-mono font-bold">
              Create Project Workspace
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Project Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Enterprise Cloud Migration"
                  className="h-7 bg-[#0b0e14] border-[#1b202c]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Code *
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ECM-01"
                  className="h-7 bg-[#0b0e14] border-[#1b202c] font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Client / Entity
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Internal / Client Corp"
                  className="h-7 bg-[#0b0e14] border-[#1b202c]"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Project Lead (Any Team Member)
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="h-7 w-full border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono rounded-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.designation_title || p.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Description & Scope
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="High-level milestones, deliverables, tech stack..."
                className="bg-[#0b0e14] border-[#1b202c] text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="h-7 w-full border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono rounded-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="h-7 w-full border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono rounded-none"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Budget (₹ - Optional)</label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="h-7 bg-[#0b0e14] border-[#1b202c] font-mono placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-7 bg-[#0b0e14] border-[#1b202c]"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Target Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-7 bg-[#0b0e14] border-[#1b202c]"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="h-7 text-xs border-[#232b3c] bg-[#121620]"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-500 font-mono">
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* Edit Project Modal (Super Admin / Manager) */}
      {/* ===================================================================== */}
      {editingProject && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md bg-[#0e1118] border-[#1f2533] p-5">
            <DialogHeader className="border-b border-[#1b202c] pb-2.5">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base text-white font-mono font-bold flex items-center gap-1.5">
                  <Edit className="h-4 w-4 text-blue-400" />
                  <span>Edit Project Workspace</span>
                </DialogTitle>
                <span className="bg-[#181d28] px-1.5 py-0.2 font-mono text-[10px] text-blue-400 border border-[#252c3c]">
                  {editingProject.code}
                </span>
              </div>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Project Name *</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 bg-[#0b0e14] border-[#1b202c]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Code *</label>
                  <Input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="h-7 bg-[#0b0e14] border-[#1b202c] font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Client / Entity</label>
                  <Input
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="h-7 bg-[#0b0e14] border-[#1b202c]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Project Lead (Any Team Member)
                  </label>
                  <select
                    value={editManagerId}
                    onChange={(e) => setEditManagerId(e.target.value)}
                    className="h-7 w-full border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono rounded-none"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.designation_title || p.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Description & Scope</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="bg-[#0b0e14] border-[#1b202c] text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="h-7 w-full border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono rounded-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="h-7 w-full border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-white font-mono rounded-none"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Budget (₹ - Optional)</label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="h-7 bg-[#0b0e14] border-[#1b202c] font-mono placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="h-7 bg-[#0b0e14] border-[#1b202c]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="h-7 bg-[#0b0e14] border-[#1b202c]"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="h-7 text-xs border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-600 hover:text-white gap-1 font-mono"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditModalOpen(false)}
                    className="h-7 text-xs border-[#232b3c] bg-[#121620]"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-500 font-mono">
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ===================================================================== */}
      {/* Delete Confirmation Modal */}
      {/* ===================================================================== */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm bg-[#0e1118] border-rose-500/30 p-5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle className="text-sm font-bold font-mono text-white">
                Delete Project Workspace
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-xs text-slate-300 leading-relaxed py-2">
            Are you sure you want to permanently delete{' '}
            <strong className="text-white font-mono">"{editingProject?.name}"</strong>? This will remove all
            workspace configurations.
          </p>
          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-7 text-xs border-[#232b3c] bg-[#121620]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteProject}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
