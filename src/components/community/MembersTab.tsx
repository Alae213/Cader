"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Heading, Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/shared/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { WILAYAS } from "@/lib/constants";

interface MembersTabProps {
  communityId: string;
  isOwner: boolean;
  isAdmin: boolean;
}

// Simplified Wilaya map - displays a grid of clickable buttons since full SVG is complex
function WilayaMap({ 
  onSelectWilaya, 
  selectedWilaya,
  wilayaCounts,
}: { 
  onSelectWilaya: (wilaya: string | null) => void;
  selectedWilaya: string | null;
  wilayaCounts: Record<string, number>;
}) {
  return (
    <div className="bg-bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <Heading size="4" className="text-text-primary">Algeria Map</Heading>
        {selectedWilaya && (
          <Button variant="ghost" size="sm" onClick={() => onSelectWilaya(null)}>
            Clear Filter
          </Button>
        )}
      </div>
      
      {/* Simplified map representation - grid of wilayas */}
      <div className="grid grid-cols-6 gap-1 max-h-96 overflow-y-auto">
        {WILAYAS.map((wilaya) => {
          const count = wilayaCounts[wilaya] || 0;
          const isSelected = selectedWilaya === wilaya;
          
          return (
            <button
              key={wilaya}
              onClick={() => onSelectWilaya(isSelected ? null : wilaya)}
              className={`
                relative px-1 py-2 text-xs rounded transition-all
                ${isSelected 
                  ? "bg-accent text-white" 
                  : count > 0 
                    ? "bg-accent/20 text-text-primary hover:bg-accent/40" 
                    : "bg-bg-elevated text-text-muted hover:bg-bg-canvas"
                }
              `}
              title={`${wilaya}: ${count} members`}
            >
              <div className="truncate">{wilaya.substring(0, 8)}</div>
              <div className={`text-[10px] ${isSelected ? "text-white/80" : count > 0 ? "text-accent" : "text-text-muted"}`}>
                {count}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-accent/20 rounded" />
          <span>Has members</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-bg-elevated rounded" />
          <span>No members</span>
        </div>
      </div>
    </div>
  );
}

export function MembersTab({ communityId, isOwner, isAdmin }: MembersTabProps) {
  const { userId: clerkId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  // Get current user
  const currentUser = useQuery(api.functions.users.getUserByClerkId, clerkId ? { clerkId } : "skip");
  
  // Get members list
  const members = useQuery(
    api.functions.memberships.listMembers,
    { communityId: communityId as Id<"communities"> }
  );
  
  // Get wilaya counts
  const wilayaCounts = useQuery(
    api.functions.memberships.getMemberCountByWilaya,
    { communityId: communityId as Id<"communities"> }
  );

  const blockMember = useMutation(api.functions.memberships.blockMember);

  // Filter members based on search and wilaya
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    
    return members
      .filter((member): member is NonNullable<typeof member> => member != null)
      .filter((member) => {
        // Search filter
        const matchesSearch = !searchQuery || 
          member.displayName.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Wilaya filter
        const matchesWilaya = !selectedWilaya || member.wilaya === selectedWilaya;
        
        return matchesSearch && matchesWilaya;
      });
  }, [members, searchQuery, selectedWilaya]);

  const handleBlockMember = async () => {
    if (!selectedMemberId) return;
    try {
      await blockMember({ membershipId: selectedMemberId as Id<"memberships"> });
      setShowBlockConfirm(false);
      setSelectedMemberId(null);
    } catch (error) {
      console.error("Failed to block member:", error);
    }
  };

  const selectedMember = members?.find(m => m?.membershipId === selectedMemberId) ?? null;

  if (!members || !wilayaCounts) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Skeleton className="h-96" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-20 mb-4" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Wilaya Map */}
        <div className="lg:col-span-1">
          <WilayaMap 
            onSelectWilaya={setSelectedWilaya}
            selectedWilaya={selectedWilaya}
            wilayaCounts={wilayaCounts}
          />
        </div>

        {/* Right: Member List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            {selectedWilaya && (
              <Badge variant="accent">
                {selectedWilaya}: {filteredMembers.length} members
              </Badge>
            )}
          </div>

          {/* Member list */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <Text size="3" theme="muted">
                  {searchQuery || selectedWilaya 
                    ? "No members found matching your search" 
                    : "No members yet"
                  }
                </Text>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.membershipId}
                  onClick={() => setSelectedMemberId(member.membershipId)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${selectedMemberId === member.membershipId 
                      ? "bg-accent/20 border border-accent" 
                      : "bg-bg-surface hover:bg-bg-elevated border border-transparent"
                    }
                  `}
                >
                  <Avatar 
                    src={member.avatarUrl} 
                    name={member.displayName} 
                    fallback={member.displayName.substring(0, 2).toUpperCase()}
                    className="w-10 h-10"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Text size="2" className="font-medium text-text-primary truncate">
                        {member.displayName}
                      </Text>
                      <Badge variant="secondary" className="text-[10px]">
                        L{member.level}
                      </Badge>
                      {member.role === "owner" && (
                        <Badge variant="accent" className="text-[10px]">Owner</Badge>
                      )}
                      {member.role === "admin" && (
                        <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                      )}
                    </div>
                    <Text size="1" theme="muted">
                      {member.wilaya || "No wilaya"} • Joined {new Date(member.createdAt).toLocaleDateString("en-GB")}
                    </Text>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Member profile popover / actions */}
      {selectedMemberId && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedMemberId(null)}>
          <div className="bg-bg-surface rounded-lg border border-border p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <Avatar 
                src={selectedMember.avatarUrl} 
                name={selectedMember.displayName} 
                fallback={selectedMember.displayName.substring(0, 2).toUpperCase()}
                className="w-16 h-16"
              />
              <div>
                <Heading size="4" className="text-text-primary">
                  {selectedMember.displayName}
                </Heading>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">Level {selectedMember.level}</Badge>
                  <Text size="1" theme="muted">{selectedMember.totalPoints} points</Text>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <Text size="2" theme="muted">Wilaya</Text>
                <Text size="2" className="text-text-primary">{selectedMember.wilaya || "Not set"}</Text>
              </div>
              <div className="flex justify-between">
                <Text size="2" theme="muted">Member since</Text>
                <Text size="2" className="text-text-primary">
                  {new Date(selectedMember.createdAt).toLocaleDateString("en-GB")}
                </Text>
              </div>
              <div className="flex justify-between">
                <Text size="2" theme="muted">Subscription</Text>
                <Badge variant={selectedMember.subscriptionType === "free" ? "secondary" : "accent"}>
                  {selectedMember.subscriptionType || "free"}
                </Badge>
              </div>
            </div>

            {/* Owner/Admin actions */}
            {(isOwner || isAdmin) && selectedMember.role !== "owner" && (
              <div className="border-t border-border pt-4">
                {showBlockConfirm ? (
                  <div className="space-y-2">
                    <Text size="2" theme="secondary">
                      Are you sure you want to block {selectedMember.displayName}?
                    </Text>
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm" onClick={handleBlockMember}>
                        Confirm Block
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowBlockConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="danger" 
                    size="sm" 
                    onClick={() => setShowBlockConfirm(true)}
                  >
                    Block Member
                  </Button>
                )}
              </div>
            )}

            <Button variant="ghost" className="w-full mt-4" onClick={() => setSelectedMemberId(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
