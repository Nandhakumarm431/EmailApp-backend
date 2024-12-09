const db = require('../models')
const emailAttachmentsDB = db.emailAttachments
const axios = require('axios');


const getEmailAttachments = async (req, res) => {
    let batchId = req.params.batchId
    try {
        let emailFiles = await emailAttachmentsDB.findAll({
            where: { batchId: batchId, isMerged: false },
            order: [['createdAt', 'DESC']]
        })
        res.status(200).send(emailFiles)

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getOneAttachment = async (req, res) => {
    let batchId = req.params.batchId
    try {
        let oneData = await emailAttachmentsDB.findOne({
            where: { batchId: batchId, isMerged: true }
        });
        res.json({
            data: oneData
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

const downloadAttachments = async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'File path is required in the request body' });
        }

        //Lambda URL
        const lambdaUrl = process.env.AWS_LAMBDA_URL_DOWNLOAD_FILE;
        const lambdaResponse = await axios.post(lambdaUrl, { file_path: filePath });

        if (!lambdaResponse.data || !lambdaResponse.data.download_url) {
            return res.status(500).json({ error: 'Failed to fetch presigned URL' });
        }

        const presignedUrl = lambdaResponse.data.download_url;
        const audioResponse = await axios.get(presignedUrl, { responseType: 'stream' });

        // Set appropriate headers
        res.setHeader('Content-Type', audioResponse.headers['content-type']);
        res.setHeader('Content-Disposition', `inline; filename="${filePath.split('/').pop()}"`);

        audioResponse.data.pipe(res);

    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
};

module.exports = {
    getEmailAttachments, downloadAttachments, getOneAttachment
}