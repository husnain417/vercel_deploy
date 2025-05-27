const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentVerificationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    institutionName: {
        type: String,
        required: true
    },
    proofDocument: {
        type: String, // Cloudinary URL to uploaded document
        required: true
    },
    cloudinaryPublicId: {
        type: String, // Store Cloudinary public_id for future reference
        required: true
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Approved', 'Rejected']
    },
    verifiedAt: Date,
    verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User' // Admin who verified
    },
    rejectionReason: String
}, { timestamps: true });

const StudentVerification = mongoose.model('StudentVerification', studentVerificationSchema);
module.exports = StudentVerification;