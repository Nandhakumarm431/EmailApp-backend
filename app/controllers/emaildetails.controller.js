const db = require('../models')
const emailDetailsDB = db.emailDetails
const { Sequelize } = require('sequelize');

const createEmailDet = async (req, res) => {
    try {
        const { batchId, mailBoxType, emailFolderType, messageId, senderName, senderId, receiverId, receivedDateTime, status, statusReason } = req.body;
        const createData = await emailDetailsDB.create({
            batchId: batchId,
            mailBoxType: mailBoxType,
            emailFolderType: emailFolderType,
            messageId: messageId,
            senderName: senderName,
            senderId: senderId,
            receiverId: receiverId,
            receivedDateTime: receivedDateTime,
            status: status,
            statusReason: statusReason
        });
        res.status(200).json({
            message: 'Email response saved successfully'
        });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

const getEmailDetails = async (req, res) => {
    try {
        let emailDetails = await emailDetailsDB.findAll({
            order: [['createdAt', 'DESC']]
        })
        res.status(200).send(emailDetails)

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getemailDashboard = async (req, res) => {
    try {
        let totalEmails = await emailDetailsDB.count();

        // Group emails by status and count them
        const emailStatusCounts = await emailDetailsDB.findAll({
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('status')), 'count'],
            ],
            group: ['status'],
        });

        // Map the result into a more usable format
        const formattedStatusCounts = emailStatusCounts.map((item) => ({
            status: item.dataValues.status,
            count: item.dataValues.count,
        }));

        res.json({
            totalEmails,
            emailStatusCounts: formattedStatusCounts,

        });
    } catch (error) {
        console.error("Error fetching email stats:", error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    createEmailDet, getEmailDetails,
    getemailDashboard
}