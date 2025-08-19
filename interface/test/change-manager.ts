import { 
  VersionedTestCase, 
  VersionedComponent, 
  Version,
  ComponentSchema,
  EnhancedTestResult
} from './types';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export class ChangeManager {
  private changeLog: Map<string, Array<EnhancedTestResult>>;
  private componentVersions: Map<string, VersionedComponent>;
  
  constructor() {
    this.changeLog = new Map();
    this.componentVersions = new Map();
  }

  // Validate if a change can be safely applied
  async validateChange(testCase: VersionedTestCase): Promise<boolean> {
    const component = this.componentVersions.get(testCase.expectedResult.section);
    if (!component) return false;

    // Version compatibility check
    if (!this.isVersionCompatible(component.version, testCase.componentVersion)) {
      return false;
    }

    // Schema validation
    return this.validateAgainstSchema(testCase, component.schema);
  }

  // Apply changes safely with rollback capability
  async applyChange(testCase: VersionedTestCase): Promise<EnhancedTestResult> {
    const backupPath = await this.createBackup(testCase);
    
    try {
      // Apply the change
      const result = await this.executeChange(testCase);
      
      // Validate post-conditions
      if (testCase.validation?.postConditions) {
        const postValidation = await this.validatePostConditions(testCase, result);
        if (!postValidation.success) {
          await this.rollback(backupPath, testCase);
          throw new Error(`Post-condition failed: ${postValidation.message}`);
        }
      }

      // Record the change
      this.recordChange(result);
      
      return result;
    } catch (error) {
      await this.rollback(backupPath, testCase);
      throw error;
    }
  }

  // Create a hash of the change for tracking
  private createChangeHash(testCase: VersionedTestCase): string {
    const content = JSON.stringify({
      component: testCase.expectedResult.section,
      version: testCase.version,
      changes: testCase.expectedResult.changes
    });
    return createHash('sha256').update(content).digest('hex');
  }

  // Check version compatibility
  private isVersionCompatible(currentVersion: Version, requiredVersion: Version): boolean {
    const [curMajor, curMinor, curPatch] = currentVersion.slice(1).split('.').map(Number);
    const [reqMajor, reqMinor, reqPatch] = requiredVersion.slice(1).split('.').map(Number);
    
    // Major version must match exactly
    if (curMajor !== reqMajor) return false;
    
    // Current minor version must be greater or equal
    if (curMinor < reqMinor) return false;
    
    // If minor versions match, current patch must be greater or equal
    if (curMinor === reqMinor && curPatch < reqPatch) return false;
    
    return true;
  }

  // Validate changes against component schema
  private async validateAgainstSchema(
    testCase: VersionedTestCase,
    schema: ComponentSchema
  ): Promise<boolean> {
    for (const change of testCase.expectedResult.changes) {
      switch (change.type) {
        case 'style':
          if (!schema.styles[change.category!]?.properties.includes(change.property)) {
            return false;
          }
          if (schema.styles[change.category!]?.constraints?.validation) {
            if (!schema.styles[change.category!]?.constraints?.validation!(change.value)) {
              return false;
            }
          }
          break;
          
        case 'content':
          const contentProp = change.property as keyof typeof schema.content;
          if (!schema.content[contentProp]) {
            return false;
          }
          if (schema.content[contentProp]?.validation) {
            if (!schema.content[contentProp]?.validation!(change.value)) {
              return false;
            }
          }
          break;
          
        case 'layout':
          const layoutProp = change.property as keyof typeof schema.layout;
          if (!schema.layout[layoutProp]) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  // Create backup before applying changes
  private async createBackup(testCase: VersionedTestCase): Promise<string> {
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', 
      `${testCase.expectedResult.section}.astro`
    );
    const backupPath = `${componentPath}.backup-${testCase.version}-${Date.now()}`;
    await fs.copyFile(componentPath, backupPath);
    return backupPath;
  }

  // Execute the change
  private async executeChange(testCase: VersionedTestCase): Promise<EnhancedTestResult> {
    const startTime = process.hrtime();
    const startUsage = process.cpuUsage();
    
    // ... (implementation of actual change execution)
    
    const endTime = process.hrtime(startTime);
    const endUsage = process.cpuUsage(startUsage);
    
    return {
      version: testCase.version,
      success: true,
      duration: endTime[0] * 1000 + endTime[1] / 1000000,
      changes: testCase.expectedResult.changes.map(change => ({
        ...change,
        version: testCase.version,
        hash: this.createChangeHash(testCase),
        appliedAt: new Date().toISOString()
      })),
      metadata: {
        environment: {
          nodeVersion: process.version,
          dependencies: this.getDependencyVersions(),
          timestamp: new Date()
        },
        performance: {
          executionTime: endTime[0] * 1000 + endTime[1] / 1000000,
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: endUsage.user + endUsage.system
        }
      },
      validation: {
        passed: true,
        issues: []
      }
    };
  }

  // Record change in the change log
  private recordChange(result: EnhancedTestResult): void {
    const component = result.changes[0]?.type || 'unknown';
    if (!this.changeLog.has(component)) {
      this.changeLog.set(component, []);
    }
    this.changeLog.get(component)!.push(result);
  }

  // Get dependency versions from package.json
  private getDependencyVersions(): Record<string, string> {
    try {
      const packageJson = require(join(process.cwd(), 'package.json'));
      return {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
    } catch {
      return {};
    }
  }

  // Rollback changes if needed
  private async rollback(backupPath: string, testCase: VersionedTestCase): Promise<void> {
    const componentPath = join(process.cwd(), '..', '..', 'rendering', 'src', 'components', 
      `${testCase.expectedResult.section}.astro`
    );
    await fs.copyFile(backupPath, componentPath);
    await fs.unlink(backupPath);
  }
} 