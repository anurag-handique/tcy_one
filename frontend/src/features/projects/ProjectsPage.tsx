import * as React from 'react';
import {
  FolderKanban,
  LayoutGrid,
  List,
  Kanban,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  Check,
  X,
  Building2,
  CircleDashed,
  PlayCircle,
  MoreHorizontal,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  SlidersHorizontal,
  Bookmark,
  CheckSquare,
  Bug,
  Zap,
  CheckCircle,
  Circle,
  ListChecks,
  User,
  CornerDownRight,
  TrendingUp,
  Tag,
  MessageSquare,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Project, PriorityLevel, ProjectStatus, TaskStatus, Task, IssueType, Subtask } from '@/types';
import { formatDate, formatRupees, getPriorityColor, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { TeamCapacityHeatmap } from '@/components/shared/TeamCapacityHeatmap';
import { TaskActivityAuditTrail } from '@/components/shared/TaskActivityAuditTrail';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

type ViewMode = 'board' | 'grid' | 'list';
type ProjectTab = 'tasks_board' | 'tasks_list' | 'team_workload' | 'overview';

export function ProjectsPage() {
  const {
    projects,
    tasks,
    profiles,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  } = useDataStore();
  const { currentUser, activeRole } = useAuthStore();
  const { setTaskModalOpen } = useUIStore();

  const isSuperAdmin = activeRole === 'super_admin';
  const isManagerOrAdmin = activeRole === 'manager' || activeRole === 'admin' || isSuperAdmin;

  // View & Filter States
  const [viewMode, setViewMode] = React.useState<ViewMode>('board');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [myProjectsOnly, setMyProjectsOnly] = React.useState(false);

  // Selected Project Workspace Modal State
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [projectTab, setProjectTab] = React.useState<ProjectTab>('tasks_board');
  const [taskSearchQuery, setTaskSearchQuery] = React.useState('');

  // Selected Task / Issue Detail Drawer State
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');

  // Quick Task Creation inside Project Board
  const [quickTaskModalOpen, setQuickTaskModalOpen] = React.useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = React.useState('');
  const [quickTaskDesc, setQuickTaskDesc] = React.useState('');
  const [quickTaskType, setQuickTaskType] = React.useState<IssueType>('task');
  const [quickTaskStatus, setQuickTaskStatus] = React.useState<TaskStatus>('todo');
  const [quickTaskPriority, setQuickTaskPriority] = React.useState<PriorityLevel>('medium');
  const [quickTaskAssignee, setQuickTaskAssignee] = React.useState(currentUser.id);
  const [quickTaskSubtasks, setQuickTaskSubtasks] = React.useState<string[]>([]);
  const [quickSubtaskInput, setQuickSubtaskInput] = React.useState('');

  // Project Modals
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | null>(null);

  // Form State for Create Project
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

  // Form State for Edit Project
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
      toast.error('Project Name and Key required');
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
      toast.error('Project Name and Key required');
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

  // Quick Create Issue with IssueType and Subtasks
  const handleAddQuickSubtask = () => {
    if (!quickSubtaskInput.trim()) return;
    setQuickTaskSubtasks([...quickTaskSubtasks, quickSubtaskInput.trim()]);
    setQuickSubtaskInput('');
  };

  const handleRemoveQuickSubtask = (idx: number) => {
    setQuickTaskSubtasks(quickTaskSubtasks.filter((_, i) => i !== idx));
  };

  const handleQuickCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !quickTaskTitle.trim()) {
      toast.error('Issue summary is required');
      return;
    }

    const formattedSubtasks: Subtask[] = quickTaskSubtasks.map((st, i) => ({
      id: `sub-${Date.now()}-${i}`,
      title: st,
      completed: false,
    }));

    createTask({
      project_id: selectedProject.id,
      title: quickTaskTitle.trim(),
      description: quickTaskDesc.trim(),
      type: quickTaskType,
      status: quickTaskStatus,
      priority: quickTaskPriority,
      assignee_id: quickTaskAssignee || currentUser.id,
      reporter_id: currentUser.id,
      estimated_hours: 4,
      actual_hours: 0,
      tags: [quickTaskType],
      subtasks: formattedSubtasks,
    });

    toast.success(`[${quickTaskType.toUpperCase()}] Issue created in ${selectedProject.code}`);
    setQuickTaskModalOpen(false);
    setQuickTaskTitle('');
    setQuickTaskDesc('');
    setQuickTaskSubtasks([]);
    setQuickSubtaskInput('');
  };

  // Subtask Toggling in Issue Drawer
  const handleToggleSubtask = (task: Task, subtaskId: string) => {
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    updateTask(task.id, { subtasks: updatedSubtasks });
    if (selectedTask && selectedTask.id === task.id) {
      setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks });
    }
  };

  // Add Subtask on the Fly
  const handleAddSubtaskToTask = (task: Task) => {
    if (!newSubtaskTitle.trim()) return;
    const currentSubtasks = task.subtasks || [];
    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updatedSubtasks = [...currentSubtasks, newSub];
    updateTask(task.id, { subtasks: updatedSubtasks });
    if (selectedTask && selectedTask.id === task.id) {
      setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks });
    }
    setNewSubtaskTitle('');
    toast.success('Subtask added');
  };

  // Delete Subtask
  const handleDeleteSubtask = (task: Task, subtaskId: string) => {
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter((st) => st.id !== subtaskId);
    updateTask(task.id, { subtasks: updatedSubtasks });
    if (selectedTask && selectedTask.id === task.id) {
      setSelectedTask({ ...selectedTask, subtasks: updatedSubtasks });
    }
  };

  // Filter projects
  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.client_name && p.client_name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter;
      const matchLead = !myProjectsOnly || p.manager_id === currentUser.id;

      return matchSearch && matchStatus && matchPriority && matchLead;
    });
  }, [projects, searchQuery, statusFilter, priorityFilter, myProjectsOnly, currentUser.id]);

  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const planningProjectsCount = projects.filter((p) => p.status === 'planning').length;

  const STATUS_COLUMNS: { id: ProjectStatus; label: string; color: string; bg: string }[] = [
    { id: 'planning', label: 'Planning & Backlog', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { id: 'active', label: 'Active Sprints / In Flight', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { id: 'on_hold', label: 'On Hold / Blocked', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { id: 'completed', label: 'Completed / Shipped', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];

  const TASK_STATUS_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'TO DO', color: 'border-slate-600/40 text-slate-300' },
    { id: 'in_progress', label: 'IN PROGRESS', color: 'border-blue-500/40 text-blue-400' },
    { id: 'review', label: 'IN REVIEW', color: 'border-amber-500/40 text-amber-400' },
    { id: 'done', label: 'DONE', color: 'border-emerald-500/40 text-emerald-400' },
  ];

  // Helper for Project Key avatar color
  const getProjectKeyColor = (code: string) => {
    const colors = [
      'bg-blue-600/20 text-blue-400 border-blue-500/30',
      'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
      'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
      'bg-purple-600/20 text-purple-400 border-purple-500/30',
      'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    ];
    let hash = 0;
    for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Drag and Drop States for Projects & Sprint Tasks
  const [draggedProjectId, setDraggedProjectId] = React.useState<string | null>(null);
  const [draggedOverProjectCol, setDraggedOverProjectCol] = React.useState<ProjectStatus | null>(null);
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [draggedOverTaskCol, setDraggedOverTaskCol] = React.useState<TaskStatus | null>(null);

  const handleProjectDragStart = (e: React.DragEvent, projId: string) => {
    e.dataTransfer.setData('text/plain', projId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedProjectId(projId);
  };

  const handleProjectDragOver = (e: React.DragEvent, colId: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverProjectCol !== colId) {
      setDraggedOverProjectCol(colId);
    }
  };

  const handleProjectDragLeave = (e: React.DragEvent, colId: ProjectStatus) => {
    if (draggedOverProjectCol === colId) {
      setDraggedOverProjectCol(null);
    }
  };

  const handleProjectDrop = (e: React.DragEvent, colId: ProjectStatus) => {
    e.preventDefault();
    const projId = e.dataTransfer.getData('text/plain') || draggedProjectId;
    setDraggedProjectId(null);
    setDraggedOverProjectCol(null);
    if (!projId) return;

    const proj = projects.find((p) => p.id === projId);
    if (proj && proj.status !== colId) {
      updateProject(projId, { status: colId });
      const colName = STATUS_COLUMNS.find((c) => c.id === colId)?.label || colId;
      toast.success(`Project moved to ${colName}`);
    }
  };

  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleTaskDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedOverTaskCol !== colId) {
      setDraggedOverTaskCol(colId);
    }
  };

  const handleTaskDragLeave = (e: React.DragEvent, colId: TaskStatus) => {
    if (draggedOverTaskCol === colId) {
      setDraggedOverTaskCol(null);
    }
  };

  const handleTaskDrop = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDraggedOverTaskCol(null);
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== colId) {
      updateTaskStatus(taskId, colId);
      const colName = TASK_STATUS_COLUMNS.find((c) => c.id === colId)?.label || colId;
      toast.success(`Issue moved to ${colName}`);
    }
  };

  // Authentic Jira Issue Type Icon Tile & Badge (All 6 Types)
  const renderIssueTypeIcon = (type?: IssueType, showLabel: boolean = false, size: 'sm' | 'md' = 'sm') => {
    const t = (type || 'task').toLowerCase();

    const configMap: Record<string, { label: string; bg: string; icon: React.ReactNode; badgeText: string; badgeBg: string }> = {
      story: {
        label: 'Story',
        bg: 'bg-[#00875A]', // Jira Story Green
        icon: <Bookmark className="h-2.5 w-2.5 fill-white text-white" />,
        badgeText: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
      },
      task: {
        label: 'Task',
        bg: 'bg-[#0052CC]', // Jira Task Blue
        icon: <Check className="h-2.5 w-2.5 stroke-[3.5] text-white" />,
        badgeText: 'text-blue-400',
        badgeBg: 'bg-blue-500/10 border-blue-500/30',
      },
      bug: {
        label: 'Bug',
        bg: 'bg-[#DE350B]', // Jira Bug Red
        icon: <Bug className="h-2.5 w-2.5 fill-white text-white" />,
        badgeText: 'text-rose-400',
        badgeBg: 'bg-rose-500/10 border-rose-500/30',
      },
      epic: {
        label: 'Epic',
        bg: 'bg-[#6554C0]', // Jira Epic Purple
        icon: <Zap className="h-2.5 w-2.5 fill-white text-white" />,
        badgeText: 'text-purple-400',
        badgeBg: 'bg-purple-500/10 border-purple-500/30',
      },
      subtask: {
        label: 'Subtask',
        bg: 'bg-[#00A3BF]', // Jira Cyan
        icon: <CornerDownRight className="h-2.5 w-2.5 text-white stroke-[2.5]" />,
        badgeText: 'text-cyan-400',
        badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
      },
      improvement: {
        label: 'Improvement',
        bg: 'bg-[#FF8B00]', // Jira Orange
        icon: <TrendingUp className="h-2.5 w-2.5 text-white stroke-[2.5]" />,
        badgeText: 'text-orange-400',
        badgeBg: 'bg-orange-500/10 border-orange-500/30',
      },
    };

    const config = configMap[t] || configMap.task;
    const tileSize = size === 'sm' ? 'h-4 w-4 rounded-[3px]' : 'h-5 w-5 rounded-[4px]';

    return (
      <div className="inline-flex items-center gap-1.5" title={`Issue Type: ${config.label}`}>
        <div
          className={`${tileSize} ${config.bg} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105`}
        >
          {config.icon}
        </div>
        {showLabel && (
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${config.badgeText}`}>
            {config.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Jira Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight font-mono flex items-center gap-2">
                PROJECT WORKSPACES
                {isSuperAdmin && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full">
                    Super Admin
                  </span>
                )}
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Agile Kanban boards, Jira-style ticket types (Story, Task, Bug, Epic), subtask tracking, and sprint health.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isManagerOrAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setManagerId(currentUser.id);
                setCreateModalOpen(true);
              }}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 rounded-full gap-1.5 shadow-sm font-mono"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </Button>
          )}
        </div>
      </div>

      {/* Jira Filter Toolbar & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#0a0d14] p-2.5 rounded-xl border border-[#1b202c]">
        {/* Left: Search & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Pill */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by key, project, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-[#10141e] border border-[#1f2637] rounded-full pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
            />
          </div>

          {/* Quick Filter: My Projects */}
          <button
            onClick={() => setMyProjectsOnly(!myProjectsOnly)}
            className={`h-8 px-3 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 border ${
              myProjectsOnly
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-semibold'
                : 'bg-[#10141e] text-slate-400 border-[#1f2637] hover:text-white'
            }`}
          >
            <span>My Projects</span>
            {myProjectsOnly && <Check className="h-3 w-3" />}
          </button>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 bg-[#10141e] border border-[#1f2637] rounded-full px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="all">All Statuses ({projects.length})</option>
            <option value="active">Active ({activeProjectsCount})</option>
            <option value="planning">Planning ({planningProjectsCount})</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Dropdown Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 bg-[#10141e] border border-[#1f2637] rounded-full px-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#10141e] p-1 rounded-full border border-[#1f2637] self-start lg:self-auto">
          <button
            onClick={() => setViewMode('board')}
            title="Kanban Board View"
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all flex items-center gap-1.5 ${
              viewMode === 'board'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            title="Card Grid View"
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="Spreadsheet List View"
            className={`px-3 py-1 text-xs font-mono rounded-full transition-all flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. JIRA KANBAN BOARD VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {STATUS_COLUMNS.map((col) => {
            const colProjects = filteredProjects.filter((p) => p.status === col.id);
            const isOver = draggedOverProjectCol === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleProjectDragOver(e, col.id)}
                onDragLeave={(e) => handleProjectDragLeave(e, col.id)}
                onDrop={(e) => handleProjectDrop(e, col.id)}
                className={`rounded-xl border p-3 flex flex-col space-y-3 min-h-[420px] transition-all duration-200 ${
                  isOver
                    ? 'bg-[#101726] border-blue-500/70 ring-2 ring-blue-500/30 shadow-lg'
                    : 'bg-[#0a0d14] border-[#1b202c]'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#161b26]">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold uppercase tracking-wider ${col.color}`}>
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#121622] text-slate-300 border border-[#1f2637] font-semibold">
                    {colProjects.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-0.5">
                  {colProjects.length === 0 ? (
                    <div className={`py-12 text-center text-slate-500 text-xs font-mono border border-dashed rounded-lg transition-colors ${
                      isOver ? 'border-blue-500/50 bg-blue-500/5 text-blue-300' : 'border-[#1a1f2c]'
                    }`}>
                      {isOver ? 'Drop project here' : `No projects in ${col.label.toLowerCase()}`}
                    </div>
                  ) : (
                    colProjects.map((proj) => {
                      const projTasks = tasks.filter((t) => t.project_id === proj.id);
                      const doneTasks = projTasks.filter((t) => t.status === 'done');
                      const completionPct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
                      const manager = profiles.find((p) => p.id === proj.manager_id);
                      const prio = getPriorityColor(proj.priority);
                      const keyColor = getProjectKeyColor(proj.code);

                      // Count total subtasks
                      const totalSubtasks = projTasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
                      const doneSubtasks = projTasks.reduce(
                        (acc, t) => acc + (t.subtasks?.filter((s) => s.completed).length || 0),
                        0
                      );

                      const isBeingDragged = draggedProjectId === proj.id;

                      return (
                        <div
                          key={proj.id}
                          draggable
                          onDragStart={(e) => handleProjectDragStart(e, proj.id)}
                          onClick={() => setSelectedProject(proj)}
                          className={`bg-[#0f131d] hover:bg-[#131824] rounded-xl p-3.5 border border-[#1e2536] hover:border-blue-500/50 transition-all cursor-grab active:cursor-grabbing shadow-sm group space-y-3 select-none ${
                            isBeingDragged ? 'opacity-30 scale-95 ring-2 ring-blue-500/50' : ''
                          }`}
                        >
                          {/* Top: Key + Priority + Quick Edit */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${keyColor}`}>
                              {proj.code}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border uppercase font-bold ${prio.bg}`}>
                                {proj.priority}
                              </span>

                              {isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={(e) => openEditModal(proj, e)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-full"
                                  title="Edit Project"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h3 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                              {proj.name}
                            </h3>
                            {proj.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                                {proj.description}
                              </p>
                            )}
                            {proj.client_name && (
                              <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                                Client: <strong className="text-slate-300">{proj.client_name}</strong>
                              </span>
                            )}
                          </div>

                          {/* Progress Bar & Issue + Subtask Counters */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>Issues ({doneTasks.length}/{projTasks.length})</span>
                              {totalSubtasks > 0 ? (
                                <span className="text-blue-400 font-semibold">{doneSubtasks}/{totalSubtasks} subtasks</span>
                              ) : (
                                <span className="text-slate-200 font-bold">{completionPct}%</span>
                              )}
                            </div>
                            <Progress value={completionPct} indicatorColor="bg-blue-500" className="h-1.5 rounded-full bg-[#161c28]" />
                          </div>

                          {/* Footer: Manager circular avatar + Due date */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#181d2a] text-[10px] font-mono text-slate-400">
                            <div className="flex items-center gap-1.5 min-w-0" title={`Lead: ${manager?.full_name || 'Unassigned'}`}>
                              <UserAvatar
                                name={manager?.full_name || 'Lead'}
                                avatarUrl={manager?.avatar_url}
                                size="sm"
                                className="h-5 w-5 text-[8px] rounded-full border border-blue-500/30"
                              />
                              <span className="truncate max-w-[100px] text-slate-300 font-medium">
                                {manager?.full_name?.split(' ')[0] || 'Unassigned'}
                              </span>
                            </div>

                            <span className="text-slate-400">
                              {proj.due_date ? formatDate(proj.due_date, 'dd MMM') : 'Ongoing'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. JIRA GRID / CARDS VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredProjects.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 font-mono text-xs bg-[#0a0d14] rounded-xl border border-[#1b202c]">
              No projects match your filter.
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const projTasks = tasks.filter((t) => t.project_id === proj.id);
              const doneTasks = projTasks.filter((t) => t.status === 'done');
              const completionPct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
              const manager = profiles.find((p) => p.id === proj.manager_id);
              const prio = getPriorityColor(proj.priority);
              const stat = getStatusColor(proj.status);
              const keyColor = getProjectKeyColor(proj.code);

              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className="bg-[#0a0d14] hover:bg-[#0e121b] rounded-xl p-4 border border-[#1b202c] hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${keyColor}`}>
                        {proj.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${prio.bg}`}>
                          {proj.priority}
                        </span>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${stat.text} ${stat.border}`}>
                          {proj.status.replace('_', ' ')}
                        </span>
                        {isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={(e) => openEditModal(proj, e)}
                            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors ml-1"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        {proj.name}
                      </h3>
                      {proj.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-[#161b26]">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Sprint Completion</span>
                      <span className="text-white font-bold">{doneTasks.length}/{projTasks.length} ({completionPct}%)</span>
                    </div>
                    <Progress value={completionPct} indicatorColor="bg-blue-500" className="h-1.5 rounded-full bg-[#161c28]" />

                    <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-400">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={manager?.full_name || 'Lead'}
                          avatarUrl={manager?.avatar_url}
                          size="sm"
                          className="h-5.5 w-5.5 text-[9px] rounded-full border border-blue-500/30"
                        />
                        <span className="text-slate-300 font-medium">{manager?.full_name || 'Unassigned'}</span>
                      </div>
                      <span>{proj.due_date ? formatDate(proj.due_date, 'dd MMM yyyy') : 'Ongoing'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. JIRA SPREADSHEET / LIST VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="bg-[#0a0d14] rounded-xl border border-[#1b202c] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e121a] border-b border-[#1b202c] font-mono text-[10px] uppercase text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Key</th>
                <th className="py-2.5 px-3">Project Name</th>
                <th className="py-2.5 px-3">Project Lead</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Issues Progress</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161b26]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                    No projects match your filter.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((proj) => {
                  const projTasks = tasks.filter((t) => t.project_id === proj.id);
                  const doneTasks = projTasks.filter((t) => t.status === 'done');
                  const completionPct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;
                  const manager = profiles.find((p) => p.id === proj.manager_id);
                  const prio = getPriorityColor(proj.priority);
                  const stat = getStatusColor(proj.status);
                  const keyColor = getProjectKeyColor(proj.code);

                  return (
                    <tr
                      key={proj.id}
                      onClick={() => setSelectedProject(proj)}
                      className="hover:bg-[#0e121b] cursor-pointer transition-colors text-slate-300"
                    >
                      <td className="py-2.5 px-3">
                        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${keyColor}`}>
                          {proj.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-white block">{proj.name}</span>
                        {proj.client_name && (
                          <span className="text-[10px] text-slate-400 font-mono">Client: {proj.client_name}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <UserAvatar
                            name={manager?.full_name || 'Lead'}
                            avatarUrl={manager?.avatar_url}
                            size="sm"
                            className="h-5 w-5 text-[8px] rounded-full"
                          />
                          <span className="text-slate-200 font-medium">{manager?.full_name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${stat.text} ${stat.border}`}>
                          {proj.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${prio.bg}`}>
                          {proj.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 min-w-[140px]">
                        <div className="space-y-1 font-mono text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>{doneTasks.length}/{projTasks.length}</span>
                            <span>{completionPct}%</span>
                          </div>
                          <Progress value={completionPct} indicatorColor="bg-blue-500" className="h-1 rounded-full bg-[#161c28]" />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {proj.due_date ? formatDate(proj.due_date, 'dd MMM yyyy') : 'Ongoing'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProject(proj);
                          }}
                          className="h-6 text-[10px] font-mono border-[#1f2637] bg-[#10141e] text-blue-400 hover:text-white rounded-full"
                        >
                          Open Board
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. JIRA PROJECT WORKSPACE & SPRINT BOARD MODAL */}
      {/* ========================================================================= */}
      {selectedProject && (
        <Dialog open={Boolean(selectedProject)} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-5xl bg-[#0a0d14] border border-[#21262d] p-5 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto" hideCloseButton>
            {/* Jira Project Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#21262d]">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${getProjectKeyColor(selectedProject.code)}`}>
                    {selectedProject.code}
                  </span>
                  <span className={`px-2 py-0.5 font-mono text-[9px] rounded-full border uppercase font-bold ${getPriorityColor(selectedProject.priority).bg}`}>
                    {selectedProject.priority}
                  </span>
                  <span className={`px-2 py-0.5 font-mono text-[9px] rounded-full border uppercase font-bold ${getStatusColor(selectedProject.status).text} ${getStatusColor(selectedProject.status).border}`}>
                    {selectedProject.status.replace('_', ' ')}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-white font-mono mt-1.5">
                  {selectedProject.name}
                </DialogTitle>
                {selectedProject.client_name && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Client: <strong className="text-slate-200">{selectedProject.client_name}</strong>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setQuickTaskType('task');
                    setQuickTaskStatus('todo');
                    setQuickTaskPriority('medium');
                    setQuickTaskAssignee(currentUser.id);
                    setQuickTaskSubtasks([]);
                    setQuickTaskModalOpen(true);
                  }}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 rounded-full gap-1 shadow-sm font-mono"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Issue</span>
                </Button>

                {isManagerOrAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(selectedProject)}
                    className="h-8 text-xs border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-slate-300 rounded-full font-mono gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#1f2637] transition-colors ml-1"
                  title="Close Workspace"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Jira Tabs */}
            <div className="flex items-center gap-1.5 pt-2 border-b border-[#1b202c]">
              <button
                onClick={() => setProjectTab('tasks_board')}
                className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-all flex items-center gap-1.5 ${
                  projectTab === 'tasks_board'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Sprint Board</span>
              </button>
              <button
                onClick={() => setProjectTab('tasks_list')}
                className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-all flex items-center gap-1.5 ${
                  projectTab === 'tasks_list'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Backlog & Issues ({tasks.filter((t) => t.project_id === selectedProject.id).length})</span>
              </button>
              <button
                onClick={() => setProjectTab('team_workload')}
                className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-all flex items-center gap-1.5 ${
                  projectTab === 'team_workload'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Team Capacity Heatmap</span>
              </button>
              <button
                onClick={() => setProjectTab('overview')}
                className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-all flex items-center gap-1.5 ${
                  projectTab === 'overview'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Overview & Scope</span>
              </button>
            </div>

            {/* TAB CONTENT: Sprint Board */}
            {projectTab === 'tasks_board' && (
              <div className="pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                  {TASK_STATUS_COLUMNS.map((col) => {
                    const colTasks = tasks.filter(
                      (t) => t.project_id === selectedProject.id && t.status === col.id
                    );
                    const isOver = draggedOverTaskCol === col.id;

                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => handleTaskDragOver(e, col.id)}
                        onDragLeave={(e) => handleTaskDragLeave(e, col.id)}
                        onDrop={(e) => handleTaskDrop(e, col.id)}
                        className={`rounded-xl border p-2.5 space-y-2 min-h-[340px] flex flex-col transition-all duration-200 ${
                          isOver
                            ? 'bg-[#121929] border-blue-500/70 ring-2 ring-blue-500/30 shadow-lg'
                            : 'bg-[#0e121a] border-[#1b202c]'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#161b26]">
                          <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${col.color}`}>
                            {col.label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#161c28] text-slate-300 font-bold border border-[#22293a]">
                            {colTasks.length}
                          </span>
                        </div>

                        {/* Task Cards */}
                        <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[460px] pr-0.5">
                          {colTasks.length === 0 ? (
                            <div className={`py-10 text-center text-xs font-mono border border-dashed rounded-lg transition-colors ${
                              isOver ? 'border-blue-500/50 bg-blue-500/5 text-blue-300' : 'border-[#1b202c] text-slate-500'
                            }`}>
                              {isOver ? 'Drop issue here' : 'No issues'}
                            </div>
                          ) : (
                            colTasks.map((task) => {
                              const assignee = profiles.find((p) => p.id === task.assignee_id);
                              const prio = getPriorityColor(task.priority);
                              const subtasks = task.subtasks || [];
                              const completedSubtasks = subtasks.filter((s) => s.completed).length;
                              const isBeingDragged = draggedTaskId === task.id;
                              const isDone = task.status === 'done';

                              return (
                                <div
                                  key={task.id}
                                  draggable
                                  onDragStart={(e) => handleTaskDragStart(e, task.id)}
                                  onClick={() => setSelectedTask(task)}
                                  className={`bg-[#121622] hover:bg-[#161b2a] rounded-xl p-3 border border-[#1f2638] hover:border-blue-500/50 space-y-2.5 transition-all shadow-sm group cursor-grab active:cursor-grabbing select-none ${
                                    isBeingDragged ? 'opacity-30 scale-95 ring-2 ring-blue-500/50' : ''
                                  } ${isDone ? 'border-l-4 border-l-emerald-500' : ''}`}
                                >
                                  {/* Top: Issue Type + Key + Priority + Due Date */}
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {renderIssueTypeIcon(task.type)}
                                      <span className="text-[10px] font-mono text-blue-400 font-bold truncate">
                                        {selectedProject.code}-{task.id.slice(0, 4)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {task.due_date && (
                                        <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5 bg-[#0a0d14] px-1.5 py-0.5 rounded border border-[#1e2536]">
                                          <Calendar className="h-2.5 w-2.5" />
                                          {formatDate(task.due_date, 'dd MMM')}
                                        </span>
                                      )}
                                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border uppercase font-bold ${prio.bg}`}>
                                        {task.priority}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Title */}
                                  <p className={`text-xs font-semibold leading-snug line-clamp-2 ${
                                    isDone ? 'line-through text-slate-400' : 'text-slate-100 group-hover:text-white'
                                  }`}>
                                    {task.title}
                                  </p>

                                  {/* Tags / Labels */}
                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {task.tags.slice(0, 3).map((tag, idx) => (
                                        <span
                                          key={idx}
                                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161c28] border border-[#242c3d] text-slate-300"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Footer: Assignee + Subtasks count + Comments/Estimate + Quick Status dropdown */}
                                  <div className="flex items-center justify-between pt-1.5 border-t border-[#1a2130] text-[10px] font-mono text-slate-400">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <UserAvatar
                                        name={assignee?.full_name || 'Member'}
                                        avatarUrl={assignee?.avatar_url}
                                        size="sm"
                                        className="h-5 w-5 text-[8px] rounded-full border border-slate-700"
                                      />
                                      <span className="truncate max-w-[65px] text-slate-300">
                                        {assignee?.full_name?.split(' ')[0] || 'Unassigned'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {subtasks.length > 0 && (
                                        <span
                                          className="flex items-center gap-0.5 text-[9px] font-mono text-slate-400 bg-[#0c1018] px-1.5 py-0.5 rounded border border-[#1b2230]"
                                          title={`${completedSubtasks}/${subtasks.length} subtasks completed`}
                                        >
                                          <ListChecks className="h-2.5 w-2.5 text-blue-400" />
                                          <span>{completedSubtasks}/{subtasks.length}</span>
                                        </span>
                                      )}

                                      {task.estimated_hours ? (
                                        <span className="text-[9px] font-mono bg-[#0c1018] px-1 py-0.5 rounded border border-[#1b2230] text-slate-400" title={`${task.estimated_hours}h estimate`}>
                                          {task.estimated_hours}h
                                        </span>
                                      ) : null}

                                      {/* Inline Status Dropdown */}
                                      <select
                                        value={task.status}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                        className="bg-[#0a0d14] border border-[#1f2637] rounded-full px-1.5 py-0.5 text-[9px] font-mono text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                                      >
                                        <option value="todo">TO DO</option>
                                        <option value="in_progress">IN PROGRESS</option>
                                        <option value="review">REVIEW</option>
                                        <option value="done">DONE</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: Backlog & Tasks List */}
            {projectTab === 'tasks_list' && (
              <div className="pt-3 space-y-2">
                <div className="bg-[#0e121a] rounded-xl border border-[#1b202c] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121622] border-b border-[#1b202c] font-mono text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Key</th>
                        <th className="py-2.5 px-3">Summary</th>
                        <th className="py-2.5 px-3">Subtasks</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Priority</th>
                        <th className="py-2.5 px-3">Assignee</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#161b26]">
                      {tasks.filter((t) => t.project_id === selectedProject.id).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                            No issues created for this project yet.
                          </td>
                        </tr>
                      ) : (
                        tasks
                          .filter((t) => t.project_id === selectedProject.id)
                          .map((task) => {
                            const assignee = profiles.find((p) => p.id === task.assignee_id);
                            const prio = getPriorityColor(task.priority);
                            const subtasks = task.subtasks || [];
                            const completedSubtasks = subtasks.filter((s) => s.completed).length;

                            return (
                              <tr
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="hover:bg-[#121622] text-slate-300 cursor-pointer"
                              >
                                <td className="py-2.5 px-3">
                                  {renderIssueTypeIcon(task.type)}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[10px] text-blue-400 font-bold">
                                  {selectedProject.code}-{task.id.slice(0, 4)}
                                </td>
                                <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">
                                  {task.title}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">
                                  {subtasks.length > 0 ? (
                                    <span className="text-blue-400 font-semibold">{completedSubtasks}/{subtasks.length}</span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={task.status}
                                    onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                    className="bg-[#10141e] border border-[#1f2637] rounded-full px-2 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none"
                                  >
                                    <option value="todo">TO DO</option>
                                    <option value="in_progress">IN PROGRESS</option>
                                    <option value="review">IN REVIEW</option>
                                    <option value="done">DONE</option>
                                  </select>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border uppercase ${prio.bg}`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <UserAvatar
                                      name={assignee?.full_name || 'Member'}
                                      avatarUrl={assignee?.avatar_url}
                                      size="sm"
                                      className="h-4.5 w-4.5 text-[8px] rounded-full"
                                    />
                                    <span className="text-slate-300 font-mono text-[11px]">{assignee?.full_name?.split(' ')[0] || 'Unassigned'}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => deleteTask(task.id)}
                                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                                    title="Delete Issue"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Team Workload & Sprint Capacity Heatmap */}
            {projectTab === 'team_workload' && (
              <div className="pt-3">
                <TeamCapacityHeatmap projectId={selectedProject.id} />
              </div>
            )}

            {/* TAB CONTENT: Overview & Scope */}
            {projectTab === 'overview' && (
              <div className="pt-3 space-y-3 text-xs">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#0e121a] p-3 rounded-xl border border-[#1b202c] font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block">Project Lead</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <UserAvatar
                        name={profiles.find((p) => p.id === selectedProject.manager_id)?.full_name || 'Lead'}
                        size="sm"
                        className="h-5 w-5 text-[8px] rounded-full"
                      />
                      <span className="text-slate-200 font-semibold truncate">
                        {profiles.find((p) => p.id === selectedProject.manager_id)?.full_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block">Start Date</span>
                    <span className="text-slate-200 font-semibold block mt-1">
                      {formatDate(selectedProject.start_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block">Target Delivery</span>
                    <span className="text-slate-200 font-semibold block mt-1">
                      {formatDate(selectedProject.due_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] block">Budget (Optional)</span>
                    <span className="text-emerald-400 font-bold block mt-1 font-mono">
                      {selectedProject.budget && selectedProject.budget > 0 ? formatRupees(selectedProject.budget) : '—'}
                    </span>
                  </div>
                </div>

                {/* Scope & Objectives */}
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Scope & Technical Deliverables
                  </span>
                  <p className="bg-[#0e121a] p-3 rounded-xl border border-[#1b202c] text-slate-300 leading-relaxed text-xs whitespace-pre-wrap font-sans">
                    {selectedProject.description || 'No detailed scope description provided.'}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
              {isManagerOrAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingProject(selectedProject);
                    setDeleteConfirmOpen(true);
                  }}
                  className="h-8 text-xs gap-1 border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 font-mono rounded-full"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Project</span>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedProject(null)}
                className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] rounded-full font-mono"
              >
                Close Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 5. JIRA ISSUE DETAIL & SUBTASKS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {selectedTask && (
        <Dialog open={Boolean(selectedTask)} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl lg:max-w-3xl w-[94vw] bg-[#0a0d14] border border-[#21262d] p-6 shadow-2xl rounded-2xl max-h-[88vh] overflow-y-auto" hideCloseButton>
            {/* Header: Type + Key + Priority */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
              <div className="flex items-center gap-2 min-w-0">
                {renderIssueTypeIcon(selectedTask.type, true, 'md')}
                <span className="font-mono text-xs font-bold text-blue-400 truncate">
                  {selectedProject?.code || 'ISSUE'}-{selectedTask.id.slice(0, 4)}
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold shrink-0 ${getPriorityColor(selectedTask.priority).bg}`}>
                  {selectedTask.priority}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    const newStat = e.target.value as TaskStatus;
                    updateTaskStatus(selectedTask.id, newStat);
                    setSelectedTask({ ...selectedTask, status: newStat });
                  }}
                  className="bg-[#121622] border border-[#22293a] rounded-full px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="todo">TO DO</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="review">IN REVIEW</option>
                  <option value="done">DONE</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1f2637] transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Task Title & Description */}
            <div className="space-y-3 pt-2">
              <DialogTitle className="text-lg font-bold text-white leading-snug">
                {selectedTask.title}
              </DialogTitle>

              {selectedTask.description && (
                <div className="p-3.5 rounded-xl bg-[#0e121a] border border-[#1b202c] text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description}
                </div>
              )}

              {/* Assignee & Reporter Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0e121a] border border-[#1b202c] text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Assignee</span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar
                      name={profiles.find((p) => p.id === selectedTask.assignee_id)?.full_name || 'Member'}
                      avatarUrl={profiles.find((p) => p.id === selectedTask.assignee_id)?.avatar_url}
                      size="sm"
                      className="h-5 w-5 text-[8px] rounded-full"
                    />
                    <span className="text-slate-200 font-medium truncate">
                      {profiles.find((p) => p.id === selectedTask.assignee_id)?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Reporter</span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar
                      name={profiles.find((p) => p.id === selectedTask.reporter_id)?.full_name || 'Reporter'}
                      avatarUrl={profiles.find((p) => p.id === selectedTask.reporter_id)?.avatar_url}
                      size="sm"
                      className="h-5 w-5 text-[8px] rounded-full"
                    />
                    <span className="text-slate-200 font-medium truncate">
                      {profiles.find((p) => p.id === selectedTask.reporter_id)?.full_name || 'Reporter'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* SUBTASKS SECTION */}
              {/* ============================================================= */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                    <ListChecks className="h-4 w-4 text-blue-400" />
                    <span>Subtasks ({selectedTask.subtasks?.length || 0})</span>
                  </div>

                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                    <span className="text-[11px] font-mono text-slate-300 bg-[#161c28] px-2.5 py-0.5 rounded-full border border-[#232c3f]">
                      {selectedTask.subtasks.filter((s) => s.completed).length} of {selectedTask.subtasks.length} completed
                    </span>
                  )}
                </div>

                {/* Subtasks Progress Bar */}
                {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                  <Progress
                    value={Math.round(
                      (selectedTask.subtasks.filter((s) => s.completed).length / selectedTask.subtasks.length) * 100
                    )}
                    indicatorColor="bg-emerald-500"
                    className="h-2 rounded-full bg-[#161c28]"
                  />
                )}

                {/* Subtasks Checklist */}
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {selectedTask.subtasks?.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0e121a] hover:bg-[#121622] border border-[#1b202c] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(selectedTask, subtask.id)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {subtask.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-500 shrink-0 group-hover:text-blue-400" />
                        )}
                        <span
                          className={`text-xs ${
                            subtask.completed ? 'line-through text-slate-500 font-mono' : 'text-slate-200'
                          } truncate`}
                        >
                          {subtask.title}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(selectedTask, subtask.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                        title="Delete subtask"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Subtask Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="+ Add a subtask and press Enter..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtaskToTask(selectedTask);
                        }
                      }}
                      className="h-8 bg-[#0e121a] border-[#1f2637] text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus:border-blue-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddSubtaskToTask(selectedTask)}
                      className="h-8 text-xs bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-200 rounded-lg px-3 shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Task & Sprint Activity Audit Trail */}
              <div className="pt-2 border-t border-[#1b2230]">
                <TaskActivityAuditTrail task={selectedTask} />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  deleteTask(selectedTask.id);
                  setSelectedTask(null);
                  toast.success('Issue deleted');
                }}
                className="h-8 text-xs border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 font-mono rounded-full"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Issue</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTask(null)}
                className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] rounded-full font-mono"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE PROJECT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-2xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white font-mono">
                Create Project Workspace
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                Setup a new deliverable workspace with Jira key and sprint tracking
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Project Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Core Banking API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Project Key <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. PRJ"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg uppercase font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Client / Organization (Optional)
              </label>
              <Input
                placeholder="e.g. HDFC Bank Ltd"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Project Lead
                </label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Target Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Project Scope & Deliverables
              </label>
              <Textarea
                placeholder="High-level architecture and scope description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 rounded-full shadow-sm"
              >
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. EDIT PROJECT MODAL */}
      {/* ========================================================================= */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-2xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Edit2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white font-mono">
                Edit Project Settings
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                Update status, lead, priority, and project scope
              </p>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Project Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Key <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg uppercase font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Client Name
              </label>
              <Input
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Priority
                </label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Project Lead
                </label>
                <select
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Target Delivery Date
                </label>
                <Input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Scope Description
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 rounded-full shadow-sm"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. QUICK CREATE ISSUE MODAL WITH TICKET TYPE & SUBTASKS */}
      {/* ========================================================================= */}
      <Dialog open={quickTaskModalOpen} onOpenChange={setQuickTaskModalOpen}>
        <DialogContent className="max-w-lg bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white font-mono">
                Create Issue in {selectedProject?.code}
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                Choose ticket type (Story, Task, Bug, Epic) and add subtasks
              </p>
            </div>
          </div>

          <form onSubmit={handleQuickCreateTask} className="space-y-3.5 pt-2 text-xs">
            {/* Ticket Type & Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Issue Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={quickTaskType}
                  onChange={(e) => setQuickTaskType(e.target.value as IssueType)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none font-mono"
                >
                  <option value="story">📗 Story</option>
                  <option value="task">📘 Task</option>
                  <option value="bug">📕 Bug</option>
                  <option value="epic">🟪 Epic</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Issue Summary <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Implement OAuth2 token refresh endpoint"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Column / Status
                </label>
                <select
                  value={quickTaskStatus}
                  onChange={(e) => setQuickTaskStatus(e.target.value as TaskStatus)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="todo">TO DO</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="review">IN REVIEW</option>
                  <option value="done">DONE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Priority
                </label>
                <select
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as PriorityLevel)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-200 block mb-1">
                  Assignee
                </label>
                <select
                  value={quickTaskAssignee}
                  onChange={(e) => setQuickTaskAssignee(e.target.value)}
                  className="w-full h-8 bg-[#161b22] border border-[#30363d] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-200 block mb-1">
                Description / Acceptance Criteria
              </label>
              <Textarea
                placeholder="Acceptance criteria and technical details..."
                value={quickTaskDesc}
                onChange={(e) => setQuickTaskDesc(e.target.value)}
                rows={2}
                className="bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
              />
            </div>

            {/* Subtasks Builder */}
            <div className="space-y-2 pt-1 border-t border-[#21262d]">
              <label className="text-xs font-medium text-slate-200 flex items-center justify-between">
                <span>Subtasks ({quickTaskSubtasks.length})</span>
                <span className="text-[10px] text-slate-400 font-mono">Optional checklist items</span>
              </label>

              {quickTaskSubtasks.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {quickTaskSubtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 rounded bg-[#161b22] text-xs text-slate-200">
                      <span className="truncate">{st}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuickSubtask(i)}
                        className="text-slate-400 hover:text-rose-400 ml-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add a subtask item..."
                  value={quickSubtaskInput}
                  onChange={(e) => setQuickSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuickSubtask();
                    }
                  }}
                  className="h-8 bg-[#161b22] border-[#30363d] text-xs text-slate-100 rounded-lg"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddQuickSubtask}
                  className="h-8 text-xs bg-[#21262d] text-slate-200 hover:bg-[#30363d] rounded-lg px-3 shrink-0"
                >
                  Add
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickTaskModalOpen(false)}
                className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 rounded-full shadow-sm"
              >
                Create Issue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 9. DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-[#0d1117] border border-[#21262d] p-5 shadow-2xl rounded-2xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#21262d]">
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-white font-mono">
                Delete Project Workspace
              </DialogTitle>
              <p className="text-[11px] text-slate-400">
                This will permanently delete this project and unassign its issues.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Project:</span>
              <p className="text-sm font-semibold text-white">
                [{editingProject?.code}] {editingProject?.name}
              </p>
            </div>

            <p className="text-xs text-rose-300">
              Are you sure you want to proceed? This action cannot be undone.
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-[#21262d] flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="h-8 text-xs border-[#30363d] bg-[#161b22] text-slate-300 hover:bg-[#21262d] rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteProject}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 rounded-full shadow-sm"
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
