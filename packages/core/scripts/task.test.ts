import { Task, Vegapunk } from '../dist'

async function main(i = 0) {
  setTimeout(Boolean, 60_000)

  try {
    const client = new Vegapunk()
    await client.start()

    const zero = await Task.createTask({
      awake: () => console.log(++i, '0.1 awake'),
      start: () => console.log(++i, '0.2 start'),
      update() {
        console.log(++i, '0.3 update')
        return zero.unload()
      },
    })

    const one = await Task.createTask({
      awake: () => console.log(++i, '1.1 awake'),
      start: () => console.log(++i, '1.2 start'),
      update() {
        console.log(++i, '1.3 update')
        return one.unload()
      },
      options: { delay: 1100 },
    })

    const two = await Task.createTask({
      awake: () => console.log(++i, '2.1 awake'),
      update() {
        console.log(++i, '2.3 update')
        return two.unload()
      },
      options: { delay: 1200 },
    })

    const three = await Task.createTask({
      start: () => console.log(++i, '3.2 start'),
      update() {
        console.log(++i, '3.3 update')
        return three.unload()
      },
      options: { delay: 1300 },
    })

    const four = await Task.createTask({
      update() {
        console.log(++i, '4.3 update')
        return four.unload()
      },
      options: { delay: 1400 },
    })

    const five = await Task.createTask({
      awake: () => console.log(++i, '5.1 awake'),
      start: () => console.log(++i, '5.2 start'),
      update() {
        console.log(++i, '5.3 update')
        return five.unload()
      },
      options: { delay: 1500, enabled: false },
    })
    five.startTask()

    const sixName = '6 test'
    const six = await Task.createTask({
      update() {
        console.log(++i, '6.3 update ' + six.name)
        return six.unload()
      },
      options: { name: sixName, delay: 1600 },
    })

    /**
            1 0.1 awake
            2 1.1 awake
            3 2.1 awake
            4 5.1 awake
            5 0.2 start
            6 1.2 start
            7 3.2 start
            8 5.2 start
            9 0.3 update
            10 1.3 update
            11 2.3 update
            12 3.3 update
            13 4.3 update
            14 5.3 update
            15 6.3 update 6 test
         */
  } catch (error) {
    console.error(error)
  }
}
main()
