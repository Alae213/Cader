"use client";

import Link from "next/link";
import { Menu, X, Bell, Search, Plus, Settings, Compass } from "lucide-react";
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
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onExploreClick?: () => void;
}

export function TopBar({ user, onMenuClick, onCreateClick, onProfileClick, onSettingsClick, onExploreClick }: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-40 flex h-14 items-center justify-center border-b border-bg-elevated bg-bg-base px-4">

      <div className="w-full max-w-5xl flex items-center justify-between">
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

        {onExploreClick && user && (
          <button
            onClick={onExploreClick}
            className="rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
            title="Explore Communities"
          >
            <Compass className="h-5 w-5" />
          </button>
        )}

        <button className="relative rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        {onSettingsClick && (
          <button 
            onClick={onSettingsClick}
            className="rounded-full p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}

        {user ? (
          <div className="relative ml-2">
            <button 
              onClick={onProfileClick}
              className="flex items-center gap-2 rounded-full p-1 hover:bg-bg-elevated transition-colors"
            >
              <Avatar src={user.image} alt={user.name || "User"} size="md" />
            </button>
          </div>
        ) : (
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
        )}
      </div>
      </div>
    </header>
  );
}
