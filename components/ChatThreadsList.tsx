'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginButton } from '@/components/LoginButton';

type Thread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: any[];
  model?: string;
};

export default function ChatThreadsList() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, openAuthDialog } = useAuth();

  async function fetchThreads() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/chat/threads', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setThreads(data.threads || []);
      } else {
        console.error('Failed to fetch threads:', data.error);
        
        // If auth is required, show auth dialog
        if (data.authRequired) {
          openAuthDialog();
        }
        
        setError(data.error || 'Failed to fetch threads');
      }
    } catch (error: any) {
      console.error('Error fetching threads:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function createThread(messages: any[], title?: string, model: string = 'exa') {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/chat/threads', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          messages,
          title,
          model
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await fetchThreads(); // Refresh the threads list
        return data.thread;
      } else {
        console.error('Failed to create thread:', data.error);
        
        // If auth is required, show auth dialog
        if (data.authRequired) {
          openAuthDialog();
        }
        
        setError(data.error || 'Failed to create thread');
        return null;
      }
    } catch (error: any) {
      console.error('Error creating thread:', error);
      setError(error.message || 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchThreads();
  }, [session]); // Re-fetch when session changes

  if (loading && threads.length === 0) {
    return <div>Loading chat threads...</div>;
  }

  if (error && threads.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div>Error: {error}</div>
        {error.includes('Authentication') && (
          <LoginButton />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Chat Threads</h2>
        <LoginButton />
      </div>
      
      {threads.length === 0 ? (
        <div>No chat threads found. Start a new chat!</div>
      ) : (
        <ul className="space-y-4">
          {threads.map((thread) => (
            <li key={thread.id} className="border p-4 rounded-lg">
              <h3 className="font-bold">{thread.title}</h3>
              <p className="text-sm text-gray-500">Created: {new Date(thread.createdAt).toLocaleString()}</p>
              <p className="text-sm text-gray-500">Updated: {new Date(thread.updatedAt).toLocaleString()}</p>
              <p className="text-sm">Model: {thread.model || 'exa'}</p>
              <p className="text-sm">Messages: {thread.messages?.length || 0}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 