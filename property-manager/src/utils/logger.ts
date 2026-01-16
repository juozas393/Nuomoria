/**
 * Production-safe logger utility
 * Replaces console.log statements throughout the application
 * Only logs in development mode to meet performance rules
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, ...args: unknown[]): void {
    if (!this.isDevelopment && level !== 'error' && level !== 'warn') {
      return;
    }

    switch (level) {
      case 'error':
        console.error(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'log':
      case 'info':
      case 'debug':
        if (this.isDevelopment) {
          // eslint-disable-next-line no-console
          console.log(...args);
        }
        break;
    }
  }

  info(...args: unknown[]): void {
    this.log('info', ...args);
  }

  debug(...args: unknown[]): void {
    this.log('debug', ...args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args);
  }

  error(...args: unknown[]): void {
    this.log('error', ...args);
  }

  // Group logs (development only)
  group(label: string): void {
    if (this.isDevelopment && console.group) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }

  // Performance monitoring
  time(label: string): void {
    if (this.isDevelopment && console.time) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }

  // Table formatting (development only)
  table(data: unknown): void {
    if (this.isDevelopment && console.table) {
      console.table(data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience methods
export const logDev = (...args: unknown[]): void => logger.debug(...args);
export const logError = (...args: unknown[]): void => logger.error(...args);
export const logWarn = (...args: unknown[]): void => logger.warn(...args);


