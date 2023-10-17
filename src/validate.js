import {z} from 'zod'


// 创建自定义日期时间校验函数
function validateCustomDateTime(value) {
    // 使用正则表达式验证日期时间格式
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!regex.test(value)) {
        throw new Error('Invalid date time format. Use YYYY-MM-DD HH:MM:SS');
    }

    return value;
}

export const recordSchema = z.object({
    _id: z.string().optional(),
    send_id: z.string(),
    reception_id: z.string(),
    send_time: z.string().refine(validateCustomDateTime, {
        message: 'Invalid date time format. Use YYYY-MM-DD HH:MM:SS',
    }),
    message_info: z.string(),
    is_read: z.boolean()
})

export const noticeSchema = z.object({
    _id: z.string().optional(),
    user_id: z.string(),
    company_id: z.string(),
    reception_id: z.string().optional(),
    job_id: z.string(),
    delivery_time: z.string(),
    state: z.string(),
    is_read: z.boolean()
})

export function validateRecord(record) {
    return recordSchema.safeParse(record)
}

export function validateNotice(notice) {
    return noticeSchema.safeParse(notice)
}
