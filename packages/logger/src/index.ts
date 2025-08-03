import pino from 'pino';
import pinoPretty from 'pino-pretty';

import type { Level, Logger, StreamEntry } from 'pino';

export * from 'pino';
export { pinoPretty };

/**
 * Creates and configures a Pino {@link Logger} instance.
 * This function sets up a logger with multiple streams for different log levels
 * and destinations. It includes console output, which can be pretty-printed using
 * {@link pinoPretty}, and file outputs for errors (`logs/errors.log`) and,
 * optionally, traces (`logs/traces.log`). The logger can also be configured to
 * automatically log uncaught exceptions and unhandled promise rejections.
 *
 * @example
 * // Initialize logger with default settings.
 * // In development, this defaults to 'debug' level with pretty printing.
 * // In production, this defaults to 'info' level with single-line JSON pretty printing.
 * const log = logger();
 * log.info('Application started successfully.');
 * log.debug({ module: 'Auth' }, 'User authentication attempt.');
 *
 * // Initialize logger with custom options.
 * const customLog = logger({
 *   level: 'warn',      // Log only 'warn' level and above to console/pretty stream.
 *   trace: true,        // Enable trace logging to 'logs/traces.log'.
 *   pretty: false,      // Disable pretty printing for console (use standard JSON).
 *   exception: false,   // Disable automatic logging of uncaught exceptions.
 * });
 *
 * customLog.warn('A warning condition occurred.');
 * customLog.trace('Detailed trace information for debugging.'); // Logged to trace file.
 *
 * try {
 *   throw new Error('Simulated error');
 * } catch (e) {
 *   customLog.error(e, 'An error was caught and logged.');
 * }
 *
 * @param {LoggerOptions=} [options={}] Configuration for the logger.
 *   Consult {@link LoggerOptions} for details on available properties and their impact on logger behavior.
 *   Properties not specified in the `options` object will assume pre-defined values within the logger's initialization logic,
 *   such as `level` ('debug' in development, 'info' in production), `trace` (false), `pretty` (true),
 *   `exception` (true), and `rejection` (true).
 * @returns {Logger} A configured Pino {@link Logger} instance.
 */
export function logger(options: LoggerOptions = {}): Logger {
  options = {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    trace: false,
    pretty: true,
    exception: true,
    rejection: true,
    ...options,
  };

  const streams: StreamEntry[] = [
    {
      level: 'warn',
      stream: pino.destination({
        mkdir: true,
        dest: `${process.cwd()}/logs/errors.log`,
      }),
    },
  ];

  if (options.trace) {
    streams.push({
      level: 'trace',
      stream: pino.destination({
        mkdir: true,
        dest: `${process.cwd()}/logs/traces.log`,
      }),
    });
  }
  if (options.pretty) {
    streams.push({
      level: options.level,
      stream: pinoPretty({
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        sync: process.env.NODE_ENV === 'development',
        singleLine: process.env.NODE_ENV === 'production',
      }),
    });
  } else {
    streams.push({
      level: options.level,
      stream: process.stdout,
    });
  }

  const instance = pino(
    {
      level: options.level,
      base: undefined,
      nestedKey: 'payload',
      hooks: {
        logMethod(args, method) {
          // Winston style
          if (args.length >= 2) {
            const [arg0, arg1, ...rest] = args;
            if (typeof arg0 === 'string' && typeof arg1 === 'object') {
              return method.apply(this, [arg1, arg0, ...rest]);
            } else if (args.every((r) => typeof r === 'string')) {
              return method.apply(this, [args.join(' ')]);
            }
          }

          // Pino style
          return method.apply(this, args);
        },
      },
    },
    pino.multistream(streams),
  );

  if (options.exception) {
    process.on('uncaughtException', (error, origin) => {
      instance.fatal({ error, origin }, 'UncaughtException');
    });
  }
  if (options.rejection) {
    process.on('unhandledRejection', (reason, promise) => {
      instance.fatal({ reason, promise }, 'UnhandledRejection');
    });
  }
  return instance;
}

/**
 * Interface for configuring the {@link logger} instance.
 * Defines various settings that control the logger's behavior, output formatting,
 * file logging, and automatic error capturing features.
 */
export interface LoggerOptions {
  /**
   * The minimum log level to be output by the primary streams (console/pretty).
   * When set, only logs at this level or higher will be processed by these streams.
   * Specific streams (like the 'warn' stream to `errors.log`) may have their own fixed levels.
   * Refer to Pino {@link Level} for possible values (e.g., 'trace', 'debug', 'info', 'warn', 'error', 'fatal').
   * If undefined, defaults to 'debug' if `process.env.NODE_ENV` is 'development', otherwise 'info'.
   */
  level?: Level;
  /**
   * Enables trace logging to a dedicated file (`logs/traces.log`).
   * If true, a separate stream is configured to write 'trace' level logs to this file.
   * If undefined or false, this trace file logging is disabled. Defaults to false.
   */
  trace?: boolean;
  /**
   * Enables pretty-printing of log messages to the console using {@link pinoPretty}.
   * If true, console logs are formatted for enhanced readability, with colorization and structured output.
   * If false, console logs are written to `process.stdout` in standard Pino JSON format.
   * If undefined, pretty-printing is enabled. Defaults to true.
   */
  pretty?: boolean;
  /**
   * Enables automatic logging of uncaught exceptions as fatal errors.
   * If true, a global 'uncaughtException' handler is registered, which uses the logger
   * to record the exception details before the process potentially terminates.
   * If undefined or false, this feature is disabled. Defaults to true.
   */
  exception?: boolean;
  /**
   * Enables automatic logging of unhandled promise rejections as fatal errors.
   * If true, a global 'unhandledRejection' handler is registered, which uses the logger
   * to record the rejection reason and associated promise.
   * If undefined or false, this feature is disabled. Defaults to true.
   */
  rejection?: boolean;
}
