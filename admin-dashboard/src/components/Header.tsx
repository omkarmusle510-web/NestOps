'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const router = useRouter();
  const { notifications, isSidebarOpen, setSidebarOpen } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle clicking outside notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('System state updated and SLA checks executed!', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }, 1000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    
    router.push(`/complaints?search=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="header" id="dashboard-header" style={{ position: 'relative', zIndex: 50 }}>
      <div className="header-left" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
        <button 
          className="header-icon-btn mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>
      
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {action && (
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
            {action}
          </div>
        )}
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {searchOpen && (
            <form onSubmit={handleSearchSubmit} className="animate-fadeIn">
              <input
                type="text"
                placeholder="Search complaints, flats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  padding: '6px 12px',
                  height: '34px',
                  width: '200px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-primary-200)',
                }}
                autoFocus
              />
            </form>
          )}
          <button 
            className={`header-icon-btn ${searchOpen ? 'active' : ''}`} 
            id="header-search-btn" 
            title="Search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="5.5" />
              <path d="M15.5 15.5l-3-3" />
            </svg>
          </button>
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className="header-icon-btn" 
            id="header-notifications-btn" 
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ position: 'relative' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.73 13H4.27a1 1 0 01-.86-1.5L4.5 9.5V7a4.5 4.5 0 019 0v2.5l1.09 2A1 1 0 0113.73 13z" />
              <path d="M7 13v1a2 2 0 004 0v-1" />
            </svg>
            {unreadCount > 0 && (
              <span 
                className="header-notification-dot" 
                style={{ 
                  background: '#ef4444', 
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }} 
              />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div 
              className="animate-fadeIn"
              style={{
                position: 'absolute',
                top: '45px',
                right: '0',
                width: '320px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--color-primary-100)',
                zIndex: 100,
                maxHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-primary-50)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary-900)' }}>Notifications</span>
                <span style={{
                  fontSize: '11px',
                  background: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 500,
                }}>
                  {unreadCount} unread
                </span>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '300px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-neutral-400)', fontSize: '13px' }}>
                    No system alerts or notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--color-primary-50)',
                        background: notif.read ? 'transparent' : 'rgba(59, 130, 246, 0.03)',
                        transition: 'background 0.2s',
                        fontSize: '13px',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-neutral-800)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {notif.title}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-neutral-400)', whiteSpace: 'nowrap' }}>
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ color: 'var(--color-neutral-600)', margin: 0, fontSize: '12px', lineHeight: 1.4 }}>
                        {notif.message}
                      </p>
                      {notif.complaintId && (
                        <Link 
                          href={`/complaints/${notif.complaintId}`}
                          onClick={() => {
                            setTimeout(() => setShowNotifications(false), 100);
                          }}
                          style={{
                            display: 'inline-block',
                            marginTop: '6px',
                            fontSize: '11px',
                            color: 'var(--color-primary-600)',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          View Complaint Details →
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>

              <Link 
                href="/activity-logs"
                onClick={() => {
                  setTimeout(() => setShowNotifications(false), 100);
                }}
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  background: 'var(--color-primary-50)',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-primary-700)',
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                View System Activity Logs
              </Link>
            </div>
          )}
        </div>

        {/* Refresh */}
        <button 
          className="header-icon-btn" 
          id="header-refresh-btn" 
          title="Refresh data"
          onClick={handleRefresh}
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 18 18" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{
              transition: 'transform 1s ease',
              transform: isRefreshing ? 'rotate(360deg)' : 'none'
            }}
          >
            <path d="M1 1v5h5" />
            <path d="M17 17v-5h-5" />
            <path d="M2.5 6.5A7 7 0 0115.36 4.64M15.5 11.5A7 7 0 012.64 13.36" />
          </svg>
        </button>
      </div>
    </header>
  );
}
