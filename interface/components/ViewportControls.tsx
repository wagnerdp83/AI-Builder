import React from 'react';
import { Button } from './ui/button';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

interface ViewportControlsProps {
  viewport: 'mobile' | 'tablet' | 'desktop';
  setViewport: (viewport: 'mobile' | 'tablet' | 'desktop') => void;
  isLoading: boolean;
}

export default function ViewportControls({ viewport, setViewport, isLoading }: ViewportControlsProps) {
  const viewportOptions = [
    { id: 'mobile', icon: Smartphone, title: 'Mobile', label: 'Mobile', size: '375px', iconSize: '!h-6 !w-6' },
    { id: 'tablet', icon: Tablet, title: 'Tablet', label: 'Tablet', size: '768px', iconSize: '!h-7 !w-7' },
    { id: 'desktop', icon: Monitor, title: 'Desktop', label: 'Desktop', size: '1280px', iconSize: '!h-8 !w-8' }
  ] as const;

  return (
    <div className="flex items-center justify-center gap-x-6">
      {viewportOptions.map(({ id, icon: Icon, title, label, size, iconSize }) => (
        <div 
          key={id} 
          className={cn(
            "flex flex-col items-center gap-1 text-muted-foreground transition-colors cursor-pointer",
            viewport === id && "text-primary"
          )}
          onClick={() => setViewport(id)}
        >
          <div className="h-12 w-12 flex items-center justify-center">
            <Icon className={iconSize} />
          </div>
          <span className="text-[10px] font-mono">{size}</span>
        </div>
      ))}
    </div>
  );
} 