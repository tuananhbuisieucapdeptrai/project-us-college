import express from 'express'
import cors from 'cors'
import { collegeRouter  } from './controllers/Colleges.js'
import { initializeEmbeddings } from './scripts/initAnchor.js'


const app = express()
app.use(express.json()) 
app.use(cors())

await initializeEmbeddings();
app.use('/colleges', collegeRouter)

export default app


