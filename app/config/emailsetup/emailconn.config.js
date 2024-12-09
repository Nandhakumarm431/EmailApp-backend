const nodemailer = require('nodemailer');
const getClientInfoFromMailID = require('../../services/sendClientInfo');
require('dotenv').config();

// Create transporter using nodemailer
async function nodeMailerConfig(clientEmailID) {
    const clientInfo = await getClientInfoFromMailID(clientEmailID);


    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465, // or 587 for non-secure
        secure: true, // true for 465, false for 587
        auth: {
            user: clientInfo.clientEmailID,
            pass: clientInfo.password,
        },
        logger: true,  // Enable logging for nodemailer
        debug: true    // Include SMTP traffic in the logs
    });
    return transporter
}
// Verify transporter configuration
// transporter.verify((error, success) => {
//     if (error) {
//         console.error('Error verifying transporter:', error);
//     } else {
//         console.log("Email transporter is ready:", success);
//     }
// });

module.exports = nodeMailerConfig;