import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-none text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none border border-transparent',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:bg-blue-700 border-blue-500/50',
        destructive: 'bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:bg-rose-700 border-rose-500/50',
        outline: 'border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:text-white text-slate-200',
        secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-850 border-slate-700',
        ghost: 'hover:bg-slate-800 hover:text-slate-100 text-slate-300',
        link: 'text-blue-400 underline-offset-4 hover:underline',
        glow: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:brightness-110 border-blue-400/40',
        emerald: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 border-emerald-500/50',
      },
      size: {
        default: 'h-7.5 px-3 py-1.5 text-xs',
        sm: 'h-6.5 px-2.5 text-[11px]',
        lg: 'h-9 px-4 text-xs font-semibold',
        icon: 'h-7.5 w-7.5 p-0',
        'icon-sm': 'h-6 w-6 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
