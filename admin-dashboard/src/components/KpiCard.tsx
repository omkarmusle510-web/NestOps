'use client';

import React from 'react';
import Link from 'next/link';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant: 'primary' | 'danger' | 'warning' | 'success' | 'info';
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  href?: string;
}

export default function KpiCard({ icon, label, value, variant, trend, href }: KpiCardProps) {
  const content = (
    <div className={`kpi-card kpi-card--${variant} stagger-item`} style={href ? { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' } : {}}>
      <div className={`kpi-icon kpi-icon--${variant}`}>
        {icon}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {trend && (
        <div className={`kpi-trend kpi-trend--${trend.direction}`}>
          <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
  }

  return content;
}
