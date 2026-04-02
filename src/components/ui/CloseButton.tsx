import * as React from 'react';
import { cn } from '@/lib/utils';

interface CloseButtonProps {
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function CloseButton({ 
  className, 
  onClick, 
  size = 'md' 
}: CloseButtonProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const svgSizes = {
    sm: '12',
    md: '16',
    lg: '20'
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-center cursor-pointer rounded-full hover:bg-white/10 transition-colors duration-150 active:scale-[0.96]',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      <svg 
        width={svgSizes[size]} 
        height={svgSizes[size]} 
        viewBox="0 0 20 20" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          fillRule="evenodd" 
          clipRule="evenodd" 
          d="M10 0C4.47714 0 0 4.47714 0 10C0 15.5229 4.47714 20 10 20C15.5229 20 20 15.5229 20 10C20 4.47714 15.5229 0 10 0ZM10.0001 9.03577L6.591 5.62668L5.62677 6.59091L9.03586 10L5.62677 13.4091L6.591 14.3733L10.0001 10.9642L13.4092 14.3733L14.3734 13.4091L10.9643 10L14.3734 6.59091L13.4092 5.62668L10.0001 9.03577Z" 
          fill="currentColor" 
          className="text-text-muted"
        />
      </svg>
    </div>
  );
}
