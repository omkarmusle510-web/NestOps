'use client';

import React from 'react';
import { useMonsoonProof } from '@/context/MonsoonProofContext';
import type { DemoRole, SocietyId } from '@/lib/monsoonproof/types';

export default function DemoRoleBar() {
  const { demoRole, setDemoRole, activeSocietyId, setActiveSociety, societies } =
    useMonsoonProof();

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        alignItems: 'center',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--surface-primary)',
        border: '1px solid var(--color-neutral-200)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-6)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          color: 'var(--color-neutral-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Demo context
      </span>
      <label className="form-group" style={{ gap: 4, margin: 0 }}>
        <span className="form-label" style={{ fontSize: 11 }}>
          Role
        </span>
        <select
          className="form-select"
          value={demoRole}
          onChange={(e) => setDemoRole(e.target.value as DemoRole)}
          style={{ minWidth: 180 }}
        >
          <option value="society_manager">Society Manager</option>
          <option value="federation_rep">Federation Representative</option>
        </select>
      </label>
      <label className="form-group" style={{ gap: 4, margin: 0 }}>
        <span className="form-label" style={{ fontSize: 11 }}>
          Active society
        </span>
        <select
          className="form-select"
          value={activeSocietyId}
          onChange={(e) => setActiveSociety(e.target.value as SocietyId)}
          style={{ minWidth: 180 }}
          disabled={demoRole === 'federation_rep'}
        >
          {societies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
