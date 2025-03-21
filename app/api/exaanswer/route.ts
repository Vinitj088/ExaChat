// app/api/exaanswer/route.ts
import { NextRequest } from 'next/server';
import Exa from "exa-js";
import { Message } from '@/app/types';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const exa = new Exa(process.env.EXA_API_KEY as string);

export async function POST(req: NextRequest) {
  try {
    // Parse request body first
    const body = await req.json();
    const { query, messages } = body;
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), { status: 400 });
    }

    // Add timeout promise to avoid hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Exa API request timed out')), 20000); // 20 seconds timeout
    });

    // Create Exa stream - just pass the raw query since Exa is a search API
    // Using the options according to exa-js documentation
    const streamPromise = exa.streamAnswer(query, { 
      model: "exa-pro"
    });
    
    // Use Promise.race to implement timeout
    const stream = await Promise.race([streamPromise, timeoutPromise]) as AsyncIterable<any>;
    
    const encoder = new TextEncoder();

    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          // Add a timeout for the entire streaming process
          const streamTimeout = setTimeout(() => {
            controller.error(new Error('Streaming response timed out'));
          }, 20000); // 20 seconds timeout
          
          for await (const chunk of stream) {
            // Send citations if present
            if (chunk.citations?.length) {
              controller.enqueue(encoder.encode(JSON.stringify({ citations: chunk.citations }) + '\n'));
            }

            // Send content
            controller.enqueue(encoder.encode(JSON.stringify({
              choices: [{ delta: { content: chunk.content } }]
            }) + '\n'));
          }
          
          clearTimeout(streamTimeout);
          controller.close();
        } catch (error) {
          console.error('Error during stream processing:', error);
          
          // Send a partial response error message so the frontend knows something went wrong
          controller.enqueue(encoder.encode(JSON.stringify({
            choices: [{ delta: { content: "\n\nI apologize, but I encountered an issue completing this search. Please try rephrasing your question or breaking it into smaller parts." } }]
          }) + '\n'));
          
          controller.close();
        }
      },
    });

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Exa API error:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to perform search | ${error.message}`,
        message: "There was an issue with your search request. Please try rephrasing your query."
      }), 
      { status: 500 }
    );
  }
}