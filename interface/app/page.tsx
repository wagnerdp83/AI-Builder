'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import PromptBuilder from '@/components/PromptBuilder';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';


// Dynamically import Main with no SSR to avoid hydration issues
const Main = dynamic(() => import('@/components/Main'), { ssr: false });

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen ">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 w-full flex flex-col relative ">
        <Header 
          viewport={viewport}
          setViewport={setViewport}
          isLoading={isLoading}
          isSidebarOpen={sidebarOpen}
        />
        
        <main id="viewport" className="flex-1 bg-gray-100 dark:bg-neutral-700">
        
          <Main 
            isLoading={isLoading}
            viewport={viewport}
          />
        </main>
        
        

        <div className="absolute bottom-5 z-10 left-0 right-0 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-2xl pointer-events-auto">
            <PromptBuilder
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}