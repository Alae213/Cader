"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, SignUpButton, UserButton } from "@clerk/nextjs";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { CreateCommunityModal } from "@/components/community/CreateCommunityModal";

export default function HomePage() {
  const { isSignedIn } = useUser();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-canvas flex flex-col">
      {/* Header */}
      <header className="border-b border-bg-elevated">
        <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-display text-text-primary">
            Cader
          </Link>
          <nav className="flex items-center gap-4">
            {isSignedIn && <UserButton />}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 w-full items-center justify-center px-4 py-20">
        <div className="w-full flex flex-col mx-auto max-w-3xl text-center gap-2">
          <Heading size="9">
            Meet Education Business Again
          </Heading>
          
          <Text size="4" theme="secondary">
            Build paid courses, and monetize in Algerian Dinars (DZD). 
          </Text>
          
          <div className="flex flex-col sm:flex-row items-center justify-center my-6 gap-4">
            {isSignedIn ? (
              <Button 
                variant="primary" 
                size="md"
                onClick={() => setModalOpen(true)}
              >
                Create my Community
              </Button>
            ) : (
              <SignUpButton mode="modal">
                <Button variant="primary" size="md">
                  Create my Community
                </Button>
              </SignUpButton>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-bg-elevated">
        <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
          <Text size="2" theme="secondary">
            © 2026 Cader. All rights reserved.
          </Text>
          <Link href="/help" className="text-text-secondary hover:text-text-primary transition-colors text-sm">
            Help
          </Link>
        </div>
      </footer>

      {/* Community Creation Modal */}
      <CreateCommunityModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </div>
  );
}
