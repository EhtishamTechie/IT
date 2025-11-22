import React from 'react';

/**
 * Optimized Loading Screen Component
 * Lightweight, no external dependencies
 * Shows immediately while main bundle loads
 */
const LoadingScreen = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Logo */}
      <div style={{
        marginBottom: '30px',
        animation: 'fadeIn 0.5s ease-in'
      }}>
        <img 
          src="/IT logo.jpeg" 
          alt="International Tijarat" 
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
      </div>

      {/* Loading Spinner */}
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #f97316',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>

      {/* Loading Text */}
      <p style={{
        marginTop: '20px',
        color: '#6b7280',
        fontSize: '16px',
        fontWeight: '500',
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        Loading International Tijarat...
      </p>

      {/* Inline Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />
    </div>
  );
};

export default LoadingScreen;
