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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">Task Title</label>
            <Input
              placeholder="e.g. Implement user authentication flow"
              {...register('title')}
              className="mt-1"
            />
            {errors.title && <p className="text-xs text-rose-400 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Description & Acceptance Criteria</label>
            <Textarea
              placeholder="Provide context, acceptance criteria or links..."
              rows={3}
              {...register('description')}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Project</label>
              <select
                {...register('project_id')}
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Assignee</label>
              <select
                {...register('assignee_id')}
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Priority</label>
              <select
                {...register('priority')}
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <select
                {...register('status')}
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Due Date</label>
              <Input type="date" {...register('due_date')} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300">Estimated Hours</label>
              <Input type="number" step="0.5" {...register('estimated_hours')} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Tags (comma separated)</label>
              <Input placeholder="Frontend, API, Sprint 1" {...register('tags')} className="mt-1" />
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
