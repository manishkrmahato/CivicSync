import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'outline';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-white border border-stone-200/90 shadow-sm',
      muted: 'bg-stone-100 border border-stone-200',
      outline: 'bg-transparent border border-stone-300',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-lg p-5', variants[variant], className)}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

