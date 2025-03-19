import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RedisService } from '@/lib/redis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

// No-cache headers
const CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache'
};

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using Supabase's route handler
    console.log('Getting authenticated user with createRouteHandlerClient...');
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication error: ' + authError.message },
        { status: 401, headers: CACHE_HEADERS }
      );
    }
    
    if (!session || !session.user) {
      console.error('No session or user found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No session found' },
        { status: 401, headers: CACHE_HEADERS }
      );
    }

    console.log('User authenticated:', session.user.email);
    const userId = session.user.id;
    const threads = await RedisService.getUserChatThreads(userId);
    
    return NextResponse.json(
      { success: true, threads },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error getting chat threads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get chat threads' },
      { status: 500, headers: CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user using Supabase's route handler
    console.log('Getting authenticated user with createRouteHandlerClient...');
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication error: ' + authError.message },
        { status: 401, headers: CACHE_HEADERS }
      );
    }
    
    if (!session || !session.user) {
      console.error('No session or user found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: No session found' },
        { status: 401, headers: CACHE_HEADERS }
      );
    }

    console.log('User authenticated:', session.user.email);
    const userId = session.user.id;
    const body = await request.json();
    const { title, messages, model } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400, headers: CACHE_HEADERS }
      );
    }

    const thread = await RedisService.createChatThread(userId, title, messages || [], model || 'exa');
    
    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'Failed to create chat thread' },
        { status: 500, headers: CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, thread },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error creating chat thread:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create chat thread' },
      { status: 500 }
    );
  }
} 