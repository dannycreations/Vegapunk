import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

async function main() {
	const buildDir = join(process.cwd(), '.build')
	await rm(buildDir, { recursive: true }).catch(Boolean)
	await mkdir(buildDir, { recursive: true })

	const packageDir = join(process.cwd(), 'packages')
	const packages = await readdir(packageDir)
	for (const name of packages) {
		const repoDir = join(packageDir, name)
		await cp(join(repoDir, 'dist'), join(buildDir, name, 'dist'), { recursive: true })
		await cp(join(repoDir, 'package.json'), join(buildDir, name, 'package.json'))
	}

	console.log('Copy build packages success')
}
main()
