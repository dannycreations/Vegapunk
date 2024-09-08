import { Task, Vegapunk } from '../dist'

async function main() {
	try {
		const client = new Vegapunk()
		await client.start()

		const stepOne = Task.createTask({
			awake: () => console.log('1.1 awake'),
			start: () => console.log('1.2 start'),
			update() {
				console.log('1.3 update')
				stepOne.stopTask()
			},
			options: { delay: 1_100 },
		})

		const stepTwo = Task.createTask({
			awake: () => console.log('2.1 awake'),
			update() {
				console.log('2.3 update')
				stepTwo.stopTask()
			},
			options: { delay: 1_200 },
		})

		const stepThree = Task.createTask({
			start: () => console.log('3.2 start'),
			update() {
				console.log('3.3 update')
				stepThree.stopTask()
			},
			options: { delay: 1_300 },
		})

		const stepFour = Task.createTask({
			update() {
				console.log('4.3 update')
				stepFour.stopTask()
			},
			options: { delay: 1_400 },
		})

		const stepFive = Task.createTask({
			awake: () => console.log('5.1 awake'),
			start: () => console.log('5.2 start'),
			update() {
				console.log('5.3 update')
				stepFive.stopTask()
			},
			options: { delay: 1_500, enabled: false },
		})
		stepFive.startTask()

		/** 
            1.1 awake
            2.1 awake
            3.2 start
            5.1 awake
            1.2 start
            5.2 start
            1.3 update
            2.3 update
            3.3 update
            4.3 update
            5.3 update
         */

		const stepSix = Task.createTask({
			update() {
				console.log('6.3 update')
				console.log(stepSix)
				stepSix.stopTask()
			},
			options: { name: '6 test', delay: 1_600 },
		})

		// console.log(container.stores.get('tasks'))
	} catch (error) {
		console.error(error)
		process.exit(1)
	}
}
main()
