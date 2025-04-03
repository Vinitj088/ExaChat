import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // Import default style
import '@/app/styles/highlight.css'; // Import our custom styles
import Image from 'next/image';

// Initialize highlight.js - not needed as we're using the full build
// but added for clarity
hljs.configure({
  ignoreUnescapedHTML: true
});

type ParsedContent = {
  thinking: string;
  visible: string;
};

// Message content props interface
interface MessageContentProps {
  content: string;
  role: string;
  images?: { mimeType: string; data: string; url?: string }[];
}

// Add the parseMessageContent helper function
const parseMessageContent = (content: string): ParsedContent => {
  // Check if content is undefined or null
  if (!content) {
    return { thinking: '', visible: '' };
  }
  
  // If we find a complete think tag
  if (content.includes('</think>')) {
    const [thinking, ...rest] = content.split('</think>');
    return {
      thinking: thinking.replace('<think>', '').trim(),
      visible: rest.join('</think>').trim()
    };
  }
  
  // If only opening think tag is found (incomplete thinking)
  if (content.includes('<think>')) {
    return {
      thinking: content.replace('<think>', '').trim(),
      visible: ''
    };
  }
  
  // No thinking tags
  return {
    thinking: '',
    visible: content
  };
};

// Component to display generated images
const GeneratedImageView = ({ images }: { images: { mimeType: string; data: string; url?: string | null }[] }) => {
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<number, boolean>>({});
  
  useEffect(() => {
    // Reset loading states when images change
    if (images && images.length > 0) {
      const newLoadedStates: Record<number, boolean> = {};
      const newErrorStates: Record<number, boolean> = {};
      
      images.forEach((_, index) => {
        newLoadedStates[index] = false;
        newErrorStates[index] = false;
      });
      
      setImagesLoaded(newLoadedStates);
      setErrorStates(newErrorStates);
      
      // Enhanced debug image sources
      console.log('🔍 Image sources:', images.map((img, idx) => ({
        index: idx,
        hasUrl: !!img.url,
        url: img.url ? img.url.substring(0, 50) + '...' : null,
        hasData: !!img.data,
        dataLength: img.data ? img.data.length : 0,
        dataIsUrl: img.data?.startsWith('http') || false,
        dataPrefix: img.data ? img.data.substring(0, 30) + '...' : null,
        mimeType: img.mimeType
      })));
      
      // Preload images to handle loading state properly
      images.forEach((image, index) => {
        if (image.url || image.data.startsWith('http')) {
          const imgSource = image.url || image.data;
          const img = new window.Image();
          
          img.onload = () => {
            console.log(`✅ Preloaded image ${index} successfully`);
            setImagesLoaded(prev => ({
              ...prev,
              [index]: true
            }));
          };
          
          img.onerror = () => {
            console.error(`❌ Preload error for image ${index}`);
            setErrorStates(prev => ({
              ...prev,
              [index]: true
            }));
          };
          
          // Start loading the image
          img.src = imgSource;
        }
      });
    } else {
      console.log('🚫 No images array or empty images array provided to GeneratedImageView');
    }
  }, [images]);
  
  if (!images || images.length === 0) {
    console.log('⚠️ No images provided to GeneratedImageView, rendering null');
    return null;
  }
  
  console.log(`🖼️ Rendering ${images.length} generated images`);
  
  const handleImageLoad = (index: number) => {
    console.log(`✅ Image ${index} loaded successfully`);
    setImagesLoaded(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  const handleImageError = (index: number) => {
    console.error(`❌ Error loading image at index ${index}`);
    setErrorStates(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  return (
    <div className="mt-4 space-y-6">
      {images.map((image, index) => {
        if (!image.data && !image.url) {
          console.error(`🚫 Image at index ${index} has no data and no URL`);
          return (
            <div key={`error-${index}`} className="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400 text-sm">Image data is missing</p>
            </div>
          );
        }
        
        // Determine image source - prefer URL over base64 for efficiency
        const imageSource = image.url || 
          (image.data.startsWith('http') ? image.data : 
           `data:${image.mimeType || 'image/png'};base64,${image.data}`);
        
        // Log the image source being used
        console.log(`🔗 Image ${index} source type: ${image.url ? 'URL from url field' : 
          (image.data.startsWith('http') ? 'URL from data field' : 'base64 data')}`);
        
        // Determine download link - same logic as image source
        const downloadLink = image.url || 
          (image.data.startsWith('http') ? image.data : 
           `data:${image.mimeType || 'image/png'};base64,${image.data}`);
        
        // For base64 data, don't use preloading
        const isDirectBase64 = !image.url && !image.data.startsWith('http');
        
        return (
          <div key={`image-${index}`} className="relative rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="absolute top-2 right-2 z-10">
              <a 
                href={downloadLink}
                download={`generated-image-${index}.png`}
                className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Download image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </a>
            </div>
            
            <div className="flex justify-center items-center pt-6 pb-8 px-4">
              {/* Loading indicator - only show for base64 images or if URL images haven't loaded yet */}
              {(!imagesLoaded[index] && !errorStates[index]) && (
                <div className="h-[300px] w-full max-w-[500px] flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-md">
                  <div className="animate-pulse flex flex-col items-center">
                    <svg className="w-10 h-10 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Loading image...</p>
                  </div>
                </div>
              )}
              
              {/* Error state */}
              {errorStates[index] && (
                <div className="h-[200px] w-full max-w-[500px] flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-900">
                  <div className="flex flex-col items-center text-center p-4">
                    <svg className="w-10 h-10 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">Failed to load image</p>
                    <p className="mt-1 text-xs text-red-500 dark:text-red-300">
                      {image.url ? 'Error loading from URL' : 'Error loading image data'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Actual image element - only hidden when loading/error for base64 images. 
                  For URL images that were preloaded, we control visibility with CSS */}
              <div className={`max-w-full relative ${
                (isDirectBase64 && (!imagesLoaded[index] || errorStates[index])) ? 'hidden' : 
                (!imagesLoaded[index]) ? 'invisible' : ''
              }`}>
                <img 
                  src={imageSource}
                  alt="AI Generated Image"
                  className="max-h-[600px] max-w-full object-contain rounded-md"
                  onLoad={() => isDirectBase64 && handleImageLoad(index)}
                  onError={(e) => {
                    if (isDirectBase64) {
                      console.error(`❌ Image load error for index ${index}:`, e);
                      handleImageError(index);
                    }
                  }}
                />
                <div className="absolute bottom-2 right-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  Generated by Gemini
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Simple inline code component
const InlineCode = ({ children }: { children: React.ReactNode }) => {
  return (
    <code className="bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 text-gray-800 dark:text-gray-200 text-sm font-mono break-words">
      {children}
    </code>
  );
};

// Code block component with highlight.js and copy button
const CodeBlock = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const code = String(children).trim();
  
  // Use highlight.js to highlight the code
  useEffect(() => {
    if (!code) return;
    
    try {
      // Let highlight.js auto-detect the language
      const result = hljs.highlightAuto(code);
      console.log('Highlighted with language:', result.language);
      setHighlighted(result.value);
    } catch (error) {
      console.error('Error highlighting code:', error);
      // Escape HTML and set as plain text
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      setHighlighted(escapedCode);
    }
  }, [code]);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };
  
  // For inline code (no language)
  if (!className) {
    return <InlineCode>{children}</InlineCode>;
  }
  
  // For code blocks
  return (
    <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-md mb-5 shadow-sm">
      {/* Header with copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-600 dark:text-gray-300">
            <path d="M8 3H7C5.89543 3 5 3.89543 5 5V7M8 3H16M8 3V2M16 3H17C18.1046 3 19 3.89543 19 5V7M16 3V2M19 7V15M19 7H20M5 7V15M5 7H4M19 15V17C19 18.1046 18.1046 19 17 19H16M19 15H20M5 15V17C5 18.1046 5.89543 19 7 19H8M5 15H4M8 19H16M8 19V20M16 19V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Code</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content with highlighting */}
      <div className={`overflow-auto p-1 text-sm code-block`}>
        {highlighted ? (
          <pre className="m-0 p-0">
            <code 
              dangerouslySetInnerHTML={{ __html: highlighted }} 
              className={`hljs ${isDark ? 'dark' : ''}`}
            />
          </pre>
        ) : (
          <pre className="m-0 p-0">
            <code className={isDark ? 'dark' : ''}>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

// Custom task list item component for rendering checkboxes in markdown
const TaskListItem = ({ checked, children }: { checked?: boolean; children: React.ReactNode }) => {
  return (
    <li className="flex items-start gap-2 mb-3">
      <div className="flex-shrink-0 mt-1">
        <div className={`w-4 h-4 border rounded ${checked 
          ? 'bg-blue-500 border-blue-500 flex items-center justify-center' 
          : 'border-gray-300 dark:border-gray-600'}`}>
          {checked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </li>
  );
};

// Create a custom processor for the markdown content
export const processMarkdown = (content: string): string => {
  // Process task lists
  let processed = content.replace(/^(\s*)-\s*\[([ xX])\]\s*(.*?)$/gm, (_, indent, check, text) => {
    const isChecked = check.toLowerCase() === 'x';
    return `${indent}- [task:${isChecked ? 'checked' : 'unchecked'}] ${text}`;
  });
  
  return processed;
};

// Define a wrapper for code blocks so they render properly
const PreBlock = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  if (
    React.isValidElement(children) && 
    typeof children.type === 'string' && 
    children.type === 'code'
  ) {
    return <CodeBlock>{(children.props as { children: React.ReactNode }).children}</CodeBlock>;
  }
  
  return (
    <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md mb-6 overflow-x-auto whitespace-pre-wrap" {...props}>
      {children}
    </pre>
  );
};

// Custom list item component that can render both regular list items and task list items
const ListItem = ({ children, ...props }: any) => {
  // Check if this is a task list item
  if (children && typeof children[0] === 'string') {
    const match = children[0].match(/^\[task:(checked|unchecked)\]\s(.*)/);
    if (match) {
      const isChecked = match[1] === 'checked';
      // Replace the task marker with the actual text
      const actualText = match[2];
      const otherChildren = children.slice(1);
      
      return (
        <TaskListItem checked={isChecked}>
          {actualText}
          {otherChildren}
        </TaskListItem>
      );
    }
  }
  
  // Regular list item
  return (
    <li className="mb-3" {...props}>
      {children}
    </li>
  );
};

// Define markdown rendering options with custom components
export const markdownOptions = {
  forceBlock: true,
  disableParsingRawHTML: false,
  overrides: {
    code: {
      component: CodeBlock
    },
    pre: {
      component: PreBlock
    },
    a: {
      component: ({ children, ...props }: any) => (
        <a 
          {...props} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {children}
        </a>
      )
    },
    table: {
      component: ({ children, ...props }: any) => (
        <div className="overflow-x-auto my-6 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
          <table className="min-w-full border-collapse bg-white dark:bg-gray-800 table-fixed" {...props}>
            {children}
          </table>
        </div>
      )
    },
    thead: {
      component: ({ children, ...props }: any) => (
        <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
          {children}
        </thead>
      )
    },
    th: {
      component: ({ children, ...props }: any) => (
        <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 text-left font-semibold bg-gray-50 dark:bg-gray-700" {...props}>
          {children}
        </th>
      )
    },
    td: {
      component: ({ children, ...props }: any) => (
        <td className="border-b border-gray-200 dark:border-gray-700 px-4 py-2" {...props}>
          {children}
        </td>
      )
    },
    ul: {
      component: ({ children, ...props }: any) => (
        <ul className="list-disc pl-6 mb-6 space-y-2" {...props}>
          {children}
        </ul>
      )
    },
    ol: {
      component: ({ children, ...props }: any) => (
        <ol className="list-decimal pl-6 mb-6 space-y-2" {...props}>
          {children}
        </ol>
      )
    },
    li: {
      component: ListItem
    },
    blockquote: {
      component: ({ children, ...props }: any) => (
        <blockquote className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 italic my-6 text-gray-700 dark:text-gray-300" {...props}>
          {children}
        </blockquote>
      )
    },
    h1: {
      component: ({ children, ...props }: any) => (
        <h1 className="text-2xl font-bold mt-8 mb-4" {...props}>
          {children}
        </h1>
      )
    },
    h2: {
      component: ({ children, ...props }: any) => (
        <h2 className="text-xl font-bold mt-7 mb-3" {...props}>
          {children}
        </h2>
      )
    },
    h3: {
      component: ({ children, ...props }: any) => (
        <h3 className="text-lg font-bold mt-6 mb-3" {...props}>
          {children}
        </h3>
      )
    },
    h4: {
      component: ({ children, ...props }: any) => (
        <h4 className="text-base font-bold mt-5 mb-2" {...props}>
          {children}
        </h4>
      )
    },
    h5: {
      component: ({ children, ...props }: any) => (
        <h5 className="text-sm font-bold mt-4 mb-2" {...props}>
          {children}
        </h5>
      )
    },
    h6: {
      component: ({ children, ...props }: any) => (
        <h6 className="text-xs font-bold mt-3 mb-2" {...props}>
          {children}
        </h6>
      )
    },
    p: {
      component: ({ children, ...props }: any) => (
        <p className="mb-6 leading-relaxed" {...props}>
          {children}
        </p>
      )
    },
    hr: {
      component: ({ ...props }: any) => (
        <hr className="my-6 border-t border-gray-200 dark:border-gray-700" {...props} />
      )
    },
    img: {
      component: ({ src, alt, ...props }: any) => (
        <img 
          src={src} 
          alt={alt || ''} 
          className="max-w-full h-auto my-5 rounded-md shadow-sm"
          {...props}
        />
      )
    }
  }
};

export default function MessageContent({ content, role, images }: MessageContentProps) {
  const { thinking, visible } = parseMessageContent(content || '');
  const [copied, setCopied] = useState(false);

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  };

  // Process the markdown content for task lists
  const processedContent = processMarkdown(visible);

  return (
    <div className="relative">
      {thinking && (
        <div className="my-6 space-y-3">
          <div className="flex items-center gap-2 text-[var(--text-light-default)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-sm font-medium">Thinking</h3>
          </div>
          <div className="pl-4 relative">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--secondary-darkest)]"></div>
            <div className="text-sm text-[var(--text-light-muted)] whitespace-pre-wrap">{thinking}</div>
          </div>
        </div>
      )}
      
      {visible && (
        <div className="markdown-content prose prose-base max-w-none dark:prose-invert overflow-hidden">
          <Markdown options={markdownOptions}>{processedContent}</Markdown>
        </div>
      )}

      {images && (
        <GeneratedImageView images={images} />
      )}
    </div>
  );
}