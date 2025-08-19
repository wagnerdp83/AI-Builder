import { Loader2 } from 'lucide-react';
import React from 'react';
import { useDeploymentStore } from '@/lib/stores/deployment';
import DeploymentManager from '@/components/deployment/DeploymentManager';

interface MainProps {
  isLoading: boolean;
  viewport: 'mobile' | 'tablet' | 'desktop';
}

export default function Main({ isLoading, viewport }: MainProps) {
  const { isPanelOpen } = useDeploymentStore();
  
  const viewportStyles = {
    mobile: '375px',
    tablet: '768px',
    desktop: '1280px'
  };

  return (
    <>    
    
    
    <div 
      className="h-full mx-auto flex items-center justify-center bg-background transition-all duration-300 ease-in-out relative"
      style={{
        width: viewportStyles[viewport],
        maxWidth: viewportStyles[viewport]
      }}
    >
      <div className="absolute top-0 left-0 right-0">
        <DeploymentManager />
      </div> 
      <div 
        className="h-full w-full bg-background dark:bg-[#040404] shadow-lg relative overflow-hidden flex items-center justify-center dark:shadow-gray-900"
      >
        {isLoading && (
          <div className="absolute inset-0 bg-background/70 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-foreground" />
              <div className="text-sm text-muted-foreground">Processing edit...</div>
            </div>
          </div>
        )}
        <iframe
          src={process.env.NEXT_PUBLIC_ASTRO_URL || 'http://localhost:4321'}
          className="w-full h-full"
        />
      </div>
    </div>
      </>
  );
} 