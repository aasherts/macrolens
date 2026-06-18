import React from 'react';

// Catches render errors anywhere below it so one broken widget can't take
// down the entire page — shows a friendly recovery screen instead of a
// blank white page.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('MacroLens crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: '#f4f1ea',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          padding: '20px',
        }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 600, color: '#1a1510' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '13px', color: '#6b5e52', maxWidth: '360px', lineHeight: 1.6 }}>
            MacroLens hit an unexpected error. Reloading usually fixes it — your watchlist and saved settings are untouched.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #a4391c, #b08a3e)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Reload MacroLens
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
