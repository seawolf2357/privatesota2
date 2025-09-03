'use client';

import { cn } from '@/lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

// Pre-process text to convert various link formats to standard markdown
function preprocessContent(content: any): any {
  if (typeof content !== 'string') return content;
  
  let text = content;
  
  // Convert reference-style links: [1] 텍스트 - URL => [텍스트](URL)
  text = text.replace(/\[(\d+)\]\s+([^-\n]+?)\s*-\s*(https?:\/\/[^\s\n]+)/gm, '[$2]($3)');
  
  // Convert standalone URLs to markdown links
  // But avoid URLs that are already in markdown link format
  text = text.replace(/(?<!\(|<)(https?:\/\/[^\s\)\]]+)(?!\)|>)/gm, '<$1>');
  
  return text;
}

export const Response = memo(
  ({ className, children, ...props }: ResponseProps) => {
    const processedChildren = preprocessContent(children);
    
    return (
      <Streamdown
        className={cn(
          'size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
          className,
        )}
        components={{
          code: ({ children, className, ...props }) => (
            <code className={className} {...props}>
              {children}
            </code>
          ),
          a: ({ children, href, ...props }) => {
            // Make sure href is valid
            if (!href) return <span>{children}</span>;
            
            const fullUrl = href.startsWith('http') || href.startsWith('//') 
              ? href 
              : `https://${href}`;
            
            return (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                onClick={(e) => {
                  // Log for debugging
                  console.log('Link clicked:', fullUrl);
                }}
                {...props}
              >
                {children || href}
              </a>
            );
          },
        }}
        {...props}
      >
        {processedChildren}
      </Streamdown>
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = 'Response';
