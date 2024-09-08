import { Task, Vegapunk } from '../dist'

async function main() {
	try {
		const client = new Vegapunk()
		await client.start()

		let i = 1

		const stepOne = await Task.createTask({
			awake: () => console.log(i++, '1.1 awake'),
			start: () => console.log(i++, '1.2 start'),
			async update() {
				console.log(i++, '1.3 update')
				await stepOne.unload()
			},
			options: { delay: 1100 },
		})

		const stepTwo = await Task.createTask({
			awake: () => console.log(i++, '2.1 awake'),
			async update() {
				console.log(i++, '2.3 update')
				await stepTwo.unload()
			},
			options: { delay: 1200 },
		})

		const stepThree = await Task.createTask({
			start: () => console.log(i++, '3.2 start'),
			async update() {
				console.log(i++, '3.3 update')
				await stepThree.unload()
			},
			options: { delay: 1300 },
		})

		const stepFour = await Task.createTask({
			async update() {
				console.log(i++, '4.3 update')
				await stepFour.unload()
			},
			options: { delay: 1400 },
		})

		const stepFive = await Task.createTask({
			awake: () => console.log(i++, '5.1 awake'),
			start: () => console.log(i++, '5.2 start'),
			async update() {
				console.log(i++, '5.3 update')
				await stepFive.unload()
			},
			options: { delay: 1500, enabled: false },
		})
		stepFive.startTask()

		const stepSixName = '6 test'
		const stepSix = await Task.createTask({
			async update() {
				console.log(i++, '6.3 update ' + stepSix.name)
				await stepSix.unload()
			},
			options: { name: stepSixName, delay: 1600 },
		})

		/** 
            1 1.1 awake
            2 1.2 start
            3 2.1 awake
            4 3.2 start
            5 5.1 awake
            6 1.3 update
            7 2.3 update
            8 3.3 update
            9 4.3 update
            10 5.2 start
            11 6.3 update 6 test
            12 5.3 update
         */
	} catch (error) {
		console.error(error)
		process.exit(1)
	}
}
main()
