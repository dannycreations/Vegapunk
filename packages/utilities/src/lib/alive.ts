import { ChildProcess, fork } from 'node:child_process';
import process from 'node:process';

const KILL_APP_CODE = 240699;

let restartCount = 0;
let restartTimer: NodeJS.Timeout | null = null;
let currentChild: ChildProcess | null = null;

interface RunAppOptions {
  readonly max?: number;
  readonly delay?: number;
}

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
        killApp();
      }

      if (max > 0 && restartCount >= max) {
        console.error('Child process restarted too many times. Exiting.');
        killApp();
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

export function killApp(): never {
  process.exit(KILL_APP_CODE);
}
