"use client";

import { Component, ReactNode } from "react";
import { Heading, Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <Heading size="h3" className="mb-2">Something went wrong</Heading>
          <Text theme="secondary" className="mb-6 max-w-md">
            We encountered an unexpected error. Please try refreshing the page or return to the home page.
          </Text>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button onClick={() => window.location.href = "/"}>
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Page-level error boundary for app directory
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}