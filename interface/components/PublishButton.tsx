'use client';

import { Rocket } from "lucide-react"
import { Button } from "./ui/button"
import { useDeploymentStore } from '@/lib/stores/deployment';

export function PublishButton({ isLoading: initialIsLoading }: { isLoading?: boolean }) {
  const { setIsPanelOpen } = useDeploymentStore();

  return (
    <Button
      variant="outline"
      size="sm"
      className="cursor-pointer flex items-center gap-2"
      disabled={initialIsLoading}
      onClick={() => setIsPanelOpen(true)}
    >
      <Rocket className="h-4 w-4" />
      <span>{initialIsLoading ? 'Publishing...' : 'Publish'}</span>
    </Button>
  );
} 