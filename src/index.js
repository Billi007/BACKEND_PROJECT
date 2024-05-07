// require('dotenv').config()
import connectDB from "./db/indexDB.js";
import dotenv from "dotenv"
import app from "./app.js";

dotenv.config({
    path: './.env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running on port : ${process.env.PORT}`)
    }) 
})
.catch(error => {
    console.log("MONGODB CONNECTION FAILED !!! ", error)
})

/* import express from 'express';
const app = express()

( async () => {
    try {
      
       await mongoose.connect(`${process.env.MONGODB_URI}/ ${DB_NAME}`)
        
       app.on( "error", (error) => {
        console.log("ERRR: ", error)
        throw error
       })

       app.listen(process.env.PORT, () => {
        console.log(`App is listening on ${process.env.PORT}`)
       })

    } catch (error) {
        console.error("ERROR: ", error)
        throw error
    }
})()
*/