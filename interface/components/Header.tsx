import { useState } from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import ViewportControls from './ViewportControls';
import { ThemeToggle } from './ThemeToggle';
import { PublishButton } from './PublishButton';
import DeploymentManager from '@/components/deployment/DeploymentManager';

interface HeaderProps {
  viewport: 'mobile' | 'tablet' | 'desktop';
  setViewport: (viewport: 'mobile' | 'tablet' | 'desktop') => void;
  isLoading: boolean;
  isSidebarOpen: boolean;
}

export default function Header({ viewport, setViewport, isLoading, isSidebarOpen }: HeaderProps) {
  return (
    <header className="sticky top-0 inset-x-0 flex flex-wrap sm:justify-start sm:flex-nowrap z-[48] w-full bg-white border-b text-sm py-2.5 sm:py-4 dark:bg-gray-900 dark:border-gray-700">
      <nav className="flex basis-full items-center w-full mx-auto px-4 sm:px-6 md:px-8" aria-label="Global">
        <div className="w-[50px] flex items-center">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex justify-center">
          <ViewportControls
            viewport={viewport}
            setViewport={setViewport}
            isLoading={isLoading}
          />
        </div>

        <div className="w-[50px] flex items-center justify-end">
          <PublishButton isLoading={isLoading} />
        </div>
      </nav>
    </header>
  );
} 