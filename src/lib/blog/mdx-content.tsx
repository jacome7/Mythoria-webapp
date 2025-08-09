'use client';

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { mdxComponents } from './mdx-components';

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

export default function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <MDXRemote {...source} components={mdxComponents} />
    </div>
  );
}
