import chalk from 'chalk';

// ANSI color codes for terminal output
export const colors = {
  // Basic colors
  green: '\\x1b[32m',
  brightGreen: '\\x1b[92m',
  yellow: '\\x1b[33m',
  brightYellow: '\\x1b[93m',
  red: '\\x1b[31m',
  brightRed: '\\x1b[91m',
  blue: '\\x1b[34m',
  brightBlue: '\\x1b[94m',
  magenta: '\\x1b[35m',
  cyan: '\\x1b[36m',
  grey: '\\x1b[90m',
  white: '\\x1b[37m',
  reset: '\\x1b[0m',

  // Text styles
  bold: '\\x1b[1m',
  dim: '\\x1b[2m',
  italic: '\\x1b[3m',
  underline: '\\x1b[4m',

  // Semantic colors for test output
  success: '\\x1b[92m', // bright green
  warning: '\\x1b[93m', // bright yellow
  error: '\\x1b[91m', // bright red
  info: '\\x1b[94m', // bright blue
  neutral: '\\x1b[90m', // grey
  
  // Diff colors
  added: '\\x1b[32m', // green
  removed: '\\x1b[31m', // red
  modified: '\\x1b[33m', // yellow
};

// Helper functions for colored output
export const colorize = {
  success: (text: string) => `${colors.success}${text}${colors.reset}`,
  warning: (text: string) => `${colors.warning}${text}${colors.reset}`,
  error: (text: string) => `${colors.error}${text}${colors.reset}`,
  info: (text: string) => `${colors.info}${text}${colors.reset}`,
  neutral: (text: string) => `${colors.neutral}${text}${colors.reset}`,
  bold: (text: string) => `${colors.bold}${text}${colors.reset}`,
  underline: (text: string) => `${colors.underline}${text}${colors.reset}`,
  
  // Test result helpers
  testPass: (text: string) => `${colors.success}✓ ${text}${colors.reset}`,
  testFail: (text: string) => `${colors.error}✗ ${text}${colors.reset}`,
  testWarn: (text: string) => `${colors.warning}⚠ ${text}${colors.reset}`,
  testInfo: (text: string) => `${colors.info}ℹ ${text}${colors.reset}`,
  
  // Section helpers
  header: (text: string) => `${colors.bold}${colors.brightBlue}=== ${text} ===${colors.reset}`,
  subHeader: (text: string) => `${colors.brightYellow}--- ${text} ---${colors.reset}`,
};

export const added = (text: string) => chalk.green(text);
export const removed = (text: string) => chalk.red(text);
export const error = (text: string) => chalk.red(text);
export const warning = (text: string) => chalk.yellow(text);
export const success = (text: string) => chalk.green(text);
export const info = (text: string) => chalk.blue(text);
export const testPass = (text: string) => chalk.green('✅ ' + text);
export const testFail = (text: string) => chalk.red('❌ ' + text); 