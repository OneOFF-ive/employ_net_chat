import express from 'express'
import https from "https";
import http from "http";
import {WebSocketServer} from 'ws'
import mongoose from 'mongoose'
import fs from "fs";
import cors from "cors";
import cookieParser from "cookie-parser"

export const config = JSON.parse(fs.readFileSync("../config.json"))

await mongoose.connect(config.mongodb.url)
const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
    console.log('Connected to MongoDB')
})

const httpsOption = {
    key : fs.readFileSync(config.https.key),
    cert: fs.readFileSync(config.https.cert)
}

export const app = express()
app.use(express.json())
app.use(cors({
    origin: config.cors.origin,
    credentials:config.cors.credentials,
}))
app.use(cookieParser())
export const httpsServer = https.createServer(httpsOption, app)
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