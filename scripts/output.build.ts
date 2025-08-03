import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const buildDir = join(process.cwd(), '.build');
  await rm(buildDir, { recursive: true }).catch(Boolean);
  await mkdir(buildDir, { recursive: true });

  const repoDir = join(process.cwd(), 'packages');
  for (const name of await readdir(repoDir)) {
    const packageDir = join(repoDir, name);
    await cp(join(packageDir, 'dist'), join(buildDir, name, 'dist'), { recursive: true });
    // await cp(join(packageDir, 'package.json'), join(buildDir, name, 'package.json'))
  }

  console.log('Copy build success');
}
main();
