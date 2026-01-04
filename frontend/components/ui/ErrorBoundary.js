'use client';

import { Component } from 'react';

/**
 * Error boundary component to gracefully handle runtime errors.
 * Particularly useful for catching errors in 3D/animation components on mobile.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Optional: Report to error tracking service
    if (typeof window !== 'undefined' && window.__errorReporter) {
      window.__errorReporter(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback
      return (
        <div className="flex items-center justify-center p-4 min-h-[100px]">
          <div className="text-center">
            {this.props.showError && (
              <p className="text-sm text-gray-500 mb-2">
                Something went wrong
              </p>
            )}
            {this.props.children && (
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-sm text-baucis-green-600 hover:text-baucis-green-700 underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper for components that might fail on mobile/low-power devices.
 * Use this around 3D, animation, or heavy components.
 */
export function SafeComponent({ children, fallback = null }) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
