import { ChildProcess, fork } from 'node:child_process';
import process from 'node:process';

/**
 * The maximum number of times the child process can be restarted within the
 * {@link RESTART_WINDOW_MS} before the parent process exits.
 */
const MAX_RESTARTS = 5;

/**
 * The time window in milliseconds during which the restart count is monitored.
 * If restarts exceed {@link MAX_RESTARTS} within this window, the application stops.
 */
const RESTART_WINDOW_MS = 60 * 1000;

/**
 * The delay in milliseconds before attempting to restart the child process
 * after it exits unexpectedly.
 */
const RESTART_CONFIRM_MS = 5 * 1000;

/**
 * Message type for signaling a graceful restart.
 */
const RESTART_CHILD_APP = 'RESTART_CHILD_APP';

/**
 * Tracks the number of child process restarts within the current time window.
 * This count is reset by {@link restartTimer}.
 */
let restartCount = 0;

/**
 * Holds the `setTimeout` timer responsible for resetting {@link restartCount}
 * after the {@link RESTART_WINDOW_MS} has passed. A `null` value indicates
 * no timer is active.
 */
let restartTimer: NodeJS.Timeout | null = null;

/**
 * Holds a reference to the currently active child process. A `null` value
 * indicates that no child process is running.
 */
let currentChild: ChildProcess | null = null;

/**
 * Runs the provided application logic in a managed child process.
 *
 * This function acts as a parent process manager. It forks a child process
 * to execute the `appLogic`. The parent process monitors the child and will
 * automatically restart it if it exits with a non-zero exit code. It implements
 * a rate limit to prevent rapid, continuous restarts. It also handles SIGINT
 * and SIGTERM signals to ensure a graceful shutdown of the application.
 *
 * @example
 * ```typescript
 * import { runApp } from '@vegapunk/utilities';
 *
 * async function myApplication(): Promise<void> {
 *   console.log('Application logic is running in a child process.');
 *   // Simulate some work
 *   await new Promise(resolve => setTimeout(resolve, 10000));
 *   console.log('Application logic finished.');
 * }
 *
 * runApp(myApplication);
 * ```
 *
 * @param {() => Promise<void>} appLogic The asynchronous application logic to
 *   be executed within the child process.
 * @returns {void}
 */
export function runApp(appLogic: () => Promise<void>): void {
  if (process.argv.length === 3 && process.argv[2] === '--child') {
    void appLogic().catch(console.error);
    return;
  }

  process.on('SIGINT', () => {
    console.log('Parent process received SIGINT. Exiting.');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Parent process received SIGTERM. Exiting.');
    process.exit(0);
  });

  process.on('message', (message) => {
    if (Object.is(message, RESTART_CHILD_APP)) {
      currentChild?.kill('SIGTERM');
    }
  });

  /**
   * Forks a new child process and sets up event listeners.
   *
   * This function creates a new child process to run the application logic.
   * It attaches listeners for the 'exit' and 'error' events to handle
   * unexpected termination and trigger the restart mechanism via
   * `startChildProcess`.
   *
   * @returns {void}
   */
  const forkNewChild = (): void => {
    currentChild = fork(process.argv[1], ['--child'], {
      execPath: process.execPath,
      stdio: 'inherit',
    });

    currentChild.once('exit', (code) => {
      currentChild = null;
      if (!['0', 'SIGINT', 'SIGTERM'].includes(String(code))) {
        console.log(`Restarting child process (attempt ${++restartCount}/${MAX_RESTARTS})...`);
        setTimeout(() => startChildProcess(), RESTART_CONFIRM_MS);
      } else {
        console.log('Child process exited cleanly or was terminated. Exiting.');
        process.exit(0);
      }
    });

    currentChild.once('error', (error) => {
      currentChild = null;
      console.error('Child process failed to start or encountered an error:', error);
      console.log(`Restarting child process (attempt ${++restartCount}/${MAX_RESTARTS})...`);
      setTimeout(() => startChildProcess(), RESTART_CONFIRM_MS);
    });
  };

  /**
   * Manages the lifecycle of starting and restarting the child process.
   *
   * This function ensures that a child process is running. It implements a
   * rate-limiting mechanism using {@link MAX_RESTARTS} and
   * {@link RESTART_WINDOW_MS} to prevent an infinite restart loop. If an
   * existing child process is present, it is terminated before a new one is forked.
   *
   * @returns {void}
   */
  const startChildProcess = (): void => {
    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
      restartCount = 0;
      restartTimer = null;
    }, RESTART_WINDOW_MS);

    if (restartCount >= MAX_RESTARTS) {
      console.error('Child process restarted too many times. Exiting.');
      process.exit(0);
    }

    if (currentChild) {
      currentChild.once('exit', () => forkNewChild());
      currentChild.kill('SIGTERM');
    } else {
      forkNewChild();
    }
  };

  startChildProcess();
}

/**
 * Triggers a restart of the application by signaling the parent process.
 *
 * This function should be called from within the child process's application
 * logic (`appLogic`) to signal that a restart is required. It sends a specific
 * message to the parent process, which then handles the graceful termination
 * and restarting of the child.
 *
 * @example
 * ```typescript
 * import { restartApp } from '@vegapunk/utilities';
 *
 * // Inside your appLogic:
 * function onCriticalConfigChange() {
 *   console.log('Configuration changed, restarting application...');
 *   restartApp();
 * }
 * ```
 *
 * @returns {void}
 */
export function restartApp(): void {
  if (process.send) {
    process.send(RESTART_CHILD_APP);
    process.exit(0);
  } else {
    process.exit(1);
  }
}
