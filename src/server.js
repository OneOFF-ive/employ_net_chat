import {connectedUsers} from "./index.js";
import {validateNotice, validateRecord} from "./validate.js";
import {RecordModel} from "./model/record.js";
import https from "https";
import {extractUserId} from "./jwt.js";
import {NoticeModel} from "./model/notice.js";
import moment from "moment"
import {SessionModel} from "./model/session.js";
import {config} from "./setup.js";
import http from "http";


export async function afterConnect(ws, req) {
    let token = req.headers.authorization
    try {
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
        // await sendUnreadMessage(ws, userId)
        return {token, userId}
    } catch (e) {
        console.log("捕获到异常：", e.message);
        console.log("异常堆栈：", e.stack);
    }
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

export function sendMessage(message, userId) {
    const userWsList = connectedUsers.get(userId)
    if (userWsList) {
        for (const userWs of userWsList) {
            userWs.send(message)
        }
    }
}

export function customDateSerializer(key, value) {
    if (key === "send_time") {
        return moment(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
}

export async function sendUnreadMessage(ws, userId) {
    const records = await RecordModel.find({reception_id: userId, is_read: false}).sort({"send_time": 1})
    const notices = await NoticeModel.find({reception_id: userId, is_read: false})
    for (const notice of notices) {
        ws.send(JSON.stringify(notice))
    }
    for (const record of records) {
        ws.send(JSON.stringify(record, customDateSerializer))
    }
}

async function recordParse(ws, record) {
    const sender_id = record.data.send_id
    const receiver_id = record.data.reception_id
    // const session = await findOrCreateSession(sender_id, receiver_id)
    // record.data.session_id = session._id

    let recordDocument = new RecordModel(record.data)
    await recordDocument.save()
    record.data._id = recordDocument._id
    const receiveUserId = record.data.reception_id
    sendMessage(JSON.stringify(record.data), receiveUserId)
}

// noinspection JSUnresolvedReference
async function noticeParse(ws, notice, token) {
    const talentRes = await fetch(`${config.request.base_url}/talent`, {
        headers: new Headers({
            'Authorization': token
        }),
        method: "GET",
        agent: new https.Agent({rejectUnauthorized: false})
    })
    const companyId = notice.data.company_id
    const userRes = await fetch(`${config.request.base_url}/user/getUserId?companyId=${companyId}`, {
        headers: new Headers({
            'Authorization': token
        }),
        method: "GET",
        agent: new https.Agent({rejectUnauthorized: false})
    })
    if (talentRes.status === 200 && userRes.status === 200) {
        let talentResPayload = await talentRes.json()
        notice.data.talent_info = talentResPayload.data
        let userResPayload = await userRes.json()
        const receiveUserId = userResPayload.data
        notice.data.reception_id = receiveUserId
        let noticeDocument = new NoticeModel(notice.data)
        await noticeDocument.save()
        notice.data._id = noticeDocument._id
        sendMessage(JSON.stringify(notice.data), receiveUserId)
    }
}

async function validateUser(token) {
    const res = await fetch(`${config.request.base_url}/user/auth`, {
        headers: new Headers({
            'Authorization': token
        }),
        method: "GET",
        agent: new https.Agent({rejectUnauthorized: false})
    })
    return res.status === 200;
}
export function requireAuth() {
    return async (req, res, next) => {
        console.log(req.method + " " + req.originalUrl)
        const token = req.headers.authorization
        if (!token) return res.sendStatus(401)
        const authRes = await fetch(`${config.request.base_url}/user/auth`, {
            headers: new Headers({
                'Authorization': token
            }),
            method: "GET",
            agent: new https.Agent({rejectUnauthorized: false})
        })
        if (authRes.status === 200) {
            return next()
        } else {
            return res.sendStatus(401)
        }
    }
}

export async function findOrCreateSession(senderId, receiverId) {
    const filter = {
        $or: [
            {sender_id: senderId, receiver_id: receiverId},
            {sender_id: receiverId, receiver_id: senderId}
        ]
    }
    let session = await SessionModel.findOne(filter)
    if (!session) {
        session = new SessionModel({
            sender_id: senderId,
            receiver_id: receiverId
        })
        await session.save()
    }
    return session
}
