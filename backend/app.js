import express from 'express'
import cors from 'cors'
import { collegeRouter  } from './controllers/Colleges.js'
import { initializeEmbeddings } from './scripts/initAnchor.js'


const app = express()
app.use(express.json()) 
app.use(cors({
    origin: 'https://project-us-college.vercel.app/'
}))

await initializeEmbeddings();
app.use('/colleges', collegeRouter)

export default app


