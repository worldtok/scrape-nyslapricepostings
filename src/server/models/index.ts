
if (!process.env.DB_DATABASE) {
    console.log('Database name is nrequired')
    console.log('Openn .env file and fill DB_NAME=')
    process.exit()
}
import { slug } from '../helpers.js'
import mongoose from 'mongoose'

const DB_NAME = slug(process.env.DB_DATABASE, '_')

const DB_URL = `mongodb://127.0.0.1:27017/${DB_NAME}`

mongoose.set('strictQuery', false)
mongoose.Promise = global.Promise
mongoose.connect(DB_URL)

const db = mongoose

export { db }
export default db