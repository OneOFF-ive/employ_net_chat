import express from 'express'
import http from "http";
import https from "https";
import {WebSocketServer} from 'ws'
import mongoose from 'mongoose'
import fs from "fs";


await mongoose.connect('mongodb://127.0.0.1:27017/employ_net')
const db = mongoose.connection

db.on('error', console.error.bind(console, 'MongoDB connection error:'))
db.once('open', () => {
    console.log('Connected to MongoDB')
})

const httpsOption = {
    key : fs.readFileSync("../https/lightblueyzj.cn.key"),
    cert: fs.readFileSync("../https/lightblueyzj.cn_bundle.crt")
}


export const app = express()
export const httpsServer = https.createServer(httpsOption, app)
export const wss = new WebSocketServer({path: "/chat", server: httpsServer})
app.use(express.json())


// 全局异常处理器函数
function globalErrorHandler(err) {
    console.error('全局异常处理器捕获到异常:');
    console.error('错误信息:', err.message);
    console.error('堆栈信息:', err.stack);

    // 可以在这里执行一些自定义的错误处理逻辑
}
process.on('uncaughtException', globalErrorHandler);