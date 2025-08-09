'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  id?: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    // Initialize mermaid with configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      themeVariables: {
        primaryColor: '#6366f1', // Tailwind indigo-500 to match your theme
        primaryTextColor: '#1f2937', // Tailwind gray-800
        primaryBorderColor: '#6366f1',
        lineColor: '#6b7280', // Tailwind gray-500
        secondaryColor: '#f3f4f6', // Tailwind gray-100
        tertiaryColor: '#ffffff',
        background: '#ffffff',
        mainBkg: '#ffffff',
        secondBkg: '#f9fafb', // Tailwind gray-50
        tertiaryBkg: '#f3f4f6',
      },
    });

    const renderChart = async () => {
      if (containerRef.current && chart) {
        try {
          // Clear previous content
          containerRef.current.innerHTML = '';
          
          // Render the mermaid chart
          const { svg } = await mermaid.render(chartId, chart);
          
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
            
            // Apply additional styling to the SVG
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.maxWidth = '100%';
            }
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `
              <div class="alert alert-error">
                <span>Error rendering chart: ${error instanceof Error ? error.message : 'Unknown error'}</span>
              </div>
            `;
          }
        }
      }
    };

    renderChart();
  }, [chart, chartId]);

  return (
    <div className="my-6 overflow-x-auto">
      <div 
        ref={containerRef}
        className="flex justify-center items-center min-h-[200px] bg-base-100 rounded-lg p-4 border border-base-300"
      />
    </div>
  );
};

export default MermaidChart;
