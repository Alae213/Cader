import Link from "next/link";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      {/* Header */}
      <header className="border-b border-bg-elevated">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-display text-text-primary">
            Cader
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-12">
          <Heading size="8" className="mb-4">
            How can we help?
          </Heading>
          <Text size="4" theme="secondary">
            Find answers to common questions about Cader
          </Text>
        </div>

        {/* Getting Started */}
        <section className="mb-12">
          <Heading size="6" className="mb-4">
            Getting Started
          </Heading>
          <div className="space-y-6">
            <HelpCard
              question="How do I create a community?"
              answer="Click 'Create my Community' on the home page. You'll need to sign up or log in first. Then follow the steps to name your community, set pricing, and configure payment settings."
            />
            <HelpCard
              question="What is a community slug?"
              answer="A slug is the unique URL for your community (e.g., cader.com/my-community). It must be unique and cannot be changed once your community has members."
            />
            <HelpCard
              question="Can I offer free communities?"
              answer="Yes! You can create free communities with no membership fees. You can also set up paid communities with monthly or one-time payments."
            />
          </div>
        </section>

        {/* Payments */}
        <section className="mb-12">
          <Heading size="6" className="mb-4">
            Payments & Billing
          </Heading>
          <div className="space-y-6">
            <HelpCard
              question="How do I receive payments?"
              answer="Cader uses Chargily Pay, Algeria's leading payment gateway. Connect your Chargily account during community setup to receive payments directly to your Algerian bank account."
            />
            <HelpCard
              question="What payment methods are supported?"
              answer="Through Chargily, you can accept EDAHABIA (Algerie Post) and CIB (SATIM) cards. Your members can pay using any Algerian debit or credit card."
            />
            <HelpCard
              question="When do I get paid?"
              answer="Payments are processed automatically through Chargily. Funds are transferred to your connected bank account according to Chargily's payment schedule."
            />
            <HelpCard
              question="Is there a platform fee?"
              answer="Cader charges a platform subscription of 2,000 DZD/month when your community reaches 50 members. This helps us maintain and improve the platform."
            />
          </div>
        </section>

        {/* Membership & Access */}
        <section className="mb-12">
          <Heading size="6" className="mb-4">
            Membership & Access
          </Heading>
          <div className="space-y-6">
            <HelpCard
              question="How do members join my community?"
              answer="Share your community link with potential members. They can join by clicking the link and following the signup process. Free communities allow immediate access; paid communities require payment."
            />
            <HelpCard
              question="Can I restrict access to specific content?"
              answer="Yes! You can set different access levels for classrooms: open to all members, level-gated (based on community points), price-gated (one-time payment), or both."
            />
            <HelpCard
              question="What is the level system?"
              answer="Members earn points by posting, commenting, receiving upvotes, and completing lessons. Points unlock higher levels (L1-L5) and can grant access to exclusive content."
            />
          </div>
        </section>

        {/* Troubleshooting */}
        <section>
          <Heading size="6" className="mb-4">
            Troubleshooting
          </Heading>
          <div className="space-y-6">
            <HelpCard
              question="My payment isn't working"
              answer="Make sure your Chargily API keys are correctly configured in your community settings. Also verify that your community has valid pricing set."
            />
            <HelpCard
              question="I can't access a paid classroom"
              answer="Ensure you've completed payment for the classroom. If you've already paid, try refreshing the page or clearing your browser cache."
            />
            <HelpCard
              question="How do I contact support?"
              answer="If you can't find the answer here, please reach out through our support channels. We're here to help!"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-bg-elevated mt-12">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <Text size="2" theme="secondary">
            © 2026 Cader. All rights reserved.
          </Text>
        </div>
      </footer>
    </div>
  );
}

function HelpCard({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-bg-surface rounded-xl p-6 border border-bg-elevated">
      <Heading size="5" className="mb-2">
        {question}
      </Heading>
      <Text size="3" theme="secondary">
        {answer}
      </Text>
    </div>
  );
}
