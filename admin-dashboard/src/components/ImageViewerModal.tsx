'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function ImageViewerModal({ isOpen, imageUrl, onClose }: ImageViewerModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '24px',
          zIndex: 100000,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
      >
        ✕
      </button>

      <img
        src={imageUrl}
        alt="Full screen view"
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          cursor: 'default',
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
