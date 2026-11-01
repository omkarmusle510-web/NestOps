'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import type { Notice } from '@/types';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { formatDate } from '@/lib/mock-data';

export default function NoticesPage() {
  const { isSimulated } = useAuth();
  const { notices: contextNotices, addNotice: contextAddNotice, updateNotice: contextUpdateNotice, deleteNotice: contextDeleteNotice } = useApp();

  const [dbNotices, setDbNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(!isSimulated);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('General');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (isSimulated) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
      setDbNotices(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot error, falling back to simulation:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSimulated]);

  const notices = isSimulated ? contextNotices : dbNotices;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    
    try {
      if (editId) {
        await updateDoc(doc(db, 'notices', editId), { title, topic, content });
      } else {
        await addDoc(collection(db, 'notices'), {
          title,
          topic,
          content,
          author: 'Admin Team',
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setTitle('');
      setTopic('General');
      setContent('');
      setEditId(null);
    } catch (error) {
      console.error('Error adding notice: ', error);
      alert('Failed to publish notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  function getTopicBadgeClass(topicName: string) {
    switch (topicName.toLowerCase()) {
      case 'maintenance':
        return 'badge badge--need_tools';
      case 'events':
      case 'events & meetings':
        return 'badge badge--visited';
      case 'security':
      case 'security alert':
        return 'badge badge--escalated';
      case 'billing':
      case 'billing & rules':
        return 'badge badge--awaiting_confirmation';
      default:
        return 'badge badge--submitted';
    }
  }

  const handleEdit = (notice: Notice) => {
    setEditId(notice.id);
    setTitle(notice.title);
    setTopic(notice.topic);
    setContent(notice.content);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this notice?')) {
      await contextDeleteNotice(id);
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setTitle('');
    setTopic('General');
    setContent('');
    setIsModalOpen(true);
  };

  return (
    <>
      <Header title="Official Notices" subtitle="Publish and manage society announcements" />

      <div className="dashboard-content animate-fadeIn">
        {/* Notices Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-neutral-900)' }}>
            Published Announcements ({notices.length})
          </h2>
          <button 
            className="btn btn--primary btn--sm" 
            onClick={openAddModal}
            id="btn-publish-notice"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Publish Notice
          </button>
        </div>

        {/* Notices List */}
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-neutral-300)' }}><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </div>
              <div className="empty-state-title">No notices published yet</div>
              <div className="empty-state-message">Publish a new official announcement to notify all residents.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {notices.map((notice) => {
              const formattedDate = notice.createdAt?.toDate 
                ? formatDate(notice.createdAt.toDate().toISOString()) 
                : notice.createdAt 
                  ? formatDate(notice.createdAt) 
                  : 'Just now';

              return (
                <div key={notice.id} className="card stagger-item" style={{ padding: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--color-neutral-900)', marginBottom: 'var(--space-1)' }}>
                        {notice.title}
                      </h3>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>
                        Published by {notice.author} • {formattedDate}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={getTopicBadgeClass(notice.topic)}>{notice.topic}</span>
                      <button onClick={() => handleEdit(notice)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary-500)' }} title="Edit">
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(notice.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-emergency-500)' }} title="Delete">
                        🗑️
                      </button>
                    </div>
                  </div>

                  <p style={{ 
                    fontSize: 'var(--font-size-sm)', 
                    color: 'var(--color-neutral-700)', 
                    lineHeight: 1.6, 
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {notice.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publish Notice Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editId ? "Edit Notice" : "Publish Official Notice"} 
        subtitle={editId ? "Update existing announcement" : "Announce society updates to residents"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Topic *</label>
            <select
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="form-select"
            >
              <option value="General">General Announcement</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Events">Events & Meetings</option>
              <option value="Security">Security Alert</option>
              <option value="Billing">Billing & Rules</option>
            </select>
          </div>
          
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="e.g. Water Supply Interruption"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Content *</label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="form-input"
              placeholder="Type the full notice here..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="modal-footer" style={{ padding: 0, border: 'none', marginTop: 'var(--space-6)' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn--ghost btn--sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn--primary btn--sm"
            >
              {isSubmitting ? 'Saving...' : editId ? 'Save Changes' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
