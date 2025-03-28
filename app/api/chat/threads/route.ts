import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RedisService, verifyRedisConnection } from '@/lib/redis';
import { AuthError } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET endpoint to list all threads for a user
export async function GET(req: NextRequest) {
  try {
    // Verify Redis connection first
    const redisConnected = await verifyRedisConnection();
    if (!redisConnected) {
      console.error('Redis connection failed');
      return NextResponse.json(
        { error: 'Service unavailable', message: 'Database connection error' },
        { status: 503 }
      );
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
    console.log(`Fetching threads for user: ${userId}`);
    
    // Get threads from Redis
    const threads = await RedisService.getUserChatThreads(userId);
    
    return NextResponse.json({
      success: true,
      threads: threads || []
    });
    
  } catch (error: any) {
    console.error('Error getting threads:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to get threads' 
    }, { status: 500 });
  }
}

// POST endpoint to create a new thread
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { messages, title, model = 'exa' } = body;
    
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
    
    // Generate title if not provided
    const threadTitle = title || (messages[0]?.content.substring(0, 50) + '...') || 'New Chat';
    
    // Create the thread
    const thread = await RedisService.createChatThread(
      userId,
      threadTitle,
      messages,
      model
    );
    
    if (!thread) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create thread' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      thread
    });
    
  } catch (error: any) {
    console.error('Error creating thread:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create thread' 
    }, { status: 500 });
  }
} 