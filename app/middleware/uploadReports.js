const path = require('path');
const AWS = require('aws-sdk');
const fs = require('fs');
const db = require('../models')
const emailAttachmentsDB = db.emailAttachments
// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
});
const s3 = new AWS.S3();

async function uploadToS3(filePath, batchId, filename, emaildata, merged, originalFilename, isEmailFile, isEncryptedFile) {
    const fileStream = fs.createReadStream(filePath);
    const folderLocation = `${batchId}/${path.basename(filePath)}`;
    const key = `attachments/${folderLocation}`;
    const fileType = path.extname(filename).toLowerCase().replace('.', '');

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileStream,
        ContentType: 'application/pdf',
    };

    try {
        const s3Response = await s3.upload(params).promise();
        console.log(`File uploaded to S3: ${folderLocation}`);
        const metadata = {
            fileName: filename,
            originalFileName: originalFilename,
            fileType: fileType,
            fileURL: key,
            receivedDateTime: emaildata.receivedDateTime,
            status: 'Uploaded',
            statusReason: 'File successfully uploaded',
            batchId: emaildata.id,
            isMerged: merged,
            isEncryptedFile: isEncryptedFile,
            isEmailAttachment: isEmailFile
        };

        await emailAttachmentsDB.create(metadata);
        return metadata;
    } catch (error) {
        console.error('Error uploading file to S3:', error);
    }
}

module.exports = uploadToS3; 
