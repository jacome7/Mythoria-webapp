import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MDXComponents } from 'mdx/types';
import ClientCodeBlock from '@/components/ClientCodeBlock';
import ClientMermaidChart from '@/components/ClientMermaidChart';

// Safe HTML components for blog MDX content
// Only allowing a curated set of components for security

const MDXImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}> = ({ src, alt, width = 800, height = 400, className = '' }) => {
  return (
    <div className={`my-6 ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="rounded-lg shadow-md w-full h-auto"
        unoptimized={src.startsWith('http')} // For external images
      />
    </div>
  );
};

const MDXLink: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
}> = ({ href, children, className = '' }) => {
  const isExternal = href.startsWith('http') || href.startsWith('//');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`link link-primary hover:link-secondary ${className}`}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={`link link-primary hover:link-secondary ${className}`}>
      {children}
    </Link>
  );
};

const MDXBlockquote: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <blockquote className="border-l-4 border-primary pl-6 py-4 my-6 bg-base-200 rounded-r-lg italic">
      {children}
    </blockquote>
  );
};

const MDXCodeBlock: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  // Use the client-side code block component for all code blocks
  return <ClientCodeBlock className={className}>{children}</ClientCodeBlock>;
};

const MDXAlert: React.FC<{
  type?: 'info' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}> = ({ type = 'info', children }) => {
  const alertClasses = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error',
  };

  return <div className={`alert ${alertClasses[type]} my-6`}>{children}</div>;
};

const MDXCard: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => {
  return (
    <div className={`card bg-base-100 shadow-md border border-base-300 my-6 ${className}`}>
      {title && (
        <div className="card-body">
          <h3 className="card-title text-lg font-bold mb-4">{title}</h3>
          {children}
        </div>
      )}
      {!title && <div className="card-body">{children}</div>}
    </div>
  );
};

// Safe components for MDX rendering
export const mdxComponents: MDXComponents = {
  // Headers
  h1: ({ children, ...props }) => (
    <h1 className="text-4xl font-bold mb-6 text-primary" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-3xl font-bold mb-5 text-primary" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-2xl font-bold mb-4 text-primary" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-xl font-bold mb-3" {...props}>
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 className="text-lg font-bold mb-2" {...props}>
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 className="text-base font-bold mb-2" {...props}>
      {children}
    </h6>
  ),

  // Paragraphs and text
  p: ({ children, ...props }) => (
    <p className="mb-4 leading-relaxed text-base-content" {...props}>
      {children}
    </p>
  ),

  // Lists
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-outside ml-6 mb-4 space-y-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-outside ml-6 mb-4 space-y-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="mb-2 pl-2" {...props}>
      {children}
    </li>
  ),

  // Links and images
  a: MDXLink,
  img: ({ src, alt, ...props }) => <MDXImage src={src || ''} alt={alt || ''} {...props} />,

  // Code
  code: MDXCodeBlock,
  pre: ({ children, ...props }) => (
    <div className="mockup-code my-6" {...props}>
      {children}
    </div>
  ),

  // Quotes
  blockquote: MDXBlockquote,

  // Dividers
  hr: () => <div className="divider my-8"></div>,

  // Tables
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-6 not-prose">
      <table className="table table-zebra w-full border border-base-300" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-base-200" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => (
    <tr className="hover:bg-base-100" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className="font-bold text-left px-4 py-2 border-b border-base-300" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2 border-b border-base-300" {...props}>
      {children}
    </td>
  ),

  // Custom components
  Alert: MDXAlert,
  Card: MDXCard,
  Image: MDXImage,
  Mermaid: ClientMermaidChart,
};

export default mdxComponents;
