export const slug = (str: string, sep: string = '-') => {
    let _start = new RegExp('^' + sep)
    let _end = new RegExp(sep + '$')
    let _a = String(str).replace(/\W+/g, sep).toLowerCase().replace(_start, '').replace(_end, '')
    return _a
}


export const to_console = (msg: any) => {
    for (let i = 0; i < msg.args().length; ++i)
        console.log(`${i}: ${msg.args()[i]}`)
}

export const delay = async (time: number): Promise<string> => new Promise((resolve) => setTimeout(resolve, time))

export const timestamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
