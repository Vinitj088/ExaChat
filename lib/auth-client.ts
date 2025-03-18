// DEPRECATED: This file is no longer in use and can be safely removed.
// The application now uses NextAuth with the useAuth hook from lib/hooks/useAuth.ts
// This file is kept for reference purposes but should be removed in future cleanup.

import { AUTH_CONFIG } from './constants';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  user: User | null;
  expires: string;
}

// Enhanced client-side auth service that follows BetterAuth patterns
export const authClient = {
  // Session management
  async getSession(): Promise<Session | null> {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        credentials: 'include',
        // Use next: { revalidate: 0 } to ensure fresh data
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        // Clear local storage if session is invalid
        if (response.status === 401) {
          localStorage.removeItem('user');
        }
        return null;
      }
      
      const data = await response.json();
      if (!data.user) {
        localStorage.removeItem('user');
        return null;
      }
      
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },
  
  // Auth methods
  async signIn(email: string, password: string): Promise<User | null> {
    try {
      // First clear any existing session data
      localStorage.removeItem('user');
      document.cookie = `${AUTH_CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign in failed');
      }
      
      const data = await response.json();
      if (data.user) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Sign in error:', error);
      // Clear any partial session data on error
      localStorage.removeItem('user');
      document.cookie = `${AUTH_CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      throw error;
    }
  },
  
  async signUp(email: string, password: string, name: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign up failed');
      }
      
      const data = await response.json();
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },
  
  async signOut(): Promise<void> {
    try {
      // First clear local storage and cookies for immediate UI feedback
      localStorage.removeItem('user');
      document.cookie = `${AUTH_CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      
      // Then make the API call
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        console.warn('Sign out response not OK:', response.statusText);
        // Force reload to reset any remaining state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign out error:', error);
      // Force reload even on error
      window.location.href = '/';
    }
  },
  
  // Utility functions
  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      localStorage.removeItem('user'); // Clear corrupted data
      return null;
    }
  },
  
  hasSessionCookie(): boolean {
    return !!document.cookie
      .split('; ')
      .find(row => row.startsWith(`${AUTH_CONFIG.COOKIE_NAME}=`));
  }
}; 