"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { CommunityDropdown } from "@/components/ui/CommunityDropdown";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";

interface DropdownPosition {
  top: number;
  right: number;
}

interface Community {
  id: string;
  name: string;
  slug: string; 
  thumbnailUrl?: string;
}

interface TopBarProps {
  user: {
    name: string | null;
    image: string | null;
  } | null;
  communities?: Community[];
  currentCommunity: Community | null;
  onCreateCommunity?: () => void;
  onExploreCommunities?: () => void;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
}

export function TopBar({ 
  user, 
  communities = [], 
  currentCommunity = null,
  onCreateCommunity, 
  onExploreCommunities,
  onProfileClick,
  onSettingsClick,
  onLogout
}: TopBarProps) {
  const router = useRouter();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userMenuPos, setUserMenuPos] = useState<DropdownPosition>({ top: 0, right: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Ensure we only portal after mount (SSR safety)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    setIsLogoutDialogOpen(false);
    setIsUserMenuOpen(false);
    onLogout?.();
  };

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setUserMenuPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, []);

  const handleToggle = () => {
    if (!isUserMenuOpen) {
      updatePosition();
    }
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isUserMenuOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [isUserMenuOpen, updatePosition]);

  return (
    <>
    <header className="w-full sticky top-0 z-40 flex h-14 items-center justify-center px-4">

      <div className="w-full max-w-5xl flex items-center justify-between px-2">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link 
            href="/" 
            aria-label="Cader Home"
            className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-200"
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 16 16" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path d="M15.9502 2.68053C15.95 1.97316 15.669 1.29482 15.1688 0.794634C14.6686 0.294447 13.9902 0.0133573 13.2829 0.0131584C11.9891 3.34419e-05 10.9204 0.924408 10.6552 2.13903H10.5892C10.4662 1.53766 10.1397 0.997068 9.66463 0.60835C9.18957 0.219633 8.59504 0.00655129 7.98121 0.0050099C7.36739 0.00346851 6.77179 0.213562 6.29479 0.599888C5.81778 0.986215 5.48852 1.52516 5.36249 2.12591H5.29649C5.19833 1.65187 4.97337 1.21336 4.64561 0.857102C4.31785 0.500846 3.89957 0.2402 3.43534 0.102946C2.97111 -0.034308 2.47834 -0.0430266 2.00955 0.0777195C1.54076 0.198466 1.11351 0.444151 0.773352 0.78859C0.433193 1.13303 0.192869 1.56331 0.0779936 2.03358C-0.0368817 2.50384 -0.0220025 2.99647 0.121045 3.45894C0.264093 3.92142 0.529948 4.33641 0.890275 4.65969C1.2506 4.98297 1.69189 5.20243 2.16712 5.29466V5.34753C1.55751 5.46642 1.00821 5.79356 0.613293 6.27293C0.218378 6.7523 0.00242551 7.35407 0.00242551 7.97516C0.00242551 8.59625 0.218378 9.19802 0.613293 9.67739C1.00821 10.1568 1.55751 10.4839 2.16712 10.6028V10.6553C1.69141 10.7457 1.24922 10.9637 0.887841 11.286C0.526461 11.6083 0.259487 12.0227 0.115472 12.485C-0.0285422 12.9473 -0.0441795 13.4401 0.0702328 13.9106C0.184645 14.3811 0.424803 14.8117 0.765021 15.1562C1.10524 15.5008 1.53272 15.7464 2.00174 15.8667C2.47076 15.9871 2.96368 15.9777 3.42777 15.8396C3.89187 15.7014 4.30968 15.4397 4.63653 15.0825C4.96338 14.7252 5.18696 14.2858 5.28337 13.8113H5.34937C5.60024 15.0259 6.68287 15.9488 7.96387 15.9488C8.58005 15.9516 9.178 15.7398 9.65503 15.3498C10.1321 14.9597 10.4584 14.4158 10.578 13.8113H10.644C10.8949 15.0259 11.9775 15.9488 13.2585 15.9488C13.9224 15.9472 14.5619 15.6985 15.0525 15.2512C15.5431 14.8039 15.8495 14.1899 15.9122 13.529C15.9748 12.868 15.7891 12.2074 15.3913 11.6759C14.9935 11.1444 14.412 10.78 13.7602 10.6538V10.6013C14.3699 10.4824 14.9192 10.1553 15.3141 9.67589C15.709 9.19652 15.9249 8.59475 15.9249 7.97366C15.9249 7.35257 15.709 6.7508 15.3141 6.27143C14.9192 5.79206 14.3699 5.13148 13.7602 4.6013V4.5488C14.3699 4.42991 14.9192 4.10277 15.3141 3.6234C15.709 3.14403 15.9249 2.54226 15.9249 1.92117C15.9249 1.30008 15.709 0.698307 15.3141 0.218938C14.9192 -0.260431 14.3699 -0.587569 13.7602 -0.70646C13.1506 -0.825351 12.5179 -0.70646 11.9903 -0.345905C11.4627 0.0146506 11.1192 0.594021 11.0359 1.23513C10.9526 1.87624 11.1365 2.51735 11.5435 3.01672C11.9505 3.51609 12.5441 3.83665 13.1959 3.91996V3.97243C12.5863 4.09132 12.037 4.41846 11.6421 4.89783C11.2472 5.3772 11.0312 5.97897 11.0312 6.60006C11.0312 7.22115 11.2472 7.82292 11.6421 8.30229C12.037 8.78166 12.5863 9.1088 13.1959 9.22769V9.28016C12.5863 9.39905 12.037 9.72619 11.6421 10.2056C11.2472 10.6849 11.0312 11.2867 11.0312 11.9078C11.0312 12.5289 11.2472 13.1306 11.6421 13.61C12.037 14.0894 12.5863 14.4165 13.1959 14.5354C13.8055 14.6543 14.4382 14.5354 14.9658 14.1748C15.4934 13.8143 15.8369 13.2349 15.9202 12.5938C16.0035 11.9527 15.8196 11.3116 15.4126 10.8122C15.0056 10.3128 14.412 9.99227 13.7602 9.90896V9.85649C14.3699 9.7376 14.9192 9.41046 15.3141 8.93109C15.709 8.45172 15.9249 7.85 15.9249 7.22891C15.9249 6.60782 15.709 6.00605 15.3141 5.52668C14.9192 5.04731 14.3699 4.72017 13.7602 4.6013V4.5488C14.3699 4.42991 14.9192 4.10277 15.3141 3.6234C15.709 3.14403 15.9249 2.54226 15.9249 1.92117C15.9249 1.30008 15.709 0.698307 15.3141 0.218938C14.9192 -0.260431 14.3699 -0.587569 13.7602 -0.70646C13.1506 -0.825351 12.5179 -0.70646 11.9903 -0.345905C11.4627 0.0146506 11.1192 0.594021 11.0359 1.23513C10.9526 1.87624 11.1365 2.51735 11.5435 3.01672C11.9505 3.51609 12.5441 3.83665 13.1959 3.91996" fill="currentColor"/>
            </svg>
          </Link>
          
          {/* Vertical separator */}
          <div className="h-6 w-[1px] bg-bg-elevated"></div>
          
          {/* Current Community Display */}
          {currentCommunity && (
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                {currentCommunity.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={currentCommunity.thumbnailUrl} 
                    alt={currentCommunity.name}
                    className="w-6 h-6 rounded-md object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
                    <span className="text-xs font-serif text-white">
                      {currentCommunity.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-text-primary truncate max-w-[120px]">
                {currentCommunity.name}
              </span>
            </div>
          )}
          
          {/* Community Dropdown Component */}
          <CommunityDropdown
            currentCommunity={currentCommunity}
            communities={communities}
            onCreateCommunity={onCreateCommunity}
            onExploreCommunities={onExploreCommunities}
          />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Avatar with dropdown menu */}
          {user ? (
            <div className="relative">
              <button
                ref={triggerRef}
                aria-label={`User menu for ${user.name || 'account'}`}
                className="cursor-pointer flex items-center gap-2 rounded-full p-1 hover:bg-bg-elevated transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
              >
                <Avatar src={user.image} alt={user.name || "User"} size="md" />
              </button>
              
              {/* Logout Dialog */}
              {isLogoutDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                  <div className="bg-bg-base rounded-lg p-6 max-w-sm w-full mx-4">
                    <h2 className="text-lg font-semibold mb-2">Logout</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      Are you sure you want to logout?
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button 
                        className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                        onClick={() => setIsLogoutDialogOpen(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/80 transition-colors"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">Sign in</Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>

    {/* User dropdown rendered outside header stacking context */}
    {isUserMenuOpen && isMounted && createPortal(
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ 
          duration: 0.15,
          ease: [0.4, 0, 0.2, 1]
        }}
        style={{
          position: 'fixed',
          top: userMenuPos.top,
          right: userMenuPos.right,
          zIndex: 50,
        }}
        className="w-[180px]"
        onClick={(e) => e.stopPropagation()}
      >
        <Dropdown>
        <MenuItem
          index={0}
          icon={User}
          label="Profile"
          onSelect={() => {
            setIsUserMenuOpen(false);
            onProfileClick?.();
          }}
        />
        <MenuItem
          index={1}
          icon={Settings}
          label="Settings"
          onSelect={() => {
            setIsUserMenuOpen(false);
            onSettingsClick?.();
          }}
        />
       
        <MenuItem
          index={2}
          icon={HelpCircle}
          label="Help"
          onSelect={() => {
            setIsUserMenuOpen(false);
            router.push("/help");
          }}
        />
       
        <MenuItem
          index={3}
          icon={LogOut}
          label="Logout"
          destructive
          onSelect={() => {
            setIsUserMenuOpen(false);
            setIsLogoutDialogOpen(true);
          }}
        />
      </Dropdown>
      </motion.div>,
      document.body
    )}
    </>
  );
}
