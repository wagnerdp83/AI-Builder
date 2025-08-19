import { TestLog } from './types';

// In-memory log storage
const logs: TestLog[] = [];

export function logTestActivity(
  testId: string,
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any
): void {
  const log: TestLog = {
    timestamp: new Date(),
    level,
    testId,
    message,
    data
  };

  // Store log
  logs.push(log);

  // Also log to console with appropriate formatting
  const timestamp = log.timestamp.toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${testId}]`;
  
  switch (level) {
    case 'error':
      console.error(prefix, message, data || '');
      break;
    case 'warn':
      console.warn(prefix, message, data || '');
      break;
    case 'debug':
      console.debug(prefix, message, data || '');
      break;
    default:
      console.log(prefix, message, data || '');
  }
}

export function getTestLogs(testId: string): TestLog[] {
  return logs.filter(log => log.testId === testId);
}

export function clearTestLogs(testId: string): void {
  const index = logs.findIndex(log => log.testId === testId);
  if (index !== -1) {
    logs.splice(index, 1);
  }
}

export function getAllLogs(): TestLog[] {
  return [...logs];
}

export function clearAllLogs(): void {
  logs.length = 0;
} 