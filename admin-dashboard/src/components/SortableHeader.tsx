import React from 'react';
import { SortDirection } from '../hooks/useTableSort';

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSortField: string | null;
  sortDirection: SortDirection;
  onSort: (field: any) => void;
  className?: string;
}

export function SortableHeader({ label, field, currentSortField, sortDirection, onSort, className = '' }: SortableHeaderProps) {
  const isActive = currentSortField === field;
  
  return (
    <th 
      onClick={() => onSort(field)} 
      style={{ cursor: 'pointer', userSelect: 'none' }}
      className={`${isActive ? 'sorted-column' : ''} ${className}`.trim()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {label}
        <span style={{ display: 'inline-flex', flexDirection: 'column', fontSize: '10px', color: isActive ? 'var(--color-primary-600)' : 'var(--color-neutral-400)', marginLeft: '2px' }}>
          <span style={{ opacity: isActive && sortDirection === 'asc' ? 1 : 0.3, height: '10px' }}>▲</span>
          <span style={{ opacity: isActive && sortDirection === 'desc' ? 1 : 0.3, marginTop: '-2px', height: '10px' }}>▼</span>
        </span>
      </div>
    </th>
  );
}
