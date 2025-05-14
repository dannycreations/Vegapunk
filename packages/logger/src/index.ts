import pino, { type Level, type Logger, type StreamEntry } from 'pino'
import pinoPretty from 'pino-pretty'

export * from 'pino'
export { pinoPretty }

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
  }

  const logger = pino(
    {
      level: options.level,
      base: undefined,
      nestedKey: 'payload',
    },
    pino.multistream(streams),
  )

  if (options.exception) {
    process.on('uncaughtException', (error, origin) => {
      logger.fatal({ error, origin }, 'UncaughtException')
    })
  }
  if (options.rejection) {
    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, 'UnhandledRejection')
    })
  }
  return logger
}

export interface LoggerOptions {
  level?: Level
  trace?: boolean
  pretty?: boolean
  exception?: boolean
  rejection?: boolean
}
