import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
// import { Message, Model } from "../types"; // Use UIMessage instead
import { Model } from "../types"; // Keep Model type
import { type Message as UIMessage } from '@ai-sdk/react'; // Import UIMessage
import MessageContent from './MessageContent';
import Citation from './Citation';
import ShareButton from './ShareButton';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessagesProps {
  messages: UIMessage[]; // Use UIMessage[]
  isLoading: boolean;
  selectedModel: string;
  selectedModelObj?: Model;
  isExa: boolean;
}

// Memoized message component to prevent unnecessary re-renders
const ChatMessage = memo(({ message, isUser, threadId }: { message: UIMessage, isUser: boolean, threadId?: string }) => {
  
  const [copySuccess, setCopySuccess] = useState(false);
  
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      setCopySuccess(true);
      toast.success('Message copied to clipboard');
      
      // Reset the status after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
      toast.error('Failed to copy message');
    }
  };
  
  // TODO: Handle images and citations based on UIMessage structure
  // UIMessage standard properties don't include `images` or `citations`.
  // You might need to use `experimental_attachments` or parse structured data within `content`.
  // const images = (message as any).images; // Temporary cast - UNSAFE
  // const citations = (message as any).citations; // Temporary cast - UNSAFE

  return (
    <div className="w-full">
      <div
        className={`flex ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        <div
          className={`rounded-lg py-3 px-4 max-w-[85%] ${
            isUser
              ? 'bg-[var(--secondary-darker)] rounded text-[var(--text-light-default)] text-base message-human'
              : 'bg-white dark:bg-[var(--secondary-faint)] border border-[var(--secondary-darkest)] rounded-lg text-[var(--text-light-default)] text-base message-ai'
          }`}
        >
          <div className="whitespace-pre-wrap text-[15px]">
            <MessageContent 
              content={message.content} 
              role={message.role} 
              // images={images} // Commented out - UIMessage doesn't have this directly
            />
          </div>
          {/* {citations && citations.length > 0 && (
            <Citation citations={citations} />
          )} */}
          {!isUser && threadId && message.content && message.content.length > 0 && (
            <div className="mt-2 flex items-center justify-end gap-2 border-t pt-2 border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <ShareButton threadId={threadId} />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="px-2 sm:px-3 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 group h-8 rounded-md transition-all duration-300 ease-in-out overflow-hidden"
                  aria-label="Copy message"
                  onClick={handleCopyMessage}
                >
                  <div className="flex items-center justify-center">
                    {copySuccess ? (
                      <>
                        <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="ml-2 text-xs text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 flex-shrink-0 group-hover:mr-2 transition-all duration-300 ease-in-out" />
                        <span className="max-w-0 group-hover:max-w-0 sm:group-hover:max-w-xs transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap text-xs">
                          Copy text
                        </span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Add display name to the component
ChatMessage.displayName = 'ChatMessage';

// Loading indicator component
const LoadingIndicator = memo(({ isExa, modelName }: { isExa: boolean, modelName: string }) => (
  <div className="flex items-center gap-2 text-[var(--text-light-muted)] animate-pulse">
    <div className="w-2 h-2 rounded-full bg-[var(--brand-default)] animate-[bounce_1s_infinite]"></div>
    <div className="w-2 h-2 rounded-full bg-[var(--brand-default)] animate-[bounce_1s_infinite_200ms]"></div>
    <div className="w-2 h-2 rounded-full bg-[var(--brand-default)] animate-[bounce_1s_infinite_400ms]"></div>
    <span className="text-sm font-medium text-[var(--brand-dark)]">
      {isExa ? 'Asking Exa...' : `Using ${modelName || ''}...`}
    </span>
  </div>
));

// Add display name to the component
LoadingIndicator.displayName = 'LoadingIndicator';

const ChatMessages = memo(function ChatMessages({ 
  messages, // Now UIMessage[]
  isLoading, 
  selectedModel,
  selectedModelObj,
  isExa 
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageCount, setMessageCount] = useState(0);
  const params = useParams();
  const threadId = params?.threadId as string;
  
  // Track message count to only scroll when new messages are added
  useEffect(() => {
    if (messages.length !== messageCount) {
      setMessageCount(messages.length);
      
      // Scroll to bottom only when a new message is added
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages.length, messageCount]);
  
  // Scroll when loading state changes from false to true
  useEffect(() => {
    if (isLoading) {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isLoading]);

  // Get the model name for display
  const modelName = selectedModelObj?.name as string || '';

  // Update renderMessage to accept UIMessage
  const renderMessage = useCallback((message: UIMessage) => {
    return (
      <ChatMessage 
        key={message.id} 
        message={message} 
        isUser={message.role === 'user'} 
        threadId={threadId}
      />
    );
  }, [threadId]);

  return (
    <div className="pt-16 pb-32 w-full overflow-x-hidden">
      <div className="w-full max-w-full md:max-w-4xl mx-auto px-4 py-6 space-y-6">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <LoadingIndicator isExa={isExa} modelName={modelName} />
        )}
        
        {/* Empty div for auto-scrolling to bottom */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

// Add display name to the main component
ChatMessages.displayName = 'ChatMessages';

export default ChatMessages; 