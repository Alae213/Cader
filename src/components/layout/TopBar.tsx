"use client";

import Link from "next/link";
import { Menu, X, Bell, Search, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Heading, Text } from "@/components/ui/Text";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";

interface TopBarProps {
  user?: {
    name?: string | null;
    image?: string | null;
  } | null;
  onMenuClick?: () => void;
  onCreateClick?: () => void;
}

export function TopBar({ user, onMenuClick, onCreateClick }: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-bg-elevated bg-bg-base px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <span className="font-display text-lg font-normal italic text-white">C</span>
          </div>
          <Heading size="5" className="hidden sm:block">Cader</Heading>
        </Link>
      </div>

      {/* Center - Search */}
      <div className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300",
        isSearchOpen ? "w-full max-w-xl px-4" : "w-auto"
      )}>
        {isSearchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search communities, members..."
              className="h-10 w-full rounded-[14px] bg-bg-surface pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
              onBlur={() => setIsSearchOpen(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden items-center gap-2 rounded-full bg-bg-surface px-4 py-2 text-sm text-text-muted hover:bg-bg-elevated transition-colors sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-2 rounded bg-bg-elevated px-1.5 py-0.5 text-xs">⌘K</kbd>
          </button>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors sm:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        {onCreateClick && (
          <Button variant="primary" size="sm" onClick={onCreateClick} className="hidden sm:flex">
            <Plus className="mr-1 h-4 w-4" />
            Create
          </Button>
        )}

        <button className="relative rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        {user ? (
          <Link href="/profile" className="ml-2">
            <Avatar src={user.image} alt={user.name || "User"} size="md" />
          </Link>
        ) : (
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
