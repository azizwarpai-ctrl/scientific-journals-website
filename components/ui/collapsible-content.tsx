import React, { useState, useRef, useEffect } from 'react';

interface CollapsibleContentProps {
  maxHeight?: number; // in pixels, default 300
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleContent({ maxHeight = 300, children, className }: CollapsibleContentProps) {
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setNeedsCollapse(height > maxHeight);
    }
  }, [children, maxHeight]);

  const containerStyle: React.CSSProperties = {
    maxHeight: expanded ? undefined : maxHeight,
    overflow: 'hidden',
    position: 'relative',
    transition: 'max-height 0.3s ease',
  };

  const gradientStyle: React.CSSProperties = {
    content: "''",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3rem',
    background: 'linear-gradient(to bottom, transparent, var(--background))',
    pointerEvents: 'none',
  };

  return (
    <div className={className}>
      <div ref={contentRef} style={containerStyle}>
        {children}
        {needsCollapse && !expanded && <div style={gradientStyle} />}
      </div>
      {needsCollapse && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
}
