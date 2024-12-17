const nodeMailerConfig = require('../config/emailsetup/emailconn.config');
const { transporter } = require('../config/emailsetup/emailconn.config');
const acknowledgmentMessage = require('./ackmnt.message');
const getEmailAttachments = require('./getAttachmentsfromBatchID');
require('dotenv').config();

async function sendAcknowledgment(clientName, senderName, senderEmail, receiverId, originalSubject, messageType, batchID) {
    const acknowledgmentSubject = `Re: ${originalSubject}`;
    let batchAttachmentList = null;
    batchAttachmentList = await getEmailAttachments(batchID, messageType === 'ENCRYPTED ATTACHMENTS');
    const acknowledgmentText = acknowledgmentMessage(clientName, senderName, originalSubject, messageType, batchAttachmentList);

    // Define email options
    const mailOptions = {
        from: receiverId, // Your email address
        to: senderEmail, // Sender's email
        subject: acknowledgmentSubject,
        html: acknowledgmentText
    };

    // Send acknowledgment email
    const transporter = await nodeMailerConfig(receiverId)
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending acknowledgment email:', error);
        } else {
            console.log('Acknowledgment email sent:', info.response);
        }
    });
}

module.exports = sendAcknowledgment;
