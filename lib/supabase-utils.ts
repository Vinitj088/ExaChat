import { supabase, getServiceSupabase } from './supabase';
import { Message, Model } from '@/app/types';

// Type definitions for database tables
export type Profile = {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
};

export type Thread = {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type ThreadMessage = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

// Migrate user from NextAuth to Supabase
export async function migrateUserToSupabase(
  email: string, 
  password: string, 
  name?: string
) {
  const serviceSupabase = getServiceSupabase();
  
  try {
    // Check if user already exists in Supabase
    const { data: existingUser } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { success: false, message: 'User already exists' };
    }

    // Create user with Auth API
    const { data, error } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;

    // Create profile entry
    if (data.user) {
      await serviceSupabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('Error migrating user:', error);
    return { success: false, message: error.message };
  }
}

// Thread operations
export async function createThread(userId: string, title: string, model: string) {
  const { data, error } = await supabase
    .from('threads')
    .insert({
      user_id: userId,
      title,
      model,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateThread(threadId: string, updates: Partial<Thread>) {
  const { data, error } = await supabase
    .from('threads')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', threadId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserThreads(userId: string) {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getThreadMessages(threadId: string) {
  const { data, error } = await supabase
    .from('thread_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addMessageToThread(threadId: string, message: Omit<ThreadMessage, 'id' | 'thread_id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('thread_messages')
    .insert({
      thread_id: threadId,
      role: message.role,
      content: message.content,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteThread(threadId: string) {
  // First delete all messages in the thread
  await supabase
    .from('thread_messages')
    .delete()
    .eq('thread_id', threadId);

  // Then delete the thread
  const { error } = await supabase
    .from('threads')
    .delete()
    .eq('id', threadId);

  if (error) throw error;
  return true;
} 