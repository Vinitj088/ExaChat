import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RedisService } from '@/lib/redis';
import { AuthError } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Define the route context type
type RouteContext = {
  params: Promise<{
    threadId: string
  }>
};

// GET a specific thread
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { threadId } = await context.params;
    
    if (!threadId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Thread ID is required' 
      }, { status: 400 });
    }
    
    // Get user from Supabase auth
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Check if we have a valid user
    if (error || !user) {
      console.error('Auth error:', error?.message || 'No user found');
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: error?.message || 'Authentication required',
          authRequired: true 
        },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Get the thread from Redis
    const thread = await RedisService.getChatThread(userId, threadId);
    
    if (!thread) {
      return NextResponse.json({ 
        success: false, 
        error: 'Thread not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      thread
    });
    
  } catch (error: any) {
    console.error('Error getting thread:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to get thread' 
    }, { status: 500 });
  }
}

// PUT/UPDATE a specific thread
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { threadId } = await context.params;
    
    if (!threadId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Thread ID is required' 
      }, { status: 400 });
    }
    
    // Parse request body
    const body = await req.json();
    const { messages, title, model } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Messages are required and must be an array' 
      }, { status: 400 });
    }
    
    // Get user from Supabase auth
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Check if we have a valid user
    if (error || !user) {
      console.error('Auth error:', error?.message || 'No user found');
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: error?.message || 'Authentication required',
          authRequired: true 
        },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Get the existing thread first
    const existingThread = await RedisService.getChatThread(userId, threadId);
    
    if (!existingThread) {
      return NextResponse.json({ 
        success: false, 
        error: 'Thread not found' 
      }, { status: 404 });
    }
    
    // Update the thread in Redis
    const updatedThread = await RedisService.updateChatThread(
      userId,
      threadId,
      {
        messages,
        title: title || existingThread.title,
        model: model || existingThread.model
      }
    );
    
    if (!updatedThread) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update thread' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      thread: updatedThread
    });
    
  } catch (error: any) {
    console.error('Error updating thread:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to update thread' 
    }, { status: 500 });
  }
}

// DELETE a specific thread
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { threadId } = await context.params;
    
    if (!threadId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Thread ID is required' 
      }, { status: 400 });
    }
    
    // Get user from Supabase auth
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Check if we have a valid user
    if (error || !user) {
      console.error('Auth error:', error?.message || 'No user found');
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: error?.message || 'Authentication required',
          authRequired: true 
        },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    
    // Delete the thread from Redis
    const success = await RedisService.deleteChatThread(userId, threadId);
    
    if (!success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete thread' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Thread deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting thread:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to delete thread' 
    }, { status: 500 });
  }
} 