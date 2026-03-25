'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import {
  Dialog as DialogRoot,
  DialogContent as DialogContentBase,
  DialogDescription as DialogDescriptionBase,
  DialogFooter as DialogFooterBase,
  DialogHeader as DialogHeaderBase,
  DialogTitle as DialogTitleBase,
  DialogTrigger as DialogTriggerBase,
  DialogClose as DialogCloseBase,
} from '@/components/animate-ui/components/radix/dialog';
import type {
  DialogProps as DialogRootProps,
  DialogContentProps as DialogContentBaseProps,
  DialogDescriptionProps as DialogDescriptionBaseProps,
  DialogFooterProps as DialogFooterBaseProps,
  DialogHeaderProps as DialogHeaderBaseProps,
  DialogTitleProps as DialogTitleBaseProps,
  DialogTriggerProps as DialogTriggerBaseProps,
  DialogCloseProps as DialogCloseBaseProps,
} from '@/components/animate-ui/components/radix/dialog';
import { cn } from '@/lib/utils';

// Re-export types
export type DialogProps = DialogRootProps;
export type DialogTriggerProps = DialogTriggerBaseProps;
export type DialogCloseProps = DialogCloseBaseProps;
export type DialogContentProps = DialogContentBaseProps;
export type DialogHeaderProps = DialogHeaderBaseProps;
export type DialogFooterProps = DialogFooterBaseProps;
export type DialogTitleProps = DialogTitleBaseProps;
export type DialogDescriptionProps = DialogDescriptionBaseProps;

// Dialog Root - re-export as-is
export const Dialog = DialogRoot;

// Dialog Trigger
export const DialogTrigger = DialogTriggerBase;

// Dialog Close
export const DialogClose = DialogCloseBase;

// Dialog Content - wrap to use Cader tokens
export function DialogContent(props: DialogContentBaseProps) {
  return (
    <DialogContentBase
      {...props}
      className={cn(
        'bg-bg-surface border-border shadow-2xl',
        props.className
      )}
    />
  );
}

// Dialog Header - wrap to use Cader tokens
export function DialogHeader(props: DialogHeaderBaseProps) {
  return (
    <DialogHeaderBase
      {...props}
      className={cn('flex flex-col gap-2', props.className)}
    />
  );
}

// Dialog Footer - wrap to use Cader tokens
export function DialogFooter(props: DialogFooterBaseProps) {
  return (
    <DialogFooterBase
      {...props}
      className={cn('flex items-center justify-end gap-3', props.className)}
    />
  );
}

// Dialog Title - wrap to use Cader tokens
export function DialogTitle(props: DialogTitleBaseProps) {
  return (
    <DialogTitleBase
      {...props}
      className={cn('text-lg font-semibold leading-none', props.className)}
    />
  );
}

// Dialog Description - wrap to use Cader tokens
export function DialogDescription(props: DialogDescriptionBaseProps) {
  return (
    <DialogDescriptionBase
      {...props}
      className={cn('text-text-secondary text-sm', props.className)}
    />
  );
}

// Dialog Body (extra component for content padding)
export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={cn('p-0', className)}>{children}</div>;
}

// Progress Bar (for multi-step dialogs)
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