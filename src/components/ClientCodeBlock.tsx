'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MermaidChart to avoid SSR issues
const MermaidChart = dynamic(() => import('@/components/MermaidChart'), {
  ssr: false,
  loading: () => (
    <div className="my-6 flex justify-center items-center min-h-[200px] bg-base-200 rounded-lg animate-pulse">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  ),
});

interface ClientCodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

const ClientCodeBlock: React.FC<ClientCodeBlockProps> = ({ children, className = '' }) => {
  const isInline = !className.includes('language-');
  
  if (isInline) {
    return (
      <code className="bg-base-200 px-2 py-1 rounded font-mono text-sm">
        {children}
      </code>
    );
  }
  
  // Check if this is a mermaid code block
  if (className.includes('language-mermaid')) {
    // Extract the text content from children
    let chartContent = '';
    if (typeof children === 'string') {
      chartContent = children;
    } else if (React.isValidElement(children) && children.props && typeof (children.props as any).children === 'string') {
      chartContent = (children.props as any).children;
    } else {
      chartContent = String(children);
    }
    
    // Clean up the chart content
    chartContent = chartContent.trim();
    
    return <MermaidChart chart={chartContent} />;
  }
  
  return (
    <div className="mockup-code my-6">
      <pre className="px-4 py-2">
        <code className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export default ClientCodeBlock;
