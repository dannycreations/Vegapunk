import { ChildProcess, fork } from 'node:child_process';
import process from 'node:process';

const MAX_RESTARTS = 5;
const RESTART_WINDOW_MS = 60 * 1000;
const RESTART_CONFIRM_MS = 5 * 1000;

const RESTART_APP_TYPE = 'RESTART_APP_TYPE';
const SHUTDOWN_APP_TYPE = 'SHUTDOWN_APP_TYPE';

let restartCount = 0;
let restartTimer: NodeJS.Timeout | null = null;
let currentChild: ChildProcess | null = null;

export function runApp(appLogic: () => Promise<void>): void {
  if (process.argv.length === 3 && process.argv[2] === '--child') {
    void appLogic().catch((error) => {
      console.error(error);
      restartApp();
    });
    return;
  }

  process.once('SIGINT', () => {
    console.log('Parent process received SIGINT. Exiting.');
    shutdownApp();
  });

  process.once('SIGTERM', () => {
    console.log('Parent process received SIGTERM. Exiting.');
    shutdownApp();
  });

  process.on('message', (message) => {
    if (Object.is(message, RESTART_APP_TYPE)) {
      currentChild?.kill('SIGTERM');
    }
  });

  const forkNewChild = (): void => {
    currentChild = fork(process.argv[1], ['--child'], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      execPath: process.execPath,
    });

    currentChild.on('message', (message) => {
      if (Object.is(message, RESTART_APP_TYPE)) {
        currentChild?.kill('SIGTERM');
      }
    });

    currentChild.once('exit', (code) => {
      currentChild = null;
      if (Object.is(code, SHUTDOWN_APP_TYPE)) {
        console.log('Child process exited cleanly or was terminated. Exiting.');
        shutdownApp();
        return;
      }

      console.log(`Restarting child process (attempt ${++restartCount}/${MAX_RESTARTS})...`);
      setTimeout(() => startChildProcess(), RESTART_CONFIRM_MS);
    });

    currentChild.once('error', (error) => {
      currentChild = null;
      console.error('Child process failed to start or encountered an error:', error);
      console.log(`Restarting child process (attempt ${++restartCount}/${MAX_RESTARTS})...`);
      setTimeout(() => startChildProcess(), RESTART_CONFIRM_MS);
    });
  };

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
      shutdownApp();
      return;
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

export function restartApp(): void {
  if (typeof process.send === 'function') {
    process.send(RESTART_APP_TYPE);
  } else {
    process.exit(RESTART_APP_TYPE);
  }
}

export function shutdownApp(): void {
  if (currentChild) {
    currentChild.once('exit', () => process.exit(SHUTDOWN_APP_TYPE));
    currentChild.kill('SIGTERM');
  } else {
    process.exit(SHUTDOWN_APP_TYPE);
  }
}
