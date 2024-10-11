import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

async function main() {
	try {
		const SOURCE_PATH = resolve(process.cwd(), 'node_modules', '@types')
		const TARGET_PATH = resolve(process.cwd(), 'dist/@types')
		const TARGET_FILE = resolve(process.cwd(), 'dist/index.d.ts')

		if (!existsSync(TARGET_PATH)) mkdirSync(TARGET_PATH, { recursive: true })

		let headerFile = ''
		cpSync(SOURCE_PATH, TARGET_PATH, {
			filter(source: string) {
				if (basename(source) === 'package.json') {
					const readPackage = JSON.parse(readFileSync(source, 'utf8'))
					headerFile += `/// <reference path="./${readPackage.name}/${readPackage.types}" />\n`
				}
				return true
			},
			dereference: true,
			recursive: true,
		})

		const footerFile = 'export { _, humanizeDuration }\n'
		const sourceFile = readFileSync(TARGET_FILE, 'utf8')
		writeFileSync(TARGET_FILE, `${headerFile}${footerFile}\n${sourceFile}`)
	} catch (error) {
		console.error(error)
		process.exit(1)
	}
}
main()
