const fs = require('fs');
const path = require('path');
const isFileEncrypted = require('./checkencryption.file');
const uploadToS3 = require('../middleware/uploadReports');
const { convertToPdf, isPdf } = require('./pdf.helper');
const deleteFileAndFolder = require('./deleteFileAndFolder');

async function processAttachment(part, message, connection, batchId, emaildata, encryptedFiles) {
    try {
        const partData = await connection.getPartData(message, part);
        const filename = part.disposition.params.filename;
        const filePrefixName = path.basename(filename, path.extname(filename));
        const newFilename = `${batchId}-${filename}`;
        const filepath = path.join(__basedir, "/resources/emails/attachments", newFilename);
        const outputFilePath = path.join(__basedir, '/resources/emails/attachments', `${filePrefixName}-converted.pdf`);

        fs.writeFileSync(filepath, partData);
        if (await isFileEncrypted(filepath)) {
            encryptedFiles.push(filename);
            console.log(`Attachment ${filename} is encrypted or password-protected.`);
            await uploadToS3(filepath, batchId, filename, emaildata, false, filename, true, true);
        } else {
            let convertedFilePath;
            if (!isPdf(filename)) {
                console.log('File is not a PDF. Converting...');
                await convertToPdf(filepath, outputFilePath);
                convertedFilePath = outputFilePath;
                console.log('Converted file path:', convertedFilePath);
            } else {
                console.log('File is already a PDF.');
                convertedFilePath = filepath;
            }
            const s3Location = await uploadToS3(convertedFilePath, batchId, newFilename, emaildata, false, filename, true,false);
            console.log(`File uploaded to S3: ${s3Location}`);
            await deleteFileAndFolder(filepath, convertedFilePath !== filepath ? convertedFilePath : null);
        }
    } catch (error) {
        console.error(`Error processing attachment: ${error.message}`);
    }
}

module.exports = processAttachment;