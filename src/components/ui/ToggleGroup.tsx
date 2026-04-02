"use client";

import React, { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";
import { Text } from "./Text";

interface ToggleGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface ToggleGroupItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  _active?: boolean;
  _onSelect?: (value: string) => void;
  _disabled?: boolean;
}

export function ToggleGroup({ value, onValueChange, children, className }: ToggleGroupProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full items-center gap-0.5 rounded-xl bg-bg-black/50 p-1 shadow-input-shadow",
        className
      )}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const childProps = child.props as ToggleGroupItemProps;
        return cloneElement(child as React.ReactElement<ToggleGroupItemProps>, {
          _active: childProps.value === value,
          _onSelect: onValueChange,
          _disabled: childProps.disabled,
        });
      })}
    </div>
  );
}

export function ToggleGroupItem({
  value,
  children,
  className,
  _active,
  _onSelect,
  _disabled,
}: ToggleGroupItemProps) {
  return (
    <button
      role="tab"
      aria-selected={_active}
      disabled={_disabled}
      onClick={() => _onSelect?.(value)}
      className={cn(
        "w-full h-fit rounded-lg py-1.5 px-3 transition-colors duration-200 cursor-pointer",
        "bg-transparent hover:bg-white/5",
        _active ? "bg-white/10" : "",
        _disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isValidElement(children) && children.type === Text
        ? cloneElement(children as React.ReactElement<{ theme?: string }>, {
            theme: _active ? "primary" : "muted",
          })
        : children}
    </button>
  );
}
