import mongoose, {Schema} from 'mongoose'

const sessionSchema = new Schema({
    sender_id: {type: String, require: true},
    receiver_id: {type: String, require: true}
})

export const SessionModel = mongoose.model("SessionModel", sessionSchema, "sessions")