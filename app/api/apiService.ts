import React from 'react';
import { getAssetPath } from '../utils';
import { Message } from '../types';
import { toast } from 'sonner';
// Import models instead of using require()
import modelsConfig from '../../models.json';

// Character limits for context windows
const MODEL_LIMITS = {
  exa: 4000,    // Reduced limit for Exa to prevent timeouts
  groq: 128000, // Groq models have a much larger limit
  google: 64000, // Google Gemini models
  default: 8000 // Fallback limit
};

// Function to truncate conversation history to fit within context window
const truncateConversationHistory = (messages: Message[], modelId: string): Message[] => {
  // For Exa, include limited context (last few messages) to support follow-up questions
  if (modelId === 'exa') {
    // Get the last 3 messages (or fewer if there aren't that many)
    // This provides enough context for follow-ups without being too much
    const recentMessages = [...messages].slice(-3);
    
    // Make sure the last message is always included (should be a user message)
    if (recentMessages.length > 0 && recentMessages[recentMessages.length - 1].role !== 'user') {
      // If the last message isn't from the user, find the last user message
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length > 0) {
        // Replace the last message with the most recent user message
        recentMessages[recentMessages.length - 1] = userMessages[userMessages.length - 1];
      }
    }
    
    return recentMessages;
  }
  
  // For LLMs like Groq and Gemini, retain conversation history
  // Determine the character limit for the model
  let charLimit = MODEL_LIMITS.default;
  if (modelId.includes('groq') || modelId.startsWith('llama')) {
    charLimit = MODEL_LIMITS.groq;
  } else if (modelId.includes('gemini') || modelId.includes('gemma')) {
    charLimit = MODEL_LIMITS.google;
  }
  
  // If there are fewer than 2 messages or the history fits in the limit, return all messages
  if (messages.length <= 2) {
    return messages;
  }
  
  // Calculate total character count in all messages
  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  
  // If all messages fit within limit, return them all
  if (totalChars <= charLimit) {
    return messages;
  }
  
  // Always include the most recent message pairs (user question and assistant response)
  // and work backward in pairs to maintain context
  const result: Message[] = [];
  let usedChars = 0;
  
  // Process messages in reverse order (newest first)
  for (let i = messages.length - 1; i >= 0; i--) {
    const currentMsg = messages[i];
    const msgLength = currentMsg.content.length;
    
    // Always include the most recent messages
    if (i >= messages.length - 2) {
      result.unshift(currentMsg);
      usedChars += msgLength;
      continue;
    }
    
    // For older messages, check if we have room
    if (usedChars + msgLength <= charLimit) {
      result.unshift(currentMsg);
      usedChars += msgLength;
    } else {
      // If we can't fit any more messages, stop
      break;
    }
  }
  
  return result;
};

// Helper type for message updater function
type MessageUpdater = ((messages: Message[]) => void) | React.Dispatch<React.SetStateAction<Message[]>>;

// Helper function to safely update messages
const updateMessages = (
  setMessages: MessageUpdater,
  updater: (prev: Message[]) => Message[]
) => {
  if (typeof setMessages === 'function') {
    try {
      // First try it as a React setState function
      (setMessages as React.Dispatch<React.SetStateAction<Message[]>>)(updater);
    } catch (_error) {
      // If that fails, try it as a custom callback function
      // _error is intentionally ignored as we're falling back to another method
      try {
        // For custom callback, we need to create a dummy array and apply the updater
        const dummyArray: Message[] = [];
        const updatedMessages = updater(dummyArray);
        (setMessages as (messages: Message[]) => void)(updatedMessages);
      } catch (innerE) {
        console.error('Failed to update messages:', innerE);
      }
    }
  }
};

// Function to enhance a query using llama3-70b-8192 instant
export const enhanceQuery = async (query: string): Promise<string> => {
  try {
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `REWRITE THIS QUERY ONLY, DO NOT ANSWER IT: "${query}"`,
        model: 'llama3-70b-8192', // Using the more powerful 70B parameter LLaMA model
        systemPrompt: 'You are PromptEnhancerBot, a specialized prompt enhancer that ONLY rewrites queries for improving clarity of prompt without ever answering them. Your sole purpose is to fix grammar and structure the prompt in a more LLM friendly way.\n\nFORMAT:\nInputs will be: REWRITE THIS QUERY ONLY, DO NOT ANSWER IT: "user query here"\nOutputs must be: REWRITTEN QUERY: "improved query here"\n\nRules:\n- You MUST use the exact output prefix "REWRITTEN QUERY: " followed by the rewritten text in quotes\n- You are FORBIDDEN from answering the query\n- DO NOT add information, explanations, or respond to the query content\n- Fix ONLY grammar, spelling, improve structure, and enhance clarity of the prompt\n- Preserve all references like "this text" or "above content"\n\nExamples:\n\nInput: REWRITE THIS QUERY ONLY, DO NOT ANSWER IT: "how computer work"\nOutput: REWRITTEN QUERY: "How do computers work?"\n\nInput: REWRITE THIS QUERY ONLY, DO NOT ANSWER IT: "tell me about earth"\nOutput: REWRITTEN QUERY: "Tell me about Earth in detailed structured way in easy words."\n\nInput: REWRITE THIS QUERY ONLY, DO NOT ANSWER IT: "what this code do explain"\nOutput: REWRITTEN QUERY: "What does this code do? Please explain."\n\nAfter I receive your output, I will extract only what\'s between the quotes after "REWRITTEN QUERY:". NEVER include ANY other text, explanations, or answers.',
        enhance: true,
        temperature: 0.0
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let enhancedQuery = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Convert the chunk to text
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.choices && data.choices[0]?.delta?.content) {
            enhancedQuery += data.choices[0].delta.content;
          }
        } catch (e) {
          // Silently ignore parsing errors and continue
          continue;
        }
      }
    }

    // Post-process the response to extract only the rewritten query
    const rewrittenQueryMatch = enhancedQuery.match(/REWRITTEN QUERY: "(.*?)"/);
    if (rewrittenQueryMatch && rewrittenQueryMatch[1]) {
      return rewrittenQueryMatch[1].trim();
    }

    // If the expected format isn't found, return the original query
    return query;
  } catch (error) {
    console.error('Error enhancing query:', error);
    // Return the original query if enhancement fails
    return query;
  }
};

// Format previous messages to pass to API
export const fetchResponse = async (
  input: string,
  messages: Message[],
  selectedModel: string,
  abortController: AbortController,
  setMessages: MessageUpdater,
  assistantMessage: Message,
  attachments?: File[]
) => {
  // Prepare messages for conversation history, ensuring we respect context limits
  const truncatedMessages = truncateConversationHistory(messages, selectedModel);
  
  // Format previous messages into conversation history
  const conversationHistory = truncatedMessages.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n');
  
  // Combine history with new query
  const fullQuery = conversationHistory 
    ? `${conversationHistory}\nUser: ${input}`
    : input;

  let response;
  
  try {
    // Determine which API endpoint to use based on the selected model
    let apiEndpoint;
    
    // Find the model configuration
    const modelConfig = modelsConfig.models.find((m: Record<string, unknown>) => m.id === selectedModel);
    
    if (selectedModel === 'exa') {
      apiEndpoint = getAssetPath('/api/exaanswer');
    } else if (modelConfig?.toolCallType === 'openrouter' || selectedModel === 'gemma3-27b') {
      apiEndpoint = getAssetPath('/api/openrouter');
    } else if (selectedModel.includes('gemini')) {
      apiEndpoint = getAssetPath('/api/gemini');
    } else if (modelConfig?.providerId === 'cerebras') {
      apiEndpoint = getAssetPath('/api/cerebras');
    } else {
      apiEndpoint = getAssetPath('/api/groq');
    }

    console.log(`Sending request to ${apiEndpoint} with model ${selectedModel}`);
    
    // Common request options
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      signal: abortController.signal,
      credentials: 'include' as RequestCredentials, // Add credentials to include cookies
    };
    
    // Process attachments if we have them
    let processedAttachments: any[] = [];
    if (attachments && attachments.length > 0 && selectedModel.includes('gemini')) {
      console.log(`Processing ${attachments.length} attachments for API call`);
      
      // Convert files to base64 data format for API transmission
      processedAttachments = await Promise.all(
        attachments.map(async (file): Promise<any> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onloadend = () => {
              try {
                const base64data = reader.result as string;
                if (!base64data) {
                  reject(new Error(`Failed to read file: ${file.name}`));
                  return;
                }
                
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64Content = base64data.split(',')[1];
                
                console.log(`Successfully processed file: ${file.name} (${file.type}), size: ${(file.size / 1024).toFixed(2)}KB`);
                
                resolve({
                  name: file.name,
                  type: file.type,
                  data: base64Content,
                  size: file.size
                });
              } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                reject(error);
              }
            };
            
            reader.onerror = (error) => {
              console.error(`Error reading file ${file.name}:`, error);
              reject(error);
            };
            
            reader.readAsDataURL(file);
          });
        })
      );
    }
    
    // Prepare request body based on the API
    const requestBody = selectedModel === 'exa' 
      ? { 
        // For Exa, include the query and limited context for follow-up questions
        query: input,
        messages: truncatedMessages
      } 
      : {
        // For Groq, Gemini, and other LLMs, include the full conversation history
        query: fullQuery,
        model: selectedModel,
        messages: truncatedMessages,
        ...(processedAttachments.length > 0 && { attachments: processedAttachments })
      };
    
    // For debugging
    if (processedAttachments.length > 0) {
      console.log(`Sending request with ${processedAttachments.length} attachments`);
    }
    
    // Make the fetch request
    response = await fetch(
      apiEndpoint, 
      {
        ...requestOptions,
        body: JSON.stringify(requestBody),
      }
    );

    // Check if it's JSON and parse it for error info
    if (!response.ok) {
      console.error(`API request failed with status ${response.status}`);
      
      // Special handling for authentication errors
      if (response.status === 401) {
        toast.error('Authentication required', {
          description: 'Please sign in to continue using this feature',
          duration: 5000
        });
        
        throw new Error('Authentication required. Please sign in and try again.');
      }
      
      // Check content type to determine if it's JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        
        if (response.status === 429) {
          // Handle rate limit error
          let waitTime = 30; // Default wait time in seconds
          let message = 'Rate limit reached. Please try again later.';
          
          if (errorData.error && errorData.error.message) {
            message = errorData.error.message;
            
            // Try to extract wait time if available
            // Look for patterns like "try again in 539ms" or "try again in 30s"
            const waitTimeMatch = message.match(/try again in (\d+\.?\d*)([ms]+)/);
            if (waitTimeMatch) {
              const timeValue = parseFloat(waitTimeMatch[1]);
              const timeUnit = waitTimeMatch[2];
              
              // Convert to seconds if it's in milliseconds
              if (timeUnit === 'ms') {
                waitTime = Math.ceil(timeValue / 1000);
              } else {
                waitTime = Math.ceil(timeValue);
              }
            }
          }
          
          // Display toast notification for rate limit
          toast.error('RATE LIMIT REACHED', {
            description: `Please wait ${waitTime} seconds before trying again.`,
            duration: 8000,
            action: {
              label: 'DISMISS',
              onClick: () => {}
            }
          });
          
          // Create a custom error with rate limit info
          const rateLimitError = new Error('Rate limit reached');
          rateLimitError.name = 'RateLimitError';
          // @ts-expect-error - adding custom properties
          rateLimitError.waitTime = waitTime;
          // @ts-expect-error - adding custom properties
          rateLimitError.details = message;
          
          throw rateLimitError;
        }
        
        throw new Error(errorData.error?.message || errorData.message || 'API request failed');
      }
      
      throw new Error(`Request failed with status ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    let content = '';
    let citations: Array<Record<string, unknown>> = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Convert the chunk to text
      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          // Process immediately without collecting in content variable
          if (data.citations) {
            citations = data.citations;
            // Update message with new citations immediately
            updateMessages(setMessages, (prev: Message[]) => 
              prev.map((msg: Message) => 
                msg.id === assistantMessage.id 
                  ? { ...msg, citations: data.citations } 
                  : msg
              )
            );
          } else if (data.choices && data.choices[0]?.delta?.content) {
            const newContent = data.choices[0].delta.content;
            content += newContent;
            
            // Check if this is the end of the stream
            const isEndOfStream = line.includes('"finish_reason"') || 
              line.includes('"done":true') ||
              data.choices[0]?.finish_reason;
            
            // Update message immediately with each token
            updateMessages(setMessages, (prev: Message[]) => 
              prev.map((msg: Message) => 
                msg.id === assistantMessage.id 
                  ? { 
                      ...msg,
                      content: content,
                      // Mark message as completed if we detect we're at the end
                      completed: isEndOfStream
                    } 
                  : msg
              )
            );
          }
        } catch {
          // Silently ignore parsing errors and continue
          // This can happen with incomplete JSON chunks
          continue;
        }
      }
    }

    // After streaming completes, make one final update to ensure message is marked as completed
    updateMessages(setMessages, (prev: Message[]) => 
      prev.map((msg: Message) => 
        msg.id === assistantMessage.id 
          ? { ...msg, content, citations, completed: true } 
          : msg
      )
    );

    return { content, citations };
  } catch (err) {
    console.error('Error in fetchResponse:', err);
    
    if (err instanceof Error && err.message.includes('Authentication')) {
      // This is an authentication error, show appropriate message
      throw err;
    }
    
    // Make sure to show the toast one more time here in case it failed earlier
    if (err instanceof Error && err.message.includes('Rate limit')) {
      toast.error('RATE LIMIT REACHED', {
        description: 'Please wait before trying again.',
        duration: 5000,
        action: {
          label: 'DISMISS',
          onClick: () => {}
        }
      });
    } else {
      // Generic error toast
      toast.error('Error processing request', {
        description: err instanceof Error ? err.message : 'Unknown error occurred',
        duration: 5000
      });
    }
    
    throw err;
  }
}; 