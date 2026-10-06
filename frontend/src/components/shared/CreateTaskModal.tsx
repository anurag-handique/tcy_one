import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUIStore } from '@/stores/uiStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from 'sonner';

const taskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  project_id: z.string().min(1, 'Please select a project'),
  assignee_id: z.string().min(1, 'Please assign to a team member'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  due_date: z.string().min(1, 'Please select a due date'),
  estimated_hours: z.coerce.number().min(0).max(200),
  tags: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function CreateTaskModal() {
  const { activeTaskModalOpen, setTaskModalOpen } = useUIStore();
  const { projects, profiles, createTask } = useDataStore();
  const { currentUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      project_id: projects[0]?.id || '',
      assignee_id: currentUser.id,
      priority: 'medium',
      status: 'todo',
      due_date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      estimated_hours: 4,
      tags: 'Feature, Sprint',
    },
  });

  const onSubmit = (data: TaskFormData) => {
    const tagsArray = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    createTask({
      title: data.title,
      description: data.description,
      project_id: data.project_id,
      assignee_id: data.assignee_id,
      reporter_id: currentUser.id,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date,
      estimated_hours: data.estimated_hours,
      actual_hours: 0,
      tags: tagsArray,
    });

    toast.success('Task created successfully');
    reset();
    setTaskModalOpen(false);
  };

  return (
    <Dialog open={activeTaskModalOpen} onOpenChange={setTaskModalOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create WorkHub Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 pt-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between h-5">
              <label className="text-xs font-semibold text-slate-300">Task Title</label>
            </div>
            <Input
              placeholder="e.g. Implement user authentication flow"
              {...register('title')}
              className="h-8"
            />
            {errors.title && <p className="text-xs text-rose-400 mt-0.5">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between h-5">
              <label className="text-xs font-semibold text-slate-300">Description & Acceptance Criteria</label>
            </div>
            <Textarea
              placeholder="Provide context, acceptance criteria or links..."
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Project</label>
              </div>
              <select
                {...register('project_id')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
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
                  onClick={() => reset({ ...taskSchema.safeParse({}).data, assignee_id: currentUser.id } as any, { keepValues: true })}
                  className="text-[11px] font-mono text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Assign to Me
                </button>
              </div>
              <select
                {...register('assignee_id')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} {p.id === currentUser.id ? '(You)' : `(${p.designation_title || p.role.replace('_', ' ')})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Priority</label>
              </div>
              <select
                {...register('priority')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Status</label>
              </div>
              <select
                {...register('status')}
                className="flex h-8 w-full border border-[#1f2637] bg-[#0c1018] px-2.5 py-1 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-none"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Due Date</label>
              </div>
              <Input type="date" {...register('due_date')} className="h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Estimated Hours</label>
              </div>
              <Input type="number" step="0.5" {...register('estimated_hours')} className="h-8" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <label className="text-xs font-semibold text-slate-300">Tags (comma separated)</label>
              </div>
              <Input placeholder="Frontend, API, Sprint 1" {...register('tags')} className="h-8" />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTaskModalOpen(false)}
            >
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
