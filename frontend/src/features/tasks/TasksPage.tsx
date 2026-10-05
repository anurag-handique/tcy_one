import * as React from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
} from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { Task, TaskStatus } from '@/types';
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { UserAvatar } from '@/components/ui/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from 'sonner';

function KanbanCard({
  task,
  onSelect,
}: {
  task: Task;
  onSelect: (t: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const prio = getPriorityColor(task.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(task)}
      className={`group cursor-grab active:cursor-grabbing rounded border border-[#1b202c] bg-[#10131b] p-2.5 shadow-sm transition-colors hover:border-[#2b3548] hover:bg-[#141822] select-none ${
        isDragging ? 'opacity-30 ring-1 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className={`text-[9px] font-mono font-semibold px-1 py-0.2 rounded border uppercase ${prio.bg}`}>
          {task.priority}
        </span>
        <span className="text-[10px] font-mono text-slate-400">
          {task.due_date ? formatDate(task.due_date, 'dd MMM') : 'No date'}
        </span>
      </div>

      <h4 className="text-xs font-semibold text-slate-100 group-hover:text-blue-400 transition-colors leading-tight line-clamp-2">
        {task.title}
      </h4>

      <div className="mt-2.5 flex items-center justify-between border-t border-[#171b26] pt-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <UserAvatar name={task.assignee?.full_name || 'TC'} avatarUrl={task.assignee?.avatar_url} size="sm" className="h-4 w-4 text-[8px]" />
          <span className="truncate max-w-[80px]">{task.assignee?.full_name?.split(' ')[0] || 'Unassigned'}</span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          {task.comments && task.comments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {task.comments.length}
            </span>
          )}
          <span>{task.estimated_hours}h</span>
        </div>
      </div>
    </div>
  );
}

export function TasksPage() {
  const { tasks, projects, profiles, updateTaskStatus, deleteTask, addTaskComment } = useDataStore();
  const { currentUser } = useAuthStore();
  const { setTaskModalOpen } = useUIStore();

  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState<string>('all');
  const [selectedPriority, setSelectedPriority] = React.useState<string>('all');
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
      (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesProject = selectedProjectId === 'all' || task.project_id === selectedProjectId;
    const matchesAssignee = selectedAssigneeId === 'all' || task.assignee_id === selectedAssigneeId;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    return matchesSearch && matchesProject && matchesAssignee && matchesPriority;
  });

  const columns: { status: TaskStatus; title: string }[] = [
    { status: 'todo', title: 'TO DO' },
    { status: 'in_progress', title: 'IN PROGRESS' },
    { status: 'review', title: 'IN REVIEW' },
    { status: 'done', title: 'COMPLETED' },
  ];

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
    toast.success('Comment posted');
  };

  return (
    <div className="space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b202c] pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-white tracking-tight font-mono">
            SPRINT BACKLOG
          </h1>
          <span className="text-xs font-mono bg-[#161a24] border border-[#212735] px-2 py-0.5 rounded text-slate-300">
            {filteredTasks.length} TASKS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-[#212735] bg-[#0c0e15] p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded font-mono ${
                viewMode === 'kanban' ? 'bg-[#1e2533] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Kanban className="h-3 w-3" />
              <span>KANBAN</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded font-mono ${
                viewMode === 'list' ? 'bg-[#1e2533] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="h-3 w-3" />
              <span>TABLE</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setTaskModalOpen(true)}
            className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded bg-[#0c0e15] border border-[#1b202c] text-xs">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            placeholder="Filter tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded border border-[#1b202c] bg-[#11141c] pl-8 pr-2 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="h-7 rounded border border-[#1b202c] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none"
        >
          <option value="all">ALL PROJECTS</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}
            </option>
          ))}
        </select>

        <select
          value={selectedAssigneeId}
          onChange={(e) => setSelectedAssigneeId(e.target.value)}
          className="h-7 rounded border border-[#1b202c] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none"
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
          className="h-7 rounded border border-[#1b202c] bg-[#11141c] px-2 text-[11px] text-slate-300 font-mono focus:outline-none"
        >
          <option value="all">ALL PRIORITIES</option>
          <option value="urgent">URGENT</option>
          <option value="high">HIGH</option>
          <option value="medium">MEDIUM</option>
          <option value="low">LOW</option>
        </select>
      </div>

      {/* Main Viewport */}
      {viewMode === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.status);

              return (
                <div
                  key={col.status}
                  id={col.status}
                  className="flex flex-col rounded border border-[#1b202c] bg-[#0c0e15] p-2 min-h-[550px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#1b202c] mb-2 px-1">
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-300">
                      <span>{col.title}</span>
                      <span className="text-[10px] text-slate-400 bg-[#141822] px-1 py-0.2 rounded border border-[#212735]">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setTaskModalOpen(true)}
                      className="text-slate-400 hover:text-white p-0.5"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {colTasks.map((task) => (
                        <KanbanCard key={task.id} task={task} onSelect={setActiveDetailTask} />
                      ))}
                      {colTasks.length === 0 && (
                        <div className="h-20 flex items-center justify-center border border-dashed border-[#1a1f2b] rounded text-[11px] font-mono text-slate-400">
                          EMPTY
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      ) : (
        /* Table Mode */
        <div className="desktop-panel rounded overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="desktop-table-header uppercase font-mono text-[10px] text-slate-400">
              <tr>
                <th className="py-2 px-3">Task ID / Title</th>
                <th className="py-2 px-3">Project</th>
                <th className="py-2 px-3">Assignee</th>
                <th className="py-2 px-3">Priority</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Due Date</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171b26]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-mono">
                    NO TASKS FOUND IN WORKSPACE
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                const prio = getPriorityColor(task.priority);
                const stat = getStatusColor(task.status);
                const proj = projects.find((p) => p.id === task.project_id);
                const assignee = profiles.find((p) => p.id === task.assignee_id);

                return (
                  <tr
                    key={task.id}
                    onClick={() => setActiveDetailTask(task)}
                    className="desktop-table-row cursor-pointer text-slate-300"
                  >
                    <td className="py-2 px-3 font-medium text-slate-100">
                      {task.title}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {proj?.code}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={assignee?.full_name || 'TC'} avatarUrl={assignee?.avatar_url} size="sm" className="h-4 w-4 text-[8px]" />
                        <span>{assignee?.full_name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded border uppercase ${prio.bg}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${stat.text} ${stat.border}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                      {formatDate(task.due_date)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                          toast.success('Deleted task');
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Modal */}
      {activeDetailTask && (
        <Dialog open={Boolean(activeDetailTask)} onOpenChange={() => setActiveDetailTask(null)}>
          <DialogContent className="max-w-xl bg-[#0e1118] border-[#1f2533] p-5">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1 font-mono text-[10px]">
                <span className="bg-[#181d28] px-1.5 py-0.5 rounded text-slate-300 border border-[#252c3c]">
                  {projects.find((p) => p.id === activeDetailTask.project_id)?.code}
                </span>
                <span className={`px-1.5 py-0.5 rounded border uppercase ${getPriorityColor(activeDetailTask.priority).bg}`}>
                  {activeDetailTask.priority}
                </span>
              </div>
              <DialogTitle className="text-base text-white">{activeDetailTask.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <p className="bg-[#0b0e14] p-3 rounded border border-[#1b202c] text-slate-300 leading-relaxed">
                {activeDetailTask.description || 'No description entered.'}
              </p>

              <div className="grid grid-cols-3 gap-2 bg-[#0b0e14] p-2.5 rounded border border-[#1b202c] font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Assignee</span>
                  <span className="text-slate-200">
                    {profiles.find((p) => p.id === activeDetailTask.assignee_id)?.full_name || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Due Date</span>
                  <span className="text-slate-200">{formatDate(activeDetailTask.due_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Est / Act</span>
                  <span className="text-slate-200">{activeDetailTask.estimated_hours}h / {activeDetailTask.actual_hours}h</span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase">State:</span>
                <select
                  value={activeDetailTask.status}
                  onChange={(e) => {
                    updateTaskStatus(activeDetailTask.id, e.target.value as TaskStatus);
                    setActiveDetailTask({ ...activeDetailTask, status: e.target.value as TaskStatus });
                    toast.success('Task state updated');
                  }}
                  className="rounded border border-[#232b3c] bg-[#121620] px-2 py-1 text-xs text-white font-mono"
                >
                  <option value="todo">TO DO</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="review">IN REVIEW</option>
                  <option value="done">COMPLETED</option>
                </select>
              </div>

              {/* Discussion Thread */}
              <div className="border-t border-[#1b202c] pt-3 space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Thread Activity
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(!activeDetailTask.comments || activeDetailTask.comments.length === 0) ? (
                    <p className="text-[11px] text-slate-400 italic">No notes posted.</p>
                  ) : (
                    activeDetailTask.comments.map((cm) => (
                      <div key={cm.id} className="bg-[#0b0e14] p-2 rounded border border-[#1b202c] text-[11px]">
                        <div className="flex justify-between text-slate-400 text-[10px] font-mono mb-0.5">
                          <span>{profiles.find((p) => p.id === cm.employee_id)?.full_name}</span>
                          <span>{formatDate(cm.created_at, 'dd MMM, hh:mm a')}</span>
                        </div>
                        <p className="text-slate-300">{cm.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-1.5">
                  <input
                    placeholder="Add comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="h-7 flex-1 rounded border border-[#1b202c] bg-[#0b0e14] px-2 text-xs text-slate-200"
                  />
                  <Button size="sm" onClick={handleAddComment} className="h-7 px-2.5 text-xs bg-blue-600">
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
