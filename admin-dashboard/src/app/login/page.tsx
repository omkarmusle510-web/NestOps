'use client';

// ──────────────────────────────────────
// Login Page — Premium Auth UI
// ──────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, sendOtp, confirmOtp, loading, error, clearError } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    
    setLocalLoading(true);
    setLocalError(null);
    clearError();

    const success = await sendOtp(phoneNumber);
    setLocalLoading(false);
    
    if (success) {
      setOtpSent(true);
    } else {
      setLocalError(error || 'Failed to send verification SMS.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) {
      setLocalError('Please enter a 6-digit code.');
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    clearError();

    const success = await confirmOtp(otpCode);
    setLocalLoading(false);
    
    if (success) {
      router.push('/dashboard');
    } else {
      setLocalError(error || 'The SMS verification code is invalid.');
    }
  };

  const resetForm = () => {
    setOtpSent(false);
    setOtpCode('');
    setLocalError(null);
    clearError();
  };

  // Render Premium Auth Screen
  return (
    <div className="login-container">
      {/* Background Neon Glowing Orbs */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <div className="login-card">
        <div id="recaptcha-container"></div>
        <div className="login-header">
          <div className="login-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 21H5a2 2 0 0 1-2-2V9.5a1 1 0 0 1 .4-.8l7-5.25a2 2 0 0 1 2.4 0l7 5.25a1 1 0 0 1 .4.8V19a2 2 0 0 1-2 2Zm-8-2h2v-4h-2v4Zm4 0h2v-6H7v6h2v-4h6v4ZM5 9.98V19h14V9.98l-7-5.25-7 5.25Z"/>
            </svg>
          </div>
          <h1>SocietySync</h1>
          <p>Admin Operations Dashboard</p>
        </div>

        {/* Local & Auth Errors */}
        {(localError || error) && (
          <div className="login-error-banner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z"/>
            </svg>
            <span>{localError || error}</span>
          </div>
        )}

        {!otpSent ? (
          /* Phone Input Form */
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleSendOtp(e); }}>
            <div className="input-group">
              <label htmlFor="phone">Registered Mobile Number</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="e.g., +1 555-010-0003"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleSendOtp(e); } }}
                  disabled={localLoading || loading}
                  className="login-input"
                />
              </div>
              <span className="input-helper">Use your registered admin number</span>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={localLoading || loading}
              className="login-btn glow-btn"
            >
              {localLoading || loading ? <span className="spinner"></span> : 'Send OTP Code'}
            </button>
          </form>
        ) : (
          /* OTP Input Form */
          <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(e); }}>
            <div className="input-group">
              <label htmlFor="otp">Enter 6-Digit OTP</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleVerifyOtp(e); } }}
                  disabled={localLoading || loading}
                  className="login-input center-text"
                />
              </div>
              <div className="otp-actions">
                <span className="input-helper">Sent to {phoneNumber}</span>
                <button type="button" onClick={resetForm} className="text-btn">Edit Number</button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={localLoading || loading}
              className="login-btn glow-btn"
            >
              {localLoading || loading ? <span className="spinner"></span> : 'Confirm & Authenticate'}
            </button>
          </form>
        )}
      </div>

      <style jsx global>{`
        /* Next.js client layout overrides for login */
        .login-container {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #090d16;
          font-family: var(--font-family, sans-serif);
          overflow: hidden;
          padding: 24px;
        }

        /* Neon glowing backgrounds */
        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          z-index: 1;
          pointer-events: none;
        }
        .orb-1 {
          width: 400px;
          height: 400px;
          background: #4f46e5;
          top: 10%;
          left: 15%;
        }
        .orb-2 {
          width: 350px;
          height: 350px;
          background: #0d9488;
          bottom: 15%;
          right: 15%;
        }

        /* Glassmorphic card */
        .login-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 440px;
          background: rgba(21, 31, 50, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
        }

        /* Typography styling */
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #4f46e5 0%, #0d9488 100%);
          color: white;
          margin-bottom: 16px;
          box-shadow: 0 8px 16px rgba(79, 70, 229, 0.25);
        }
        .login-logo svg {
          width: 28px;
          height: 28px;
        }
        .login-header h1 {
          color: #f8fafc;
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }
        .login-header p {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
        }

        /* Error banner */
        .login-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(220, 38, 38, 0.12);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 24px;
          color: #fca5a5;
          font-size: 13px;
          line-height: 1.4;
        }
        .login-error-banner svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          color: #ef4444;
          margin-top: 2px;
        }

        /* Form elements */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 500;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
          display: flex;
          align-items: center;
        }
        .input-icon svg {
          width: 18px;
          height: 18px;
        }
        .login-input {
          width: 100%;
          height: 48px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0 16px 0 44px;
          color: #f1f5f9;
          font-size: 15px;
          transition: all 0.2s ease;
          outline: none;
        }
        .login-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
          background: rgba(15, 23, 42, 0.6);
        }
        .center-text {
          text-align: center;
          letter-spacing: 4px;
          font-size: 18px;
          font-weight: 700;
          padding-left: 16px;
        }
        .input-helper {
          color: #64748b;
          font-size: 11px;
        }
        .otp-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }
        .text-btn {
          background: none;
          border: none;
          color: #3b82f6;
          font-size: 11px;
          cursor: pointer;
          padding: 0;
          font-weight: 500;
        }
        .text-btn:hover {
          text-decoration: underline;
        }

        /* Buttons */
        .login-btn {
          height: 48px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #4f46e5 0%, #0d9488 100%);
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Loading spinner */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
