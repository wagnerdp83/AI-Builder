// Capability registry (data-driven). Extend additively; do not remove keys.
export const capabilityTokens = {
  layout: {
    container: {
      default: 'container mx-auto px-4',
      wide: 'max-w-7xl mx-auto px-4',
      full: 'w-full'
    }
  },
  themeDefaults: {
    fontFamily: 'serif',
    background: 'bg-gradient-to-br from-pink-50 to-purple-50',
    heading: 'text-gray-800',
    body: 'text-gray-600',
    button: 'bg-gradient-to-r from-pink-500 to-purple-600'
  },
  interactions: {
    beforeAfterHover: {
      type: 'hoverSwap',
      script: '' // kept empty; handled via CSS hover transitions
    }
  }
} as const;

export function getCapabilitiesVersion(): string {
  return '1.0.0';
}

