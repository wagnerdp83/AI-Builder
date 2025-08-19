import { create } from 'zustand';

type DeploymentStep = 'options' | 'publishing' | 'success' | 'error';

interface DeploymentState {
  isPanelOpen: boolean;
  currentStep: DeploymentStep;
  message: string | null;
  setIsPanelOpen: (isOpen: boolean) => void;
  setCurrentStep: (step: DeploymentStep) => void;
  setMessage: (message: string | null) => void;
  reset: () => void;
}

export const useDeploymentStore = create<DeploymentState>((set) => ({
  isPanelOpen: false,
  currentStep: 'options',
  message: null,
  setIsPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setMessage: (message) => set({ message }),
  reset: () => set({ isPanelOpen: false, currentStep: 'options', message: null }),
})); 