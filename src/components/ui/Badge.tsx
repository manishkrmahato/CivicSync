import React from 'react';
import { cn } from '@/lib/utils';
import { IssueStatus, IssuePriority } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'status' | 'priority';
  status?: IssueStatus;
  priority?: IssuePriority;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  status,
  priority,
  children,
  ...props
}) => {
  const getStatusStyles = (s?: IssueStatus) => {
    switch (s) {
      case 'reported':
        return 'bg-stone-100 text-stone-700 border-stone-300';
      case 'verified':
        return 'bg-sky-50 text-sky-800 border-sky-300';
      case 'under_review':
      case 'assigned':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'in_progress':
        return 'bg-indigo-50 text-indigo-800 border-indigo-300';
      case 'resolved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      case 'rejected':
      case 'duplicate':
        return 'bg-stone-100 text-stone-500 border-stone-200 line-through';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getPriorityStyles = (p?: IssuePriority) => {
    switch (p) {
      case 'low':
        return 'bg-stone-100 text-stone-600 border-stone-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-medium';
      case 'critical':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  let specificStyle = 'bg-stone-100 text-stone-700 border-stone-200';
  if (variant === 'status' && status) {
    specificStyle = getStatusStyles(status);
  } else if (variant === 'priority' && priority) {
    specificStyle = getPriorityStyles(priority);
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono tracking-tight border capitalize',
        specificStyle,
        className
      )}
      {...props}
    >
      {children || status || priority}
    </span>
  );
};

