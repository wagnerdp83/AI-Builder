import { ComponentName } from './types';
import { logTestActivity } from './logging';

interface ApiResponse {
  success: boolean;
  error?: string;
  data?: any;
}

export class ApiEndpoints {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async updateProp(
    component: ComponentName,
    propName: string,
    value: any,
    testId: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/update-prop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component,
          propName,
          value
        })
      });

      if (!response.ok) {
        throw new Error(`Prop update failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logTestActivity(testId, 'info', 'Prop update successful', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logTestActivity(testId, 'error', 'Prop update failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateState(
    component: ComponentName,
    stateName: string,
    value: any,
    testId: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/update-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component,
          stateName,
          value
        })
      });

      if (!response.ok) {
        throw new Error(`State update failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logTestActivity(testId, 'info', 'State update successful', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logTestActivity(testId, 'error', 'State update failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateWithPartialMatch(
    component: ComponentName,
    selector: string,
    content: string,
    threshold: number,
    testId: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/partial-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component,
          selector,
          content,
          threshold
        })
      });

      if (!response.ok) {
        throw new Error(`Partial match update failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logTestActivity(testId, 'info', 'Partial match update successful', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logTestActivity(testId, 'error', 'Partial match update failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getComponentProps(
    component: ComponentName,
    testId: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/component-props/${component}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get component props: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logTestActivity(testId, 'info', 'Retrieved component props', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logTestActivity(testId, 'error', 'Failed to get component props', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateSelector(
    component: ComponentName,
    selector: string,
    testId: string
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/validate-selector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component,
          selector
        })
      });

      if (!response.ok) {
        throw new Error(`Selector validation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logTestActivity(testId, 'info', 'Selector validation result', result);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logTestActivity(testId, 'error', 'Selector validation failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}