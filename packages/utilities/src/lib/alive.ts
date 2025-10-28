import { ChildProcess, fork } from 'node:child_process';
import process from 'node:process';

const KILL_APP_CODE = 240699;

let restartCount = 0;
let restartTimer: NodeJS.Timeout | null = null;
let currentChild: ChildProcess | null = null;

/**
 * Defines configuration options for the application runner.
 */
interface RunAppOptions {
  /** The maximum number of consecutive restarts allowed before exiting. Set to 0 or less for infinite restarts. */
  readonly max?: number;
  /** The delay in milliseconds before attempting a restart. */
  readonly delay?: number;
}

/**
 * Runs the provided application logic in a child process, automatically restarting it upon unexpected termination.
 * This function distinguishes between parent and child processes using the '--child' command-line argument.
 *
 * @example
 * ```typescript
 * import { runApp, killApp } from '@vegapunk/utilities';
 *
 * async function myApp() {
 *   console.log(`Application logic running in process: ${process.pid}`);
 *   await new Promise(resolve => setTimeout(resolve, 10_000));
 *
 *   // To stop the application gracefully from within the logic:
 *   // killApp();
 *
 *   // To simulate a crash that will trigger a restart:
 *   // process.exit(1);
 * }
 *
 * runApp(myApp, { max: 5, delay: 2000 });
 * ```
 *
 * @param {() => Promise<void>} appLogic The asynchronous function containing the core application logic to be executed in the child process.
 * @param {RunAppOptions=} [options={}] Configuration for the runner. See {@link RunAppOptions}.
 * @returns {void}
 */
export function runApp(appLogic: () => Promise<void>, options: RunAppOptions = {}): void {
  if (process.argv[2] === '--child') {
    void appLogic();
    return;
  }

  const { max = 3, delay = 5_000 } = options;

  process.once('SIGINT', () => {
    console.log('Parent process received SIGINT. Exiting.');
    killApp();
  });

  process.once('SIGTERM', () => {
    console.log('Parent process received SIGTERM. Exiting.');
    killApp();
  });

  const forkChild = (): void => {
    currentChild = fork(process.argv[1], ['--child'], {
      execPath: process.execPath,
      stdio: 'inherit',
    });

    currentChild.once('exit', (code) => {
      currentChild = null;

      if (Object.is(code, KILL_APP_CODE)) {
        console.log('Child process exited cleanly or was terminated. Exiting.');
        return killApp();
      }

      if (max > 0 && restartCount >= max) {
        console.error('Child process restarted too many times. Exiting.');
        return killApp();
      }

      console.log(`Restarting child process (attempt ${++restartCount}/${max <= 0 ? '∞' : max})...`);
      setTimeout(() => startChild(), delay);
    });
  };

  const startChild = (): void => {
    if (restartTimer) {
      clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
      restartCount = 0;
      restartTimer = null;
    }, 60_000);

    if (currentChild) {
      currentChild.removeAllListeners();
      currentChild.once('exit', () => forkChild());
      currentChild.kill('SIGTERM');
    } else {
      forkChild();
    }
  };

  startChild();
}

/**
 * Terminates the application process with a specific exit code to prevent the
 * parent process from restarting it.
 *
 * @example
 * ```typescript
 * import { killApp, runApp } from '@vegapunk/utilities';
 *
 * async function myAppLogic() {
 *   // ... perform some work
 *   console.log('Work complete, shutting down.');
 *   killApp();
 * }
 *
 * runApp(myAppLogic);
 * ```
 *
 * @returns {never} The function never returns as it terminates the process.
 */
export function killApp(): never {
  process.exit(KILL_APP_CODE);
}
