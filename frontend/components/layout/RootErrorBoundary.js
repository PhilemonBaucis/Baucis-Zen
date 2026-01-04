'use client';

import { Component } from 'react';

/**
 * Root-level error boundary to catch any uncaught errors in the application.
 * This is critical for mobile devices where JavaScript errors can cause blank screens.
 */
export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error('[RootErrorBoundary] Caught error:', error, errorInfo);

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && window.__errorReporter) {
      window.__errorReporter(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Clear error and try to reload
    this.setState({ hasError: false, error: null });

    // Force a full page reload if retry fails
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.reload();
      }
    }, 1000);
  };

  render() {
    if (this.state.hasError) {
      // Minimal fallback UI - works even if CSS fails to load
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textAlign: 'center',
          }}
          data-content-loaded="true"
        >
          {/* Logo */}
          <img
            src="/Baucis Zen - Logo.svg"
            alt="Baucis Zen"
            style={{
              width: 80,
              height: 80,
              marginBottom: 24,
              opacity: 0.7,
            }}
          />

          {/* Error message */}
          <h1
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: '#374151',
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#6b7280',
              marginBottom: 24,
              maxWidth: 300,
            }}
          >
            We're sorry, but there was an error loading this page.
          </p>

          {/* Retry button */}
          <button
            onClick={this.handleRetry}
            style={{
              padding: '12px 24px',
              backgroundColor: '#7ca163',
              color: '#fff',
              border: 'none',
              borderRadius: 24,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            Try Again
          </button>

          {/* Reload link */}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#7ca163',
              border: '1px solid #7ca163',
              borderRadius: 24,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>

          {/* Error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                marginTop: 24,
                padding: 12,
                backgroundColor: '#f3f4f6',
                borderRadius: 8,
                maxWidth: '90%',
                textAlign: 'left',
                fontSize: 12,
                color: '#374151',
              }}
            >
              <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
                Error Details
              </summary>
              <pre style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default RootErrorBoundary;
