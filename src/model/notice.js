import mongoose, {Schema} from 'mongoose'

const noticeSchema = new Schema({
    user_id: String,
    company_id: String,
    job_id: String,
    delivery_time: String,
    state: String,
    talent_info: {
        talent_id: String,
        user_id: String,
        age: Number,
        eduction_level: String,
        home_location: String,
        name: String,
        phone: String,
        major: String,
        profile_photo: String,
        resume: String,
        resume_file: String,
        resume_level: String,
        school: String,
        self_introduce: String,
        sex: String,
        state: String,
        user_class: String,
        eduction_experience: [{
            eduction_experience_id: String,
            talent_id: String,
            digree: String,
            major: String,
            school: String,
            time: String
        }], // 一个字符串数组
        experience: {
            experience_id: String,
            talent_id: String,
            time: String,
            list: [{
                experience_detail_id: String,
                experience_id: String,
                children_time: String,
                job_detail: String,
                position: String,
                company: String
            }]
        },
        job_intention: [{
            job_intention_id: String,
            talent_id: String,
            job: String,
            location: String,
            salary: String,
            job_class: String
        }]
    }
});

export const NoticeModel = mongoose.model('NoticeModel', noticeSchema, "notices")