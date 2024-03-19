import express from 'express'
import http from "http";
import {WebSocketServer} from 'ws'
import mongoose from 'mongoose'
import {loadConfig} from "./config.js";

export const config = loadConfig()

await mongoose.connect(config.mongodb.url)
const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
    console.log('Connected to MongoDB')
})

export const app = express()
app.use(express.json())
export const httpServer = http.createServer(app)
export const wss = new WebSocketServer({path: config.server.path, server: httpServer})

// 全局异常处理器函数
function globalErrorHandler(err) {
    console.error('全局异常处理器捕获到异常:');
    console.error('错误信息:', err.message);
    console.error('堆栈信息:', err.stack);
    // 可以在这里执行一些自定义的错误处理逻辑
}

process.on('uncaughtException', globalErrorHandler);