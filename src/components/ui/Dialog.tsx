'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Heading, Text } from './Text';

// Dialog Root
export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, onOpenChange, children, className }: DialogProps) {
  const handleClose = useMemo(
    () => onClose || (onOpenChange ? () => onOpenChange(false) : undefined),
    [onClose, onOpenChange]
  );

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && handleClose) {
        handleClose();
      }
    },
    [open, handleClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center", className)}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={handleClose}
      />
      <div className="relative z-10" style={{ maxHeight: '90vh', overflow: 'auto' }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Dialog Header
export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 p-6', className)}>
      {children}
    </div>
  );
}

// Dialog Title
export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <Heading size="6" className={className}>
      {children}
    </Heading>
  );
}

// Dialog Description
export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <Text size="2" theme="secondary" className={className}>
      {children}
    </Text>
  );
}

// Dialog Close Button
export interface DialogCloseProps {
  onClick?: () => void;
  className?: string;
}

export function DialogClose({ onClick, className }: DialogCloseProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-2 hover:bg-bg-elevated rounded-lg transition-colors',
        className
      )}
    >
      <X className="w-5 h-5 text-text-muted" />
    </button>
  );
}

// Dialog Content
export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className }: DialogContentProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-lg mx-4 bg-bg-surface rounded-2xl shadow-2xl',
        className
      )}
    >
      {children}
    </div>
  );
}

// Dialog Footer
export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6', className)}>
      {children}
    </div>
  );
}

// Dialog Body
export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>;
}

// Progress Bar
export interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  return (
    <div className={cn('h-1 bg-bg-elevated rounded-full overflow-hidden', className)}>
      <div
        className="h-full bg-accent transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default Dialog;
