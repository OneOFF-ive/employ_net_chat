import mongoose, {Schema} from 'mongoose'

const recordSchema = new Schema({
    send_id: {type: String, require: true},
    reception_id: {type: String, require: true},
    send_time: {type: Date, require: true},
    message_info: {type: String, require: true},
    is_read: {type: Boolean, require: true}
})

export const RecordModel = mongoose.model('RecordModel', recordSchema, "records")