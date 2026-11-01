'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: number;
}

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 540 }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay animate-fadeIn"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="modal-content" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
