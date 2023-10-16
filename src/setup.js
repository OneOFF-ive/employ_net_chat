import express from 'express'
import http from "http";
import {WebSocketServer} from 'ws'
import mongoose from 'mongoose'


await mongoose.connect('mongodb://127.0.0.1:27017/employ_net')
const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
    console.log('Connected to MongoDB')
})

export const app = express()
export const server = http.createServer(app)
export const wss = new WebSocketServer({path: "/chat", server: server})
app.use(express.json())