'use client';

import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MonsoonProofProvider } from '@/context/MonsoonProofContext';
import Sidebar from '@/components/Sidebar';

function LayoutManager({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push('/login');
    }
  }, [user, loading, isLoginPage, router]);

  const [isClient, setIsClient] = React.useState(false);
  useEffect(() => setIsClient(true), []);

  if (loading) {
    const hasAuthToken = isClient && typeof window !== 'undefined' && 
      Object.keys(window.sessionStorage).some(k => k.startsWith('firebase:authUser:'));

    if (hasAuthToken && !isLoginPage) {
      return (
        <div className="dashboard-layout" style={{ opacity: 0.6, pointerEvents: 'none' }}>
          <Sidebar />
          <main className="dashboard-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner-large" style={{ width: '32px', height: '32px', borderTopColor: '#4f46e5' }}></div>
          </main>
        </div>
      );
    }

    return (
      <div className="loading-screen">
        <div className="spinner-large"></div>
        <p>Authenticating session...</p>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #090d16;
            color: #f1f5f9;
            font-family: sans-serif;
          }
          .spinner-large {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return null;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppProvider>
        <MonsoonProofProvider>
          <LayoutManager>
            {children}
          </LayoutManager>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-lg)',
              },
              success: {
                iconTheme: { primary: '#164E41', secondary: '#fff' },
                style: { border: '1px solid var(--color-success-100)', background: '#fff' },
              },
              error: {
                iconTheme: { primary: '#dc2626', secondary: '#fff' },
                style: { border: '1px solid var(--color-danger-100)', background: '#fff' },
              },
            }}
          />
        </MonsoonProofProvider>
      </AppProvider>
    </AuthProvider>
  );
}
