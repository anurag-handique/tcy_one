import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, formatDistanceToNow, isToday, isYesterday, differenceInMinutes } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date | null, formatStr: string = 'dd MMM yyyy'): string {
  if (!dateString) return '—';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatStr);
  } catch (err) {
    return String(dateString);
  }
}

export function formatTime(dateString?: string | Date | null): string {
  if (!dateString) return '—';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'hh:mm a');
  } catch (err) {
    return '—';
  }
}

export function formatRelativeTime(dateString?: string | Date | null): string {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return '';
  }
}

export function formatWorkingDuration(clockIn?: string | null, clockOut?: string | null): string {
  if (!clockIn) return '0h 0m';
  try {
    const start = parseISO(clockIn);
    const end = clockOut ? parseISO(clockOut) : new Date();
    const minutes = Math.max(0, differenceInMinutes(end, start));
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  } catch (err) {
    return '0h 0m';
  }
}

export function getStatusColor(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status.toLowerCase()) {
    case 'active':
    case 'present':
    case 'approved':
    case 'done':
    case 'completed':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' };
    case 'in_progress':
    case 'working':
    case 'ongoing':
    case 'half_day':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' };
    case 'pending':
    case 'late':
    case 'planning':
    case 'tentative':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' };
    case 'rejected':
    case 'cancelled':
    case 'absent':
    case 'urgent':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-500' };
    case 'todo':
    case 'on_leave':
    case 'on_hold':
    case 'archived':
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-400' };
  }
}

export function getPriorityColor(priority: string): { bg: string; text: string; border: string } {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return { bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 'high':
      return { bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30', text: 'text-orange-400', border: 'border-orange-500/30' };
    case 'medium':
      return { bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'low':
    default:
      return { bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
}

export function getInitials(name: string): string {
  if (!name) return 'TC';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
