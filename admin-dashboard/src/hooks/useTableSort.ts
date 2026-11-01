import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export function useTableSort<T>(data: T[], defaultField: keyof T | null = null, defaultDirection: SortDirection = null) {
  const [sortField, setSortField] = useState<keyof T | null>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
      else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection || !data) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle undefined/null
      if (aValue === undefined || aValue === null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue === undefined || bValue === null) return sortDirection === 'asc' ? -1 : 1;
      
      // Basic string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aLower = aValue.toLowerCase();
        const bLower = bValue.toLowerCase();
        if (aLower < bLower) return sortDirection === 'asc' ? -1 : 1;
        if (aLower > bLower) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Date comparison (assuming strings that can be parsed as dates)
      if (typeof aValue === 'string' && typeof bValue === 'string' && !isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
        return sortDirection === 'asc' 
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      
      // Fallback
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  return { sortedData, sortField, sortDirection, handleSort };
}
