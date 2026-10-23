import * as React from 'react';
import { cn } from '@toolnest/lib/utils';
export function Button({className, variant='default', ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline'|'ghost' }) {
  return <button className={cn('button', variant === 'outline' && 'button-outline', variant === 'ghost' && 'button-ghost', className)} {...props}/>;
}
