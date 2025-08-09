'use client';

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

export default MermaidChart;
