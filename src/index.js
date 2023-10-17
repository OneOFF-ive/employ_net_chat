// noinspection JSUnresolvedReference

import "./setup.js"
import {server, wss, app} from "./setup.js"
import {afterClose, afterConnect, afterReceive, requireAuth} from "./server.js";
import {RecordModel} from "./model/record.js";
import {NoticeModel} from "./model/notice.js";
import {extractUserId} from "./jwt.js";

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
        code: "1"
    })
})

app.post("/update/notices", requireAuth(), async (req, res) => {
    const {ids, is_read: isRead} = req.body
    const filter = {_id: {$in: ids}}
    const update = {is_read: isRead}
    await NoticeModel.updateMany(filter, update)
    res.status(200).json({
        code: "1"
    })
})

app.get("/page/records", requireAuth(), async (req, res) => {
    const {other_user_id: otherUserId} = req.query
    const token = req.headers.authorization
    const userId = extractUserId(token)
    const page = parseInt(req.query.page) || 1; // 从请求中获取页码，默认为第一页
    const limit = parseInt(req.query.limit) || 10; // 从请求中获取每页显示的条目数，默认为 10


    // 计算要跳过的文档数以及限制返回的文档数
    const skip = (page - 1) * limit;
    const filter = {
        $or: [
            {send_id: userId, reception_id: otherUserId},
            {send_id: otherUserId, reception_id: userId}
        ]
    }

    // 执行查询，使用 skip 和 limit 来实现分页
    const items = await RecordModel.find(filter)
        .skip(skip)
        .limit(limit)
        .exec();

    // 计算总文档数以及总页数
    const totalItems = await RecordModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
            code: "1",
            data: {
                items,
                pageInfo: {
                    page,
                    limit,
                    totalItems,
                    totalPages,
                },
            }
        }
    )
})

app.delete("/delete/records", requireAuth(), async (req, res) => {
    const {ids} = req.body
    const filter = {_id: {$in: ids}}
    await RecordModel.deleteMany(filter)
    res.status(200).json({
        code: "1"
    })
})

server.listen(8888, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:8888`)
})

