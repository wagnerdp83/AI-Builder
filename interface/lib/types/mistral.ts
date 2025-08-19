export type Parameter = {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
    properties?: Record<string, Parameter>;
  };
  properties?: Record<string, Parameter>;
  required?: string[];
};

export type Tool = {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, Parameter>;
    required?: string[];
  };
};

export type MistralTools = Record<string, Tool>; 