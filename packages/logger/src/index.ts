import pino, { type Level, type Logger, type StreamEntry } from 'pino'
import pinoPretty from 'pino-pretty'

export * from 'pino'
export { pinoPretty }

/**
 * Creates and configures a Pino logger instance.
 *
 * This function initializes a logger with customizable settings.
 * The effective default for the log level is 'debug' in development environments
 * (`process.env.NODE_ENV === 'development'`) and 'info' otherwise.
 * Pretty printing for console output is active by default. Trace logging to a
 * file (`logs/traces.log`) is inactive by default but can be enabled via options.
 * Logging of 'warn' level messages and above to `logs/errors.log` is always active.
 * By default, this function also sets up global handlers for `uncaughtException`
 * and `unhandledRejection` events, logging them as fatal errors.
 * These behaviors can be further customized through the `options` parameter.
 *
 * @example
 * // Initialize logger with default options (behavior influenced by NODE_ENV)
 * const log = logger();
 * log.info('Application started.');
 *
 * // Initialize logger with a specific level and disabled pretty printing
 * const prodLog = logger({ level: 'warn', pretty: false });
 * prodLog.warn('A warning occurred in production mode.');
 *
 * // Initialize logger with file tracing enabled and exception handling disabled
 * const customLog = logger({ trace: true, exception: false });
 * customLog.info('Custom logger setup, tracing to file.');
 * customLog.trace('This is a detailed trace message.');
 *
 * @param {LoggerOptions} [options={}] Configuration for the logger.
 *   See {@link LoggerOptions} for available settings and their effective defaults.
 * @returns {Logger} A configured Pino logger instance.
 */
export function logger(options: LoggerOptions = {}): Logger {
  options = {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    trace: false,
    pretty: true,
    exception: true,
    rejection: true,
    ...options,
  }

  const streams: StreamEntry[] = [
    {
      level: 'warn',
      stream: pino.destination({
        mkdir: true,
        dest: `${process.cwd()}/logs/errors.log`,
      }),
    },
  ]

  if (options.trace) {
    streams.push({
      level: 'trace',
      stream: pino.destination({
        mkdir: true,
        dest: `${process.cwd()}/logs/traces.log`,
      }),
    })
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
    })
  } else {
    streams.push({
      level: options.level,
      stream: process.stdout,
    })
  }

  const instance = pino(
    {
      level: options.level,
      base: undefined,
      nestedKey: 'payload',
    },
    pino.multistream(streams),
  )

  if (options.exception) {
    process.on('uncaughtException', (error, origin) => {
      instance.fatal({ error, origin }, 'UncaughtException')
    })
  }
  if (options.rejection) {
    process.on('unhandledRejection', (reason, promise) => {
      instance.fatal({ reason, promise }, 'UnhandledRejection')
    })
  }
  return instance
}

/**
 * Defines the configuration options for the {@link logger} function.
 * These options allow customization of logging behavior, such as level,
 * output formatting, and error handling.
 */
export interface LoggerOptions {
  /**
   * The minimum logging level. The {@link logger} function defaults this to 'debug'
   * if `process.env.NODE_ENV` is 'development', and 'info' otherwise.
   */
  level?: Level
  /**
   * Specifies whether to enable detailed trace logging to `logs/traces.log`.
   * The {@link logger} function defaults this to `false`.
   */
  trace?: boolean
  /**
   * Specifies whether to enable pretty-printed, human-readable console output.
   * The {@link logger} function defaults this to `true`.
   */
  pretty?: boolean
  /**
   * Specifies whether the {@link logger} should automatically log `uncaughtException` events.
   * The {@link logger} function defaults this to `true`.
   */
  exception?: boolean
  /**
   * Specifies whether the {@link logger} should automatically log `unhandledRejection` events.
   * The {@link logger} function defaults this to `true`.
   */
  rejection?: boolean
}
