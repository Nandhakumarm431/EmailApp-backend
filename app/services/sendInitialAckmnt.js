const nodeMailerConfig = require('../config/emailsetup/emailconn.config');
const { transporter } = require('../config/emailsetup/emailconn.config');
const acknowledgmentMessage = require('./ackmnt.message');
require('dotenv').config();

async function sendAcknowledgment(recipientEmail, originalSubject, messageType) {
    const acknowledgmentSubject = `Re: ${originalSubject}`;
    const acknowledgmentText = acknowledgmentMessage(originalSubject,messageType);

    // Define email options
    const mailOptions = {
        from: process.env.AUTH_EMAIL, // Your email address
        to: recipientEmail, // Sender's email
        subject: acknowledgmentSubject,
        text: acknowledgmentText
    }; 

    // Send acknowledgment email
    const transporter = await nodeMailerConfig('t34455254@gmail.com')
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending acknowledgment email:', error);
        } else {
            console.log('Acknowledgment email sent:', info.response);
        }
    });
}

module.exports = sendAcknowledgment;
