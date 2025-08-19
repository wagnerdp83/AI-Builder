'use client';

import { useEffect } from 'react';
import { Globe, Server, Loader2, CheckCircle, XCircle, X, ExternalLink } from 'lucide-react';
import { useDeploymentStore } from '@/lib/stores/deployment';

export default function DeploymentManager() {
  const { isPanelOpen, currentStep, message, setIsPanelOpen, setCurrentStep, setMessage, reset } = useDeploymentStore();

  useEffect(() => {
    if (!isPanelOpen) {
      reset();
    }
  }, [isPanelOpen, reset]);

  if (!isPanelOpen) return null;

  const handlePublicDeploy = async () => {
    try {
      setCurrentStep('publishing');
      setMessage('Publishing ....');

      const response = await fetch('/api/deploy', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred.');
      }

      setCurrentStep('success');
      // No need to set message here as we're using static content in the success step
    } catch (err: any) {
      setCurrentStep('error');
      setMessage(err.message);
      console.error('Failed to trigger build:', err);
    }
  };

  return (
    <div 
      className="absolute top-0 right-0 w-[22%] max-w-md m-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-lg z-[100] transition-all duration-300 ease-in-out origin-top"
      style={{
        opacity: isPanelOpen ? '1' : '0',
        transform: isPanelOpen ? 'translateY(0) scaleY(1)' : 'translateY(-10px) scaleY(0)',
      }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="p-4 relative">
          {/* Close Button */}
          <button
            onClick={() => setIsPanelOpen(false)}
            className="absolute right-4 top-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Options Step */}
          {currentStep === 'options' && (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Where to Publish?
              </h3>
             
              <div className="mt-4 flex flex-col space-y-3 w-full">
                {/* Public Option */}
                <button
                  onClick={handlePublicDeploy}
                  className="w-full py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                >
                  <Globe className="w-4 h-4" />
                  <span>Public </span>
                </button>
                {/* Private Option */}
                <button
                  disabled
                  className="w-full py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600"
                >
                  <Server className="w-4 h-4" />
                  <span>Private </span>
                  <span className="ml-2 inline-flex items-center gap-x-1 py-0.5 px-2 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Coming Soon
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Publishing Step */}
          {currentStep === 'publishing' && (
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {message}
              </p>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center mt-8">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Site published successfully!
                  </p>
                </div>
                <a 
                  href="https://funnel.foxfreela.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View your site</span>
                </a>
              </div>
            </div>
          )}

          {/* Error Step */}
          {currentStep === 'error' && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Deployment Failed: {message}
                </p>
              </div>
              <button
                onClick={handlePublicDeploy}
                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 