/**
 * Simple browser-based logger with configurable log levels
 * Provides structured logging without external dependencies
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
}

class Logger {
  private config: LoggerConfig;
  private moduleName?: string;

  constructor(config?: Partial<LoggerConfig>, moduleName?: string) {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableTimestamps: true,
      enableColors: true,
      ...config,
    };
    this.moduleName = moduleName;
  }

  private getLogLevelFromEnv(): LogLevel {
    // In production, default to WARN, in development default to DEBUG
    const isDev = import.meta.env.DEV;
    return isDev ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, ...args: any[]): any[] {
    const parts: any[] = [];

    if (this.config.enableTimestamps) {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm
      parts.push(`[${timestamp}]`);
    }

    parts.push(`[${level}]`);

    if (this.moduleName) {
      parts.push(`[${this.moduleName}]`);
    }

    return [...parts, ...args];
  }

  debug(...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const formatted = this.formatMessage('DEBUG', ...args);
    if (this.config.enableColors) {
      console.log('%c' + formatted[0], 'color: gray', ...formatted.slice(1));
    } else {
      console.log(...formatted);
    }
  }

  info(...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const formatted = this.formatMessage('INFO', ...args);
    if (this.config.enableColors) {
      console.log('%c' + formatted[0], 'color: blue', ...formatted.slice(1));
    } else {
      console.log(...formatted);
    }
  }

  warn(...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const formatted = this.formatMessage('WARN', ...args);
    if (this.config.enableColors) {
      console.warn('%c' + formatted[0], 'color: orange', ...formatted.slice(1));
    } else {
      console.warn(...formatted);
    }
  }

  error(...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    const formatted = this.formatMessage('ERROR', ...args);
    if (this.config.enableColors) {
      console.error('%c' + formatted[0], 'color: red', ...formatted.slice(1));
    } else {
      console.error(...formatted);
    }
  }
}

// Create a default logger instance
export const logger = new Logger();

// Factory function to create module-specific loggers
export const createLogger = (moduleName: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger(config, moduleName);
};

export default logger;
