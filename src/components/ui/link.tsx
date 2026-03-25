import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type LinkVariant = 'default' | 'accent' | 'muted';
export type LinkSize = 'sm' | 'md' | 'lg';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: LinkVariant;
  size?: LinkSize;
  href: string;
  external?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<LinkVariant, string> = {
  default: 'text-text-primary hover:text-accent',
  accent: 'text-accent hover:underline',
  muted: 'text-text-muted hover:text-text-secondary',
};

const sizeStyles: Record<LinkSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function LinkComponent({
  variant = 'default',
  size = 'md',
  href,
  external = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: LinkProps) {
  const isExternal = external || href.startsWith('http');

  const content = (
    <>
      {leftIcon && <span className="inline-flex">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="inline-flex">{rightIcon}</span>}
    </>
  );

  const baseClasses = cn(
    'inline-flex items-center gap-1 transition-colors',
    variantStyles[variant],
    sizeStyles[size],
    className
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={baseClasses} {...props}>
      {content}
    </Link>
  );
}

export const InternalLink = LinkComponent;
export const ExternalLink = (props: LinkProps) => (
  <LinkComponent {...props} external />
);

export default LinkComponent;
