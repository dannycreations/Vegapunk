import pino, { type Level, type Logger, type StreamEntry } from 'pino'
import pinoPretty from 'pino-pretty'

export * from 'pino'
export { pinoPretty }

/**
 * Creates and configures a pino logger instance with customizable options.
 * This logger can output to multiple streams, including formatted console output
 * and log files for errors and traces. It can also automatically handle
 * uncaught exceptions and unhandled promise rejections by logging them.
 *
 * The default behavior includes:
 * - Log level set to 'debug' in development (`process.env.NODE_ENV === 'development'`) and 'info' otherwise.
 * - Pretty-printing of logs to the console, optimized for development and production environments.
 * - Logging of warnings and errors to `./logs/errors.log`.
 * - Automatic logging of uncaught exceptions and unhandled promise rejections.
 *
 * @example
 * // Initialize logger with default settings
 * const log = logger();
 * log.info('Application started.');
 * log.debug('This is a debug message.'); // Visible if NODE_ENV is 'development'
 *
 * @example
 * // Initialize logger with custom options: warn level, trace file, no pretty printing
 * const customLog = logger({
 *   level: 'warn',
 *   trace: true,  // Enable trace logging to ./logs/traces.log
 *   pretty: false, // Disable console pretty printing
 *   exception: false // Disable automatic uncaught exception logging
 * });
 * customLog.warn('A warning message.'); // This will be logged
 * customLog.info('An info message.');   // This will NOT be logged due to 'warn' level
 * // Trace messages are written to file if options.trace is true and logger.level allows 'trace'.
 * // To make customLog actually log traces, its level would also need to be 'trace'.
 * // For example: logger({ level: 'trace', trace: true }).trace('details');
 *
 * @param {LoggerOptions=} [options={}] Configuration options for the logger.
 *   If not provided, an empty object is used, and internal defaults apply for each property.
 *   The `options` object can contain the following properties:
 *   - `level` (pino.Level): The minimum log level to be active (e.g., 'info', 'debug', 'trace').
 *     Defaults to 'debug' if `process.env.NODE_ENV` is 'development', otherwise 'info'.
 *   - `trace` (boolean): If `true`, enables a separate log stream for 'trace' level messages
 *     to `./logs/traces.log`. This stream is independent of the main log level for console/other streams
 *     but messages are only written if the logger's overall level also permits 'trace'.
 *     Defaults to `false`.
 *   - `pretty` (boolean): If `true`, formats console log output for readability using
 *     `pino-pretty`. Behavior (colorize, sync, singleLine) adapts to `NODE_ENV`.
 *     Defaults to `true`.
 *   - `exception` (boolean): If `true`, sets up a global handler to log uncaught exceptions
 *     as fatal errors using the configured logger. Defaults to `true`.
 *   - `rejection` (boolean): If `true`, sets up a global handler to log unhandled promise
 *     rejections as fatal errors using the configured logger. Defaults to `true`.
 * @returns {pino.Logger} A configured pino logger instance from the 'pino' library.
 * @throws {Error} This function may throw an error if file system operations, such as
 *   creating log directories (e.g., `./logs/`) or writing to log files (e.g.,
 *   `errors.log`, `traces.log`), fail. This typically occurs due to issues like
 *   insufficient file system permissions.
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

export interface LoggerOptions {
  level?: Level
  trace?: boolean
  pretty?: boolean
  exception?: boolean
  rejection?: boolean
}
