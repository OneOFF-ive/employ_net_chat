import {connectedUsers} from "./index.js";
import {validateNotice, validateRecord} from "./validate.js";
import {RecordModel} from "./model/record.js";
import fetch from "node-fetch";
import https from "https";
import {extractUserId} from "./jwt.js";

export async function afterConnect(ws, req) {
    let token = req.headers.authorization
    if (!token || !await validateUser(token)) {
        // 如果未传入 token或验证失败，拒绝连接并关闭 WebSocket
        return
    }

    const userId = extractUserId(token)
    console.log(`A user: ${userId} connected`)
    if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, [])
    }
    connectedUsers.get(userId).push(ws)
    return {token, userId}
}

export async function afterReceive(ws, message, token, userId) {
    // 在这里添加处理 WebSocket 消息的代码
    console.log(`Received: ${message}`)
    let record = validateRecord(JSON.parse(message))
    let notice = validateNotice(JSON.parse(message))
    if (record.success) {
        await recordParse(ws, record)
    } else if (notice.success) {
        await noticeParse(ws, notice, token, userId)
    } else {
        ws.send("You send error message")
    }
}

export function afterClose(ws, userId) {
    console.log(`A user: ${userId} disconnected`)
    // 从数组中移除当前 WebSocket 连接
    const userConnections = connectedUsers.get(userId)
    const index = userConnections.indexOf(ws)
    if (index !== -1) {
        userConnections.splice(index, 1)
        // 如果不再有连接，从 Map 中删除该 userId
        if (userConnections.length === 0) {
            connectedUsers.delete(userId)
        }
    }
}

async function recordParse(ws, record) {
    let recordDocument = new RecordModel(record)
    await recordDocument.save()
    // ws.send(`You sent: ${message}`)
}

async function noticeParse(ws, notice, token) {
    const res = await fetch("https://127.0.0.1:4040/talent", {
        headers: new Headers({
            'Authorization': token
        }),
        method: "GET",
        agent: new https.Agent({rejectUnauthorized: false})
    })
    if (res.status === 200) {
        let resPayload = await res.json()
        notice.data.talent_info = resPayload.data
        const noticeMsg = JSON.stringify(notice.data);
        ws.send(noticeMsg)
    }
}

async function validateUser(token) {
    const res = await fetch("https://127.0.0.1:4040/user/auth", {
        headers: new Headers({
            'Authorization': token
        }),
        method: "GET",
        agent: new https.Agent({rejectUnauthorized: false})
    })
    return res.status === 200;
}