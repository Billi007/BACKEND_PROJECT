import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: process.env.ORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit: "16kb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(express.static("Public"))
app.use(cookieParser())

//routes import
import router from './routes/user.routes.js'

//route declaration                         for declaring routes we have to use MIDDLEWARE which is {app.use()}
app.use('/api/v1/users', router)

export default app