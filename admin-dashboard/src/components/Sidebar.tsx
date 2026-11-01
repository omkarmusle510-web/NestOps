'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useMonsoonProof } from '@/context/MonsoonProofContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="8" rx="1.5" />
      <rect x="11" y="2" width="7" height="5" rx="1.5" />
      <rect x="2" y="12" width="7" height="6" rx="1.5" />
      <rect x="11" y="9" width="7" height="9" rx="1.5" />
    </svg>
  ),
  reports: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2H4a2 2 0 00-2 2v10a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2V4a2 2 0 00-2-2z" />
      <path d="M7 7h6M7 10h4" />
    </svg>
  ),
  shared: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18V7l7-5 7 5v11" />
      <path d="M3 18h14" />
      <rect x="7" y="10" width="6" height="8" />
      <path d="M10 10v8" />
    </svg>
  ),
  federation: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="14" cy="7" r="2.5" />
      <path d="M2 17v-1.5a3.5 3.5 0 013.5-3.5h1A3.5 3.5 0 0110 15.5V17" />
      <path d="M10 17v-1.5a3.5 3.5 0 013.5-3.5h1A3.5 3.5 0 0118 15.5V17" />
    </svg>
  ),
  workOrders: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l.7-.7a4 4 0 00-5.6-5.6l-.7.7a1 1 0 000 1.4z" />
      <path d="M11 9L4.5 15.5a2 2 0 002.8 2.8L13.8 11.8" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v2M10 16v2M3.5 5.5l1.4 1.4M15.1 15.1l1.4 1.4M2 10h2M16 10h2M3.5 14.5l1.4-1.4M15.1 4.9l1.4-1.4" />
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18H4a2 2 0 01-2-2V4a2 2 0 012-2h3M13 14l4-4-4-4M17 10H7" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const { adminProfile, signOut } = useAuth();
  const { isSidebarOpen, setSidebarOpen } = useApp();
  const { overviewCounts, pendingHandoffs, demoRole } = useMonsoonProof();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: Icons.dashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          label: 'Incoming Reports',
          href: '/incidents',
          icon: Icons.reports,
          badge: overviewCounts.incomingReports || undefined,
        },
        {
          label: 'Shared Cases',
          href: '/shared-cases',
          icon: Icons.shared,
          badge: overviewCounts.openSharedCases || undefined,
        },
        {
          label: 'Federation Inbox',
          href: '/federation',
          icon: Icons.federation,
          badge: pendingHandoffs.length || undefined,
        },
        {
          label: 'Work Orders',
          href: '/work-orders',
          icon: Icons.workOrders,
          badge: overviewCounts.activeWorkOrders || undefined,
        },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/settings', icon: Icons.settings },
      ],
    },
  ];

  return (
    <>
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 35,
          }}
        />
      )}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`} id="main-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">M</div>
          <div>
            <div className="sidebar-title">NestOps</div>
            <div className="sidebar-subtitle">Drainage Coordination</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <React.Fragment key={section.title}>
              <div className="sidebar-section-label">{section.title}</div>
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="sidebar-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div
          className="sidebar-footer"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}
        >
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {adminProfile?.name ? adminProfile.name[0] : 'M'}
            </div>
            <div>
              <div
                className="sidebar-user-name"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '130px',
                }}
              >
                {adminProfile?.name || 'Demo Admin'}
              </div>
              <div className="sidebar-user-role" style={{ textTransform: 'capitalize' }}>
                {demoRole === 'federation_rep' ? 'Federation Rep' : 'Society Manager'}
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            className="sidebar-logout-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s',
              width: '100%',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            {Icons.logout}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
