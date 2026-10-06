import * as React from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Search,
  Kanban,
  List,
  Clock,
  MessageSquare,
  Send,
  Trash2,
  Calendar,
  AlertCircle,
  Tag,
  CheckCircle2,
  CheckSquare,
  Bookmark,
  Bug,
  Zap,
  ChevronsUp,
  ChevronUp,
  ChevronDown,
  Equal,
  SlidersHorizontal,
  X,
  User,
  Layers,
  ArrowRight,
  Circle,
  PlayCircle,
  Eye,
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Task, TaskStatus, Profile, Project } from '@/types';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { toast } from 'sonner';

function getStageInfo(status: TaskStatus | string) {
  switch (status.toLowerCase()) {
    case 'todo':
      return {
        title: 'TO DO',
        label: 'To Do',
        icon: <Circle className="h-3.5 w-3.5 text-slate-400" />,
        smallIcon: <Circle className="h-3 w-3 text-slate-400" />,
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        activeBtnBg: 'bg-slate-700 text-white border-slate-500 font-bold',
        pillColor: 'bg-slate-700 text-slate-200 border-slate-600',
      };
    case 'in_progress':
      return {
        title: 'IN PROGRESS',
        label: 'In Progress',
        icon: <PlayCircle className="h-3.5 w-3.5 text-blue-400" />,
        smallIcon: <PlayCircle className="h-3 w-3 text-blue-400" />,
        badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        activeBtnBg: 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold',
        pillColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      };
    case 'review':
      return {
        title: 'IN REVIEW',
        label: 'In Review',
        icon: <Eye className="h-3.5 w-3.5 text-purple-400" />,
        smallIcon: <Eye className="h-3 w-3 text-purple-400" />,
        badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        activeBtnBg: 'bg-purple-500/20 text-purple-300 border-purple-500/50 font-bold',
        pillColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    case 'done':
    case 'completed':
    default:
      return {
        title: 'COMPLETED',
        label: 'Completed',
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
        smallIcon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        activeBtnBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold',
        pillColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
  }
}

function getPriorityIcon(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return <ChevronsUp className="h-3.5 w-3.5 text-rose-400" />;
    case 'high':
      return <ChevronUp className="h-3.5 w-3.5 text-orange-400" />;
    case 'medium':
      return <Equal className="h-3.5 w-3.5 text-amber-400" />;
    case 'low':
    default:
      return <ChevronDown className="h-3.5 w-3.5 text-blue-400" />;
  }
}

function getIssueType(task: Task) {
  const titleLower = task.title.toLowerCase();
  const tagsString = (task.tags || []).join(' ').toLowerCase();

  if (titleLower.includes('bug') || tagsString.includes('bug') || titleLower.includes('fix') || titleLower.includes('error')) {
    return {
      type: 'Bug',
      icon: <Bug className="h-3.5 w-3.5 text-rose-400" />,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    };
  }
  if (tagsString.includes('story') || tagsString.includes('feature')) {
    return {
      type: 'Story',
      icon: <Bookmark className="h-3.5 w-3.5 text-emerald-400" />,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (tagsString.includes('epic') || titleLower.includes('epic')) {
    return {
      type: 'Epic',
      icon: <Zap className="h-3.5 w-3.5 text-purple-400" />,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    };
  }
  return {
    type: 'Task',
    icon: <CheckSquare className="h-3.5 w-3.5 text-blue-400" />,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };
}

function KanbanCard({
  task,
  onSelect,
  profiles,
  projects,
}: {
  task: Task;
  onSelect: (t: Task) => void;
  profiles: Profile[];
  projects: Project[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = task.status === 'done';
  const issueType = getIssueType(task);
  const matchedAssignee =
    task.assignee ||
    profiles.find((p) => p.id === task.assignee_id || p.user_id === task.assignee_id);
  const assigneeName = matchedAssignee?.full_name || 'Unassigned';
  const proj = projects.find((p) => p.id === task.project_id);
  const taskKey = proj?.code ? `${proj.code}-${task.id.slice(-4).toUpperCase()}` : `TCY-${task.id.slice(-4).toUpperCase()}`;

  // Authentic Jira Card Surface & Left Accent
  const cardStyle = isDone
    ? 'border-l-[4px] border-l-emerald-500 bg-[#0d1514] border-[#182a22] hover:border-emerald-600/50 shadow-sm'
    : task.status === 'in_progress'
    ? 'border-l-[4px] border-l-blue-500 bg-[#0e1422] border-[#1b263b] hover:border-blue-500/60 shadow-sm'
    : task.status === 'review'
    ? 'border-l-[4px] border-l-purple-500 bg-[#121022] border-[#221c3b] hover:border-purple-500/60 shadow-sm'
    : 'border-l-[4px] border-l-slate-600 bg-[#11141c] border-[#1c2230] hover:border-slate-500/60 shadow-sm';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(task)}
      className={`group cursor-grab active:cursor-grabbing rounded-md p-3 transition-all hover:shadow-md hover:-translate-y-0.5 select-none ${cardStyle} ${
        isDragging ? 'opacity-30 ring-2 ring-blue-500 shadow-2xl' : ''
      }`}
    >
      {/* Card Header: Issue Key, Type & Due Date */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span title={issueType.type} className="flex-shrink-0">
            {issueType.icon}
          </span>
          <span
            className={`font-mono text-[11px] font-bold tracking-tight ${
              isDone ? 'text-emerald-400 hover:underline' : 'text-blue-400 hover:underline'
            }`}
          >
            {taskKey}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {task.due_date && (
            <span
              className={`text-[10px] font-mono flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                isDone
                  ? 'text-slate-500 border-slate-800 bg-slate-900/40'
                  : new Date(task.due_date) < new Date()
                  ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 font-semibold'
                  : 'text-slate-400 border-[#22293a] bg-[#141824]'
              }`}
            >
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(task.due_date, 'dd MMM')}
            </span>
          )}
        </div>
      </div>

      {/* Title - Jira Strikethrough & Completed Treatment */}
      <div className="mb-2.5">
        <h4
          className={`text-xs font-medium leading-snug line-clamp-2 transition-colors ${
            isDone
              ? 'line-through text-slate-400/90 group-hover:text-emerald-200'
              : 'text-slate-100 group-hover:text-white'
          }`}
        >
          {task.title}
        </h4>
      </div>

      {/* Jira Tag Pills */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 3).map((t, idx) => (
            <span
              key={idx}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161c28] border border-[#242c3d] text-slate-400"
            >
              {t}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#161c28] border border-[#242c3d] text-slate-500">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Footer: Priority, Comments, Estimate & Assignee Avatar */}
      <div className="flex items-center justify-between border-t border-[#1b2232]/80 pt-2 text-[10px]">
        {/* Left: Priority Icon + Comments */}
        <div className="flex items-center gap-2">
          <span className="flex items-center" title={`Priority: ${task.priority}`}>
            {getPriorityIcon(task.priority)}
          </span>

          {task.comments && task.comments.length > 0 && (
            <span className="flex items-center gap-1 font-mono text-slate-400 text-[10px]">
              <MessageSquare className="h-3 w-3" />
              {task.comments.length}
            </span>
          )}

          {isDone && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="h-2.5 w-2.5" />
              <span>DONE</span>
            </span>
          )}
        </div>

        {/* Right: Estimate & Assignee */}
        <div className="flex items-center gap-1.5">
          {task.estimated_hours ? (
            <span
              title={`${task.estimated_hours} hours estimated`}
              className="bg-[#161c28] border border-[#252e42] px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold text-slate-300"
            >
              {task.estimated_hours}h
            </span>
          ) : null}

          <div title={assigneeName} className="relative">
            <UserAvatar
              name={assigneeName}
              avatarUrl={matchedAssignee?.avatar_url}
              size="sm"
              className="h-5 w-5 text-[9px] ring-1 ring-[#263145]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  col,
  colTasks,
  onSelectTask,
  onOpenCreateModal,
  profiles,
  projects,
}: {
  col: { status: TaskStatus; title: string; color: string; badgeBg: string };
  colTasks: Task[];
  onSelectTask: (t: Task) => void;
  onOpenCreateModal: () => void;
  profiles: Profile[];
  projects: Project[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: col.status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border p-2.5 min-h-[580px] transition-all duration-150 ${
        isOver
          ? 'border-blue-500 bg-[#0e1424] ring-2 ring-blue-500/30'
          : 'border-[#1b2230] bg-[#0a0d14]'
      }`}
    >
      {/* Jira Column Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1b2230] px-1">
        <div className="flex items-center gap-2">
          {getStageInfo(col.status).icon}
          <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
            {col.title}
          </span>
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${col.badgeBg}`}
          >
            {colTasks.length}
          </span>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#161c28] transition-colors"
          title={`Create task in ${col.title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Column Cards Drop Area */}
      <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[480px]">
          {colTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              profiles={profiles}
              projects={projects}
            />
          ))}

          {colTasks.length === 0 && (
            <div className="h-36 flex flex-col items-center justify-center border-2 border-dashed border-[#1a2130] rounded-lg text-xs font-mono text-slate-500 gap-1">
              <span className="font-semibold text-slate-400 uppercase tracking-wide">NO ISSUES</span>
              <span className="text-[10px] text-slate-600">Drag or create tasks here</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function TasksPage() {
  const { tasks, projects, profiles, updateTask, updateTaskStatus, deleteTask, addTaskComment } = useDataStore();
  const { currentUser } = useAuthStore();
  const { setTaskModalOpen } = useUIStore();

  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');
  const [scopeFilter, setScopeFilter] = React.useState<'all' | 'my_tasks' | 'created_by_me'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState<string>('all');
  const [selectedPriority, setSelectedPriority] = React.useState<string>('all');
  const [selectedType, setSelectedType] = React.useState<string>('all');
  const [quickFilter, setQuickFilter] = React.useState<'all' | 'my_issues' | 'high_priority' | 'done'>('all');
  const [activeDetailTask, setActiveDetailTask] = React.useState<Task | null>(null);
  const [commentText, setCommentText] = React.useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (task.tags && task.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesProject = selectedProjectId === 'all' || task.project_id === selectedProjectId;
    const matchesAssignee = selectedAssigneeId === 'all' || task.assignee_id === selectedAssigneeId;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;

    let matchesType = true;
    if (selectedType !== 'all') {
      const it = getIssueType(task).type.toLowerCase();
      matchesType = it === selectedType.toLowerCase();
    }

    let matchesScope = true;
    if (scopeFilter === 'my_tasks') {
      matchesScope = task.assignee_id === currentUser.id;
    } else if (scopeFilter === 'created_by_me') {
      matchesScope = task.reporter_id === currentUser.id;
    }

    let matchesQuick = true;
    if (quickFilter === 'my_issues') {
      matchesQuick = task.assignee_id === currentUser.id;
    } else if (quickFilter === 'high_priority') {
      matchesQuick = task.priority === 'urgent' || task.priority === 'high';
    } else if (quickFilter === 'done') {
      matchesQuick = task.status === 'done';
    }

    return matchesSearch && matchesProject && matchesAssignee && matchesPriority && matchesType && matchesScope && matchesQuick;
  });

  const columns: { status: TaskStatus; title: string; color: string; badgeBg: string }[] = [
    { status: 'todo', title: 'TO DO', color: 'bg-slate-400', badgeBg: 'bg-slate-800 text-slate-300 border-slate-700' },
    { status: 'in_progress', title: 'IN PROGRESS', color: 'bg-blue-400', badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { status: 'review', title: 'IN REVIEW', color: 'bg-purple-400', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { status: 'done', title: 'COMPLETED', color: 'bg-emerald-400', badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ];

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const completionPercentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const targetColumn = columns.find((c) => c.status === overId);
    if (targetColumn) {
      updateTaskStatus(taskId, targetColumn.status);
      toast.info(`Moved to ${targetColumn.title}`);
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && overTask.status) {
      updateTaskStatus(taskId, overTask.status);
    }
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !activeDetailTask) return;
    addTaskComment(activeDetailTask.id, currentUser.id, commentText.trim());
    setCommentText('');
    toast.success('Comment added to issue');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedProjectId !== 'all' ||
    selectedAssigneeId !== 'all' ||
    selectedPriority !== 'all' ||
    selectedType !== 'all' ||
    scopeFilter !== 'all' ||
    quickFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedProjectId('all');
    setSelectedAssigneeId('all');
    setSelectedPriority('all');
    setSelectedType('all');
    setScopeFilter('all');
    setQuickFilter('all');
  };

  return (
    <div className="space-y-3.5">
      {/* Jira Top Board Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b2230] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            <h1 className="text-base font-bold text-white tracking-tight font-mono">
              SPRINT BACKLOG
            </h1>
          </div>
          <span className="text-xs font-mono bg-[#141a26] border border-[#232c3f] px-2.5 py-0.5 rounded text-slate-300">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'TASK' : 'TASKS'}
          </span>

          {/* Jira Progress Bar */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#1f2637]">
            <div className="w-32 h-2 rounded-full bg-[#161c28] overflow-hidden flex">
              <div
                style={{ width: `${(doneCount / (totalCount || 1)) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`${doneCount} Completed`}
              />
              <div
                style={{ width: `${(inProgressCount / (totalCount || 1)) * 100}%` }}
                className="bg-blue-500 h-full transition-all"
                title={`${inProgressCount} In Progress`}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {completionPercentage}% Done
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-md border border-[#212735] bg-[#0c0e15] p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-[#1e2533] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>KANBAN</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors ${
                viewMode === 'list' ? 'bg-[#1e2533] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>TABLE</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setTaskModalOpen(true)}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Jira Quick Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#0a0d14] border border-[#1b2230] text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            placeholder="Search tasks, keys, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-full border border-[#1b2230] bg-[#11141c] pl-9 pr-3.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setQuickFilter(quickFilter === 'my_issues' ? 'all' : 'my_issues')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-colors border ${
              quickFilter === 'my_issues'
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-semibold shadow-sm'
                : 'bg-[#11141c] text-slate-400 border-[#1b2230] hover:text-slate-200 hover:bg-[#161b26]'
            }`}
          >
            Only My Issues
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === 'high_priority' ? 'all' : 'high_priority')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-colors border ${
              quickFilter === 'high_priority'
                ? 'bg-rose-600/20 text-rose-300 border-rose-500/40 font-semibold shadow-sm'
                : 'bg-[#11141c] text-slate-400 border-[#1b2230] hover:text-slate-200 hover:bg-[#161b26]'
            }`}
          >
            High Priority
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === 'done' ? 'all' : 'done')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-colors border ${
              quickFilter === 'done'
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm'
                : 'bg-[#11141c] text-slate-400 border-[#1b2230] hover:text-slate-200 hover:bg-[#161b26]'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Dropdown Selectors */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="h-7.5 rounded border border-[#1b2230] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-blue-500"
        >
          <option value="all">ALL PROJECTS</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} ({p.name})
            </option>
          ))}
        </select>

        <select
          value={selectedAssigneeId}
          onChange={(e) => setSelectedAssigneeId(e.target.value)}
          className="h-7.5 rounded border border-[#1b2230] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-blue-500"
        >
          <option value="all">ALL ASSIGNEES</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="h-7.5 rounded border border-[#1b2230] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none focus:border-blue-500"
        >
          <option value="all">ALL PRIORITIES</option>
          <option value="urgent">URGENT</option>
          <option value="high">HIGH</option>
          <option value="medium">MEDIUM</option>
          <option value="low">LOW</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#161c28] border border-[#232c3f]"
          >
            <X className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Main Viewport */}
      {viewMode === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.status);

              return (
                <KanbanColumn
                  key={col.status}
                  col={col}
                  colTasks={colTasks}
                  onSelectTask={setActiveDetailTask}
                  onOpenCreateModal={() => setTaskModalOpen(true)}
                  profiles={profiles}
                  projects={projects}
                />
              );
            })}
          </div>
        </DndContext>
      ) : (
        /* Jira Table Mode */
        <div className="desktop-panel rounded-lg overflow-hidden border border-[#1b2230]">
          <table className="w-full text-left text-xs">
            <thead className="desktop-table-header uppercase font-mono text-[10px] text-slate-400 border-b border-[#1b2230]">
              <tr>
                <th className="py-2.5 px-3">Type / Key</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Assignee</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171b26]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-slate-400 font-mono">
                    NO TASKS MATCH THE APPLIED FILTERS
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const prio = getPriorityColor(task.priority);
                  const stat = getStatusColor(task.status);
                  const proj = projects.find((p) => p.id === task.project_id);
                  const issueType = getIssueType(task);
                  const isDone = task.status === 'done';
                  const taskKey = proj?.code
                    ? `${proj.code}-${task.id.slice(-4).toUpperCase()}`
                    : `TCY-${task.id.slice(-4).toUpperCase()}`;

                  const assignee =
                    task.assignee ||
                    profiles.find((p) => p.id === task.assignee_id || p.user_id === task.assignee_id);
                  const assigneeName = assignee?.full_name || 'Unassigned';

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setActiveDetailTask(task)}
                      className={`desktop-table-row cursor-pointer transition-colors ${
                        isDone ? 'bg-[#0d1413]/40 hover:bg-[#0f1a18]' : 'hover:bg-[#111622]'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          {issueType.icon}
                          <span
                            className={`font-bold ${
                              isDone ? 'text-emerald-400' : 'text-blue-400'
                            }`}
                          >
                            {taskKey}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        <span
                          className={isDone ? 'line-through text-slate-400' : 'text-slate-200'}
                        >
                          {task.title}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {proj?.code || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <UserAvatar
                            name={assigneeName}
                            avatarUrl={assignee?.avatar_url}
                            size="sm"
                            className="h-4.5 w-4.5 text-[8px]"
                          />
                          <span className="text-slate-300 font-medium">{assigneeName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          {getPriorityIcon(task.priority)}
                          <span className="uppercase text-slate-300">{task.priority}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[9.5px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${stat.text} ${stat.border} ${stat.bg}`}
                        >
                          {getStageInfo(task.status).smallIcon}
                          <span>{task.status.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                        {formatDate(task.due_date)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                            toast.success('Task deleted');
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Delete task"
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
      )}

      {/* Jira Two-Column Issue Detail Modal */}
      {activeDetailTask && (() => {
        const currentTaskProject = projects.find((p) => p.id === activeDetailTask.project_id);
        const isTaskProjectLead = currentTaskProject?.manager_id === currentUser.id;
        const isLeadOrManager =
          currentUser.role === 'super_admin' ||
          currentUser.role === 'admin' ||
          currentUser.role === 'manager' ||
          isTaskProjectLead ||
          Boolean(currentUser.designation_title?.toLowerCase().includes('lead')) ||
          Boolean(currentUser.designation_title?.toLowerCase().includes('cto'));

        const issueType = getIssueType(activeDetailTask);
        const taskKey = currentTaskProject?.code
          ? `${currentTaskProject.code}-${activeDetailTask.id.slice(-4).toUpperCase()}`
          : `TCY-${activeDetailTask.id.slice(-4).toUpperCase()}`;

        const isDone = activeDetailTask.status === 'done';

        return (
          <Dialog open={Boolean(activeDetailTask)} onOpenChange={() => setActiveDetailTask(null)}>
            <DialogContent className="max-w-4xl bg-[#0c0f17] border-[#1f2637] p-6 shadow-2xl rounded-2xl">
              {/* Jira Breadcrumbs / Issue Key Header */}
              <DialogHeader className="border-b border-[#1b2230] pb-3 pr-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#161c28] border border-[#232c3f] text-slate-300">
                      {issueType.icon}
                      <span>{currentTaskProject?.code || 'PROJECT'}</span>
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="font-bold text-blue-400">{taskKey}</span>
                  </div>

                  {/* Current Status Pill with Icon */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-mono uppercase rounded-full border font-bold whitespace-nowrap ${getStageInfo(activeDetailTask.status).pillColor}`}
                  >
                    {getStageInfo(activeDetailTask.status).smallIcon}
                    <span>{activeDetailTask.status.replace('_', ' ')}</span>
                  </span>
                </div>

                <DialogTitle
                  className={`text-lg font-semibold mt-2 text-left ${
                    isDone ? 'line-through text-slate-400' : 'text-white'
                  }`}
                >
                  {activeDetailTask.title}
                </DialogTitle>
              </DialogHeader>

              {/* 2-Column Jira Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-3">
                {/* Left 7 Cols: Description & Comments */}
                <div className="md:col-span-7 space-y-4">
                  {/* Description Section */}
                  <div>
                    <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                      Description
                    </label>
                    <div className="bg-[#0e121c] p-3.5 rounded-md border border-[#1b2230] text-xs text-slate-200 leading-relaxed whitespace-pre-wrap min-h-[90px]">
                      {activeDetailTask.description || 'No description provided.'}
                    </div>
                  </div>

                  {/* Tags */}
                  {activeDetailTask.tags && activeDetailTask.tags.length > 0 && (
                    <div>
                      <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold block mb-1">
                        Tags / Labels
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {activeDetailTask.tags.map((tg, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-mono px-2 py-0.5 rounded bg-[#161c28] border border-[#252e42] text-slate-300"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity / Comments Thread */}
                  <div className="border-t border-[#1b2230] pt-3 space-y-2.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
                      Activity & Comments
                    </label>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {!activeDetailTask.comments || activeDetailTask.comments.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No comments yet. Start the conversation below.</p>
                      ) : (
                        activeDetailTask.comments.map((cm) => {
                          const commenter = profiles.find((p) => p.id === cm.employee_id);
                          return (
                            <div key={cm.id} className="bg-[#0e121c] p-2.5 rounded border border-[#1b2230] text-xs">
                              <div className="flex justify-between items-center text-slate-400 text-[10px] font-mono mb-1">
                                <div className="flex items-center gap-1.5">
                                  <UserAvatar name={commenter?.full_name || 'User'} size="sm" className="h-4 w-4 text-[8px]" />
                                  <span className="font-semibold text-slate-300">{commenter?.full_name || 'Team Member'}</span>
                                </div>
                                <span>{formatDate(cm.created_at, 'dd MMM, hh:mm a')}</span>
                              </div>
                              <p className="text-slate-200 pl-5">{cm.comment}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        placeholder="Add a comment or work log..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        className="h-8 flex-1 rounded border border-[#1b2230] bg-[#0e121c] px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <Button size="sm" onClick={handleAddComment} className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-500">
                        <Send className="h-3.5 w-3.5 mr-1" />
                        <span>Save</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right 1 Col: Jira Metadata Sidebar */}
                <div className="md:col-span-5 space-y-3 bg-[#0e121c] p-3.5 rounded-xl border border-[#1b2230] text-xs">
                  <span className="font-mono text-[11px] font-bold text-slate-300 uppercase tracking-wide block border-b border-[#1b2230] pb-1.5">
                    Issue Details
                  </span>

                  {/* Status Workflow Selector */}
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase mb-1.5 font-semibold">Workflow Status</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map((st) => {
                        const isCurrent = activeDetailTask.status === st;
                        const stInfo = getStageInfo(st);
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              updateTaskStatus(activeDetailTask.id, st);
                              setActiveDetailTask({ ...activeDetailTask, status: st });
                              toast.success(`Moved to ${stInfo.label}`);
                            }}
                            className={`flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-mono rounded-lg transition-all border text-center whitespace-nowrap overflow-hidden ${
                              isCurrent
                                ? `${stInfo.activeBtnBg} shadow-sm ring-1 ring-blue-500/30`
                                : 'bg-[#141824] text-slate-400 border-[#222a3d] hover:text-white hover:bg-[#1a2133]'
                            }`}
                          >
                            <span className="shrink-0">{stInfo.smallIcon}</span>
                            <span className="whitespace-nowrap">{stInfo.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase mb-1">Assignee</span>
                    {isLeadOrManager ? (
                      <select
                        value={activeDetailTask.assignee_id || ''}
                        onChange={(e) => {
                          const newAssigneeId = e.target.value;
                          updateTask(activeDetailTask.id, { assignee_id: newAssigneeId });
                          setActiveDetailTask({ ...activeDetailTask, assignee_id: newAssigneeId });
                          const assigneeName = profiles.find((p) => p.id === newAssigneeId)?.full_name;
                          toast.success(`Assigned to ${assigneeName || 'team member'}`);
                        }}
                        className="w-full bg-[#141824] border border-[#232c3f] text-slate-100 text-xs font-mono px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <UserAvatar
                          name={profiles.find((p) => p.id === activeDetailTask.assignee_id)?.full_name || 'Unassigned'}
                          size="sm"
                          className="h-5 w-5 text-[9px]"
                        />
                        <span className="text-slate-200 font-medium">
                          {profiles.find((p) => p.id === activeDetailTask.assignee_id)?.full_name || 'Unassigned'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase mb-1">Priority</span>
                    {isLeadOrManager ? (
                      <select
                        value={activeDetailTask.priority}
                        onChange={(e) => {
                          const newPrio = e.target.value as any;
                          updateTask(activeDetailTask.id, { priority: newPrio });
                          setActiveDetailTask({ ...activeDetailTask, priority: newPrio });
                          toast.success(`Priority set to ${newPrio.toUpperCase()}`);
                        }}
                        className="w-full bg-[#141824] border border-[#232c3f] text-slate-100 text-xs font-mono px-2 py-1 rounded uppercase focus:outline-none focus:border-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5 font-mono">
                        {getPriorityIcon(activeDetailTask.priority)}
                        <span className="uppercase text-slate-200 font-semibold">{activeDetailTask.priority}</span>
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase mb-1">Due Date</span>
                    <span className="text-slate-200 font-mono block">
                      {formatDate(activeDetailTask.due_date)}
                    </span>
                  </div>

                  {/* Estimates */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#1b2230]">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase mb-0.5">Estimated</span>
                      <span className="text-slate-200 font-mono font-semibold">
                        {activeDetailTask.estimated_hours || 0}h
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase mb-0.5">Logged</span>
                      <span className="text-slate-200 font-mono font-semibold">
                        {activeDetailTask.actual_hours || 0}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Actions (Delete on left, Close on right) */}
              <DialogFooter className="pt-4 border-t border-[#1b2230] flex items-center justify-between sm:justify-between w-full mt-3">
                <div>
                  {isLeadOrManager && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        deleteTask(activeDetailTask.id);
                        toast.success(`Issue ${taskKey} deleted`);
                        setActiveDetailTask(null);
                      }}
                      className="h-8 text-xs gap-1.5 border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-400 font-mono"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Issue</span>
                    </Button>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDetailTask(null)}
                  className="h-8 text-xs border-[#232c3f] bg-[#141824] font-mono text-slate-200 hover:bg-[#1a2130]"
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
