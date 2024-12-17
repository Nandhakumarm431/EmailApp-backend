const db = require('../models')
const attachmentInfo = db.emailAttachments;

async function getEmailAttachments(batchId, isEncrypted) {
    try {
        let emailFiles = await attachmentInfo.findAll({
            where: { batchId: batchId, isEmailAttachment: true, isEncryptedFile: isEncrypted },
            order: [['createdAt', 'DESC']]
        })
        return emailFiles;

    } catch (error) {
        console.log({ message: 'Internal server error', error: error.message });
    }
}

module.exports = getEmailAttachments;