import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Bug, Bookmark, Zap, CheckSquare, CornerDownRight, TrendingUp,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';

// ── Issue Type config ─────────────────────────────────────────────────────────
const ISSUE_TYPES = [
  {
    value: 'task',
    label: 'Task',
    bg: 'bg-blue-500',
    ring: 'ring-blue-500',
    textColor: 'text-blue-400',
    icon: CheckSquare,
    defaultTags: 'Task, Sprint',
  },
  {
    value: 'bug',
    label: 'Bug',
    bg: 'bg-rose-500',
    ring: 'ring-rose-500',
    textColor: 'text-rose-400',
    icon: Bug,
    defaultTags: 'Bug, Fix',
  },
  {
    value: 'story',
    label: 'Story',
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500',
    textColor: 'text-emerald-400',
    icon: Bookmark,
    defaultTags: 'Story, Feature',
  },
  {
    value: 'epic',
    label: 'Epic',
    bg: 'bg-purple-500',
    ring: 'ring-purple-500',
    textColor: 'text-purple-400',
    icon: Zap,
    defaultTags: 'Epic',
  },
  {
    value: 'subtask',
    label: 'Subtask',
    bg: 'bg-cyan-500',
    ring: 'ring-cyan-500',
    textColor: 'text-cyan-400',
    icon: CornerDownRight,
    defaultTags: 'Subtask',
  },
  {
    value: 'improvement',
    label: 'Improvement',
    bg: 'bg-orange-500',
    ring: 'ring-orange-500',
    textColor: 'text-orange-400',
    icon: TrendingUp,
    defaultTags: 'Improvement, Enhancement',
  },
] as const;

type IssueTypeValue = typeof ISSUE_TYPES[number]['value'];

// ── Schema ───────────────────────────────────────────────────────────────────
const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  type: z.enum(['task', 'bug', 'story', 'epic', 'subtask', 'improvement']),
  project_id: z.string().min(1, 'Please select a project'),
  assignee_id: z.string().min(1, 'Please assign to a team member'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  due_date: z.string().min(1, 'Please select a due date'),
  estimated_hours: z.coerce.number().min(0).max(200),
  tags: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

// ── Component ─────────────────────────────────────────────────────────────────
export function CreateTaskModal() {
  const { activeTaskModalOpen, setTaskModalOpen } = useUIStore();
  const { projects, profiles, createTask } = useDataStore();
  const { currentUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'task',
      project_id: projects[0]?.id || '',
      assignee_id: currentUser.id,
      priority: 'medium',
      status: 'todo',
      due_date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      estimated_hours: 4,
      tags: 'Task, Sprint',
    },
  });

  const selectedType = watch('type');

  const onSubmit = (data: TaskFormData) => {
    const tagsArray = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    createTask({
      title: data.title,
      description: data.description,
      type: data.type,
      project_id: data.project_id,
      assignee_id: data.assignee_id,
      reporter_id: currentUser.id,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date,
      estimated_hours: data.estimated_hours,
      actual_hours: 0,
      tags: tagsArray,
      subtasks: [],
    });

    toast.success('Task created successfully');
    reset();
    setTaskModalOpen(false);
  };

  return (
    <Dialog open={activeTaskModalOpen} onOpenChange={setTaskModalOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Agile Issue / Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-2">

          {/* ── Issue Type Picker ─────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Issue Type</label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-6 gap-1.5">
                  {ISSUE_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isSelected = field.value === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        title={t.label}
                        onClick={() => {
                          field.onChange(t.value);
                          setValue('tags', t.defaultTags);
                        }}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all ${
                          isSelected
                            ? `border-transparent ring-2 ${t.ring} bg-[#0f1420]`
                            : 'border-[#1f2637] bg-[#0c1018] hover:bg-[#111825] hover:border-[#2a3347]'
                        }`}
                      >
                        {/* Colored Badge with Icon */}
                        <span
                          className={`inline-flex items-center justify-center h-7 w-7 rounded-md ${t.bg} flex-shrink-0`}
                        >
                          <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                        </span>
                        {/* Label */}
                        <span
                          className={`text-[9px] font-mono font-semibold leading-none ${
                            isSelected ? t.textColor : 'text-slate-500'
                          }`}
                        >
                          {t.label.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* ── Title ────────────────────────────────────────────────── */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Summary / Title</label>
            <Input
              placeholder="e.g. Implement user authentication flow"
              {...register('title')}
              className="h-8"
            />
            {errors.title && <p className="text-xs text-rose-400 mt-0.5">{errors.title.message}</p>}
          </div>

          {/* ── Description ──────────────────────────────────────────── */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description &amp; Acceptance Criteria</label>
            <Textarea
              placeholder="Provide context, acceptance criteria or links..."
              rows={3}
              {...register('description')}
            />
          </div>

          {/* ── Project + Assignee ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Project</label>
              <select
                {...register('project_id')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none rounded-lg"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Assignee</label>
                <button
                  type="button"
                  onClick={() => setValue('assignee_id', currentUser.id)}
                  className="text-[11px] font-mono text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Assign to Me
                </button>
              </div>
              <select
                {...register('assignee_id')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none rounded-lg"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} {p.id === currentUser.id ? '(You)' : `(${p.designation_title || p.role.replace('_', ' ')})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Priority + Status + Due Date ─────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Priority</label>
              <select
                {...register('priority')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none rounded-lg"
              >
                <option value="low">🔽 Low</option>
                <option value="medium">⏸ Medium</option>
                <option value="high">🔼 High</option>
                <option value="urgent">⚡ Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <select
                {...register('status')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none rounded-lg"
              >
                <option value="todo">⚪ To Do</option>
                <option value="in_progress">🔵 In Progress</option>
                <option value="review">🟣 Review</option>
                <option value="done">🟢 Done</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Due Date</label>
              <Input type="date" {...register('due_date')} className="h-8" />
            </div>
          </div>

          {/* ── Hours + Tags ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Estimated Hours</label>
              <Input type="number" step="0.5" {...register('estimated_hours')} className="h-8" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Tags (comma separated)</label>
              <Input placeholder="Frontend, API, Sprint 1" {...register('tags')} className="h-8" />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="glow-primary">
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
