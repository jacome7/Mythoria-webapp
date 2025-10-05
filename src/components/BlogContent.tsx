import React from 'react';

interface BlogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const BlogContent: React.FC<BlogContentProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
      blog-content 
      prose prose-lg max-w-none
      prose-headings:text-primary
      prose-headings:font-bold
      prose-h1:text-4xl prose-h1:mb-6
      prose-h2:text-3xl prose-h2:mb-5
      prose-h3:text-2xl prose-h3:mb-4
      prose-p:mb-4 prose-p:leading-relaxed prose-p:text-base-content
      prose-a:text-primary prose-a:no-underline hover:prose-a:text-secondary
      prose-strong:text-primary prose-strong:font-bold
      prose-em:text-secondary prose-em:italic
      prose-code:bg-base-200 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
      prose-pre:bg-base-300 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
      prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:bg-base-200 prose-blockquote:rounded-r-lg prose-blockquote:italic
      prose-ul:list-disc prose-ul:list-inside prose-ul:mb-4 prose-ul:space-y-1
      prose-ol:list-decimal prose-ol:list-inside prose-ol:mb-4 prose-ol:space-y-1
      prose-li:mb-1
      prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto
      prose-hr:border-base-300 prose-hr:my-8
      ${className}
    `}
    >
      {children}
    </div>
  );
};

export default BlogContent;
