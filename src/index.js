// noinspection JSUnresolvedReference

import "./setup.js"
import {wss, app, httpsServer} from "./setup.js"
import {
    afterClose,
    afterConnect,
    afterReceive,
    customDateSerializer,
    findOrCreateSession,
    requireAuth
} from "./server.js";
import {RecordModel} from "./model/record.js";
import {NoticeModel} from "./model/notice.js";
import {extractUserId} from "./jwt.js";
import {SessionModel} from "./model/session.js";
import fetch from "node-fetch";
import https from "https";
import moment from "moment"

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

app.post("/update/records", requireAuth(), async (req, res) => {
    const {ids, is_read} = req.body
    const filter = {_id: {$in: ids}}
    const update = {is_read: is_read}
    await RecordModel.updateMany(filter, update)
    res.status(200).json({
        code: 1
    })
})

app.post("/update/notices", requireAuth(), async (req, res) => {
    const {ids, is_read: isRead} = req.body
    const filter = {_id: {$in: ids}}
    const update = {is_read: isRead}
    await NoticeModel.updateMany(filter, update)
    res.status(200).json({
        code: 1
    })
})

app.get("/page/records", requireAuth(), async (req, res) => {
    const {reception_id: otherUserId} = req.query
    const token = req.headers.authorization
    const userId = extractUserId(token)
    const page = parseInt(req.query.page) || 1; // 从请求中获取页码，默认为第一页
    const pageSize = parseInt(req.query.pageSize) || 20; // 从请求中获取每页显示的条目数，默认为 10

    // 计算要跳过的文档数以及限制返回的文档数
    const skip = (page - 1) * pageSize;
    const filter = {
        $or: [
            {send_id: userId, reception_id: otherUserId},
            {send_id: otherUserId, reception_id: userId}
        ]
    }

    // 执行查询，使用 skip 和 limit 来实现分页
    const items = await RecordModel.find(filter)
        .skip(skip)
        .limit(pageSize)
        .sort({ send_time : -1 })
        .exec();

    // 计算总文档数以及总页数
    const totalItems = await RecordModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
            code: 1,
            data: {
                items,
                pageInfo: {
                    page,
                    pageSize: pageSize,
                    totalItems,
                    totalPages,
                },
            }
        }
    )
})

app.get("/chat/view", requireAuth(), async (req, res) => {
    const token = req.headers.authorization
    const userId = extractUserId(token)
    const filter = {
        $or: [
            {sender_id: userId},
            {receiver_id: userId}
        ]
    }
    let resBody = []
    const sessions = await SessionModel.find(filter)
    for (let session of sessions) {
        session = await session
        let otherUserId
        if (session.sender_id === userId) otherUserId = session.receiver_id
        else otherUserId = session.sender_id


        const response = await fetch(`https://127.0.0.1:4040/user/id?id=${otherUserId}`, {
            headers: new Headers({
                'Authorization': token
            }),
            method: "GET",
            agent: new https.Agent({rejectUnauthorized: false})
        })
        if (response.status !== 200) {
            res.status(400).json({
                code: 0
            })
            return
        }

        const latestRecord = await RecordModel.findOne({
            $or: [
                {send_id: userId, reception_id: otherUserId},
                {send_id: otherUserId, reception_id: userId}
            ]
        }).sort({send_time: -1}).exec()
        const responsePayload = await response.json()
        resBody.push({
            id: session._id,
            reciprocal_avatar: responsePayload.data.profile_url,
            reciprocal_name: responsePayload.data.name,
            reciprocal_id: otherUserId,
            latestRecord: {
                message_info: latestRecord?.message_info,
                send_time: latestRecord?.send_time
            },
            info_list: []
        })
    }
    resBody.sort((item1, item2) => item2.latestRecord.send_time - item1.latestRecord.send_time
    )
    for (const element of resBody) {
        const send_time = new Date(element.latestRecord.send_time.toString())
        element.latestRecord.send_time = moment(send_time).format('YYYY-MM-DD HH:mm:ss')
    }

    res.status(200).json({
        code: 1,
        data: {
            message_list: resBody
        }
    })
})

app.get("/get/session/id", requireAuth(), async (req, res) => {
    const token = req.headers.authorization
    const userId = extractUserId(token)
    const {reception_id: otherUserId} = req.query
    const session = await findOrCreateSession(userId, otherUserId)
    const response = await fetch(`https://127.0.0.1:4040/user/id?id=${otherUserId}`, {
        headers: new Headers({
            'Authorization': token
        }),
        method: "GET",
        agent: new https.Agent({rejectUnauthorized: false})
    })
    if (response.status !== 200) {
        res.status(400).json({
            code: 0
        })
        return
    }
    const responsePayload = await response.json();
    res.status(200).json({
        session_id: session._id,
        reciprocal_avatar: responsePayload.data.profile_url,
        reciprocal_name: responsePayload.data.name,
    })
})

app.delete("/delete/records", requireAuth(), async (req, res) => {
    const {ids} = req.body
    const filter = {_id: {$in: ids}}
    await RecordModel.deleteMany(filter)
    res.status(200).json({
        code: 1
    })
})

app.post("/session/all/read", requireAuth(), async (req, res) => {
    const {session_id: sessionId} = req.body
    await RecordModel.updateMany({session_id: sessionId}, {$set: {is_read: true}})
    res.status(200).json({
        code: 1
    })
})

httpsServer.listen(4444, "0.0.0.0", () => {
    console.log(`Https server is running on https://localhost:4444`)
})

