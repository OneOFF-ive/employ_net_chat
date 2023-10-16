// noinspection JSUnresolvedReference

import "./setup.js"
import {server, wss, app} from "./setup.js"
import {afterClose, afterConnect, afterReceive} from "./server.js";

export const connectedUsers = new Map() // 用于存储已连接用户的对象


wss.on('connection', async (ws, req) => {
    const result = await afterConnect(ws, req)
    if (!result) {
        ws.close(4000, 'Missing token')
        return
    }
    const token = result.token
    const userId = result.userId


    // 处理 WebSocket 消息
    ws.on('message', async (message) => {
        await afterReceive(ws, message, token, userId)
    })

    // 处理 WebSocket 关闭事件
    ws.on('close', () => {
        afterClose(ws, userId)
    })
})

app.get("/", (req, res) => {
    res.end("hello")
})

server.listen(8888, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:8888`)
})

