const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const xoauth2gen = require('./app/config/emailsetup/emailoauth.config');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require('./app/models');
const sendAcknowledgment = require('./app/services/sendInitialAckmnt');
const { generateBatchId } = require('./app/services/generateBatchID.service');
const { isPdf, convertToPdf } = require('./app/services/pdf.helper');
const uploadToS3 = require('./app/middleware/uploadReports');
const isFileEncrypted = require('./app/services/checkencryption.file');
const getClientInfoFromMailID = require('./app/services/sendClientInfo');
const createAuthTokens = require('./app/config/emailsetup/emailoauth.config');
const convertEmailToPdf = require('./app/services/emailConvertToPdf');
const processAndMergePdfs = require('./app/services/mergeAllPdfs');
const getAllClientsInfo = require('./app/services/sendAllClientInfo');
db.sequelize.sync();
const emailDB = db.emailDetails;

global.__basedir = __dirname;
app.get('/', (req, res) => res.json({ message: "Node Email test" }));

require('./app/routes/emaildetails.routes')(app);
require('./app/routes/emailattachments.routes')(app);
require('./app/routes/clientDet.routes')(app);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

const processedEmails = new Set();  // In-memory store for processed emails


// Function to add listeners for handling errors and reconnection
function setupListeners(connection) {
    connection.on('error', (error) => {
        console.error('IMAP connection error:', error);
        reconnectWithDelay();
    });

    connection.on('close', () => {
        console.warn('IMAP connection closed.');
        reconnectWithDelay();
    });
}

// Retry connection with a delay to avoid rapid retries
function reconnectWithDelay() {
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectToImap, 5000);
}

async function moveEmailToFolder(connection, messageId, folderName) {
    try {
        await connection.moveMessage(messageId, folderName);
        console.log(`Message ${messageId} moved to folder: ${folderName}`);
    } catch (error) {
        console.error(`Failed to move message ${messageId} to folder ${folderName}:`, error);
    }
}

// Main function to handle multiple clients
async function connectToImapForAllClients() {
    try {
        const clients = await getAllClientsInfo();        
        for (const client of clients) {
            if (!client || !client.clientEmailID) {
                console.error('Invalid client detected:', client);
                continue;
            }
            connectToImap(client);
        }
    } catch (error) {
        console.error('Error fetching client list:', error);
    }
}

// Function to establish and manage the IMAP connection
async function connectToImap(client) {

    if (!client || !client.clientEmailID) {
        console.error('Invalid client object passed to connectToImap:', client);
        return;
    }
    try {
        const xoauth2gen = await createAuthTokens(client.clientEmailID);
        xoauth2gen.getToken(async (err, token) => {
            if (err) {
                console.error('Error generating token:', err);
                setTimeout(connectToImap(client), 5000);  // Retry after delay
                return;
            }
            const clientInfo = await getClientInfoFromMailID(client.clientEmailID);

            if (!clientInfo) {
                console.error('Client information not found!');
                setTimeout(connectToImap(client), 5000);  // Retry after delay
                return;
            }
            const config = {
                imap: {
                    user: clientInfo.clientEmailID,
                    xoauth2: token,
                    host: process.env.IMAP_HOST,
                    port: process.env.IMAP_PORT,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false }
                }
            };

            imaps.connect(config).then((connection) => {
                console.log('Connected to IMAP server.');
                setupListeners(connection); // Set up listeners for email events and errors

                connection.openBox('INBOX', true).then(() => {
                    console.log('Listening for new emails...');
                    connection.on('mail', () => checkNewEmails(connection, client.clientEmailID)); // Listen for new email events
                }).catch((boxErr) => {
                    console.error('Error opening INBOX:', boxErr);
                    reconnectWithDelay();  // Retry after delay
                });
            }).catch((connErr) => {
                console.error('IMAP connection failed:', connErr);
                reconnectWithDelay();  // Retry after delay
            });
        });
    } catch (error) {
        console.error('Error in connectToImap:', error);
    }
}

// Function to check for new emails
async function checkNewEmails(connection, clientEmailID) {

    const clientInfo = await getClientInfoFromMailID(clientEmailID);

    const searchCriteria = ['UNSEEN']; // Fetch only unread emails
    const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        struct: true,
        markSeen: true
    };

    connection.search(searchCriteria, fetchOptions).then(async (messages) => {
        if (messages.length === 0) {
            console.log('No unread emails.');
            return;
        }

        for (const message of messages) {
            const newMessageId = message.parts.find(part => part.which === 'HEADER').body['message-id'][0];

                // Skip if the email has already been processed
                if (processedEmails.has(newMessageId)) {
                    console.log(`Email with Message-ID: ${newMessageId} already processed.`);
                    continue;
                }

                // Mark email as processed
                processedEmails.add(newMessageId);

            const parts = imaps.getParts(message.attributes.struct);
            const headerPart = message.parts.find(part => part.which === 'HEADER');
            const subject = headerPart.body.subject ? headerPart.body.subject[0] : 'No Subject';
            const from = headerPart.body.from ? headerPart.body.from[0] : 'No Sender';
            const date = headerPart.body.date ? headerPart.body.date[0] : 'No Date';
            const messageId = headerPart.body['message-id'] ? headerPart.body['message-id'][0] : 'No Message-ID';
            const senderName = from.split('<')[0].trim() || 'Unknown Sender';
            const senderId = from.match(/<(.+?)>/) ? from.match(/<(.+?)>/)[1] : null;
            const receiverId = clientInfo.clientEmailID;

            // Generate a new batchId
            const batchId = await generateBatchId(clientInfo);

            // Save to the database
            const emaildata = await emailDB.create({
                batchId: batchId,
                mailBoxType: 'UAT',  // Define based on your logic
                emailFolderType: 'INBOX',  // Assuming INBOX, modify as needed
                messageId: messageId,
                senderName: senderName,
                senderId: senderId,
                receiverId: receiverId,
                receivedDateTime: date,
                subject: subject,
                status: 'New',
                statusReason: 'Yet to process',
                clientId:clientInfo.id
            });
            
            // Parse sender's email from "from" field and send acknowledgment
            const senderEmail = from.match(/<(.+?)>/) ? from.match(/<(.+?)>/)[1] : null;
            sendAcknowledgment(senderEmail, subject, "New");
            if (senderEmail) {
                //Check Domain ID is valid
                const domain = senderEmail.split('@')[1];
                const hasAttachment = parts.some(part => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT');
                if (domain !== process.env.VALID_DOMAINID) {
                    // Send a response email if the domain is not "gmail.com"
                    console.log(`Unauthorized domain: ${domain}`);
                    sendAcknowledgment(senderEmail, subject, "DOMAINID NOT VALID");
                    await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                    const updateData = await emailDB.update({
                        emailFolderType: 'Not Processed',
                        status: 'Failed',
                        statusReason: 'DOMAINID NOT VALID'
                    }, { where: { id: emaildata.id } });
                }
                else if (!hasAttachment) {
                    console.log('Missing attachments');
                    sendAcknowledgment(senderEmail, subject, "ATTACHMENT MISSING");
                    await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                    const updateData = await emailDB.update({
                        emailFolderType: 'Not Processed',
                        status: 'Failed',
                        statusReason: 'ATTACHMENT MISSING'
                    }, { where: { id: emaildata.id } });
                }
                else {
                    parts.forEach((part) => {
                        if (part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT') {
                            connection.getPartData(message, part).then(async (partData) => {
                                const filename = part.disposition.params.filename;
                                const newFilename = `${batchId}-${filename}`;

                                const filepath = path.join(__basedir, "/resources/emails/attachments", newFilename);

                                fs.writeFile(filepath, partData, (err) => {
                                    if (err) console.error('Error saving attachment:', err);
                                    else console.log(`Attachment saved: ${newFilename}`);
                                });

                                const emailData = {
                                    sender: from,
                                    receiver: receiverId,
                                    subject: subject,
                                    receivedDate: date,
                                    body: part.body || "No body available",
                                };
                                const filePathEmail = await convertEmailToPdf(emailData, batchId);
                                const emailPdfLocation = await uploadToS3(filePathEmail, batchId, `${batchId}-email.pdf`, emaildata, false);
                                console.log(`Email PDF uploaded to S3: ${emailPdfLocation}`);
                                await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds

                                // if (isFileEncrypted(filepath)) {
                                //     console.log(`Attachment ${filename} is encrypted or password-protected.`);
                                //     sendAcknowledgment(senderEmail, subject, "ENCRYPTED ATTACHMENTS");
                                //     const awsRes = await uploadToS3(filepath, batchId, filename, emaildata,false);
                                //     await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                                //     const emailupdate = await emailDB.update({
                                //         emailFolderType: 'Not Processed',
                                //         status: 'Failed',
                                //         statusReason: 'ENCRYPTED ATTACHMENTS'
                                //     }, { where: { id: emaildata.id } });
                                // } else {
                                // Check if the file is already a PDF
                                if (!isPdf(filename)) {
                                    // const convertedFilePath = path.join(__basedir, '/resources/emails/attachments', `${newFilename}-converted.pdf`);
                                    // await convertToPdf(filepath, convertedFilePath);
                                    // const s3Location = await uploadToS3(convertedFilePath, batchId, newFilename, emaildata, false);
                                    // console.log(`PDF file uploaded to S3: ${s3Location}`);
                                    sendAcknowledgment(senderEmail, subject, "ENCRYPTED ATTACHMENTS");
                                    const awsRes = await uploadToS3(filepath, batchId, filename, emaildata, false);
                                    await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                                    const emailupdate = await emailDB.update({
                                        emailFolderType: 'Not Processed',
                                        status: 'Failed',
                                        statusReason: 'ENCRYPTED ATTACHMENTS'
                                    }, { where: { id: emaildata.id } });
                                } else {
                                    const s3Location = await uploadToS3(filepath, batchId, newFilename, emaildata, false);
                                    console.log(`PDF file uploaded to S3: ${s3Location}`);
                                }
                                processAndMergePdfs(batchId, emaildata);
                                sendAcknowledgment(senderEmail, subject, "SUCCESS");
                                const updateData = await emailDB.update({
                                    emailFolderType: 'Success',
                                    status: 'Success',
                                    statusReason: 'File has been processed successfully'
                                }, { where: { id: emaildata.id } });
                                await moveEmailToFolder(connection, message.attributes.uid, 'Success');
                                // }

                            }).catch(console.error);
                        } else if (part.which === 'TEXT') {
                            simpleParser(part.body, (err, mail) => {
                                if (err) console.error('Error parsing email body:', err);
                                else console.log('Body:', mail.text);
                            });
                        }
                    });
                }
            }
        };
    }).catch(console.error);
}

// Start the initial IMAP connection
connectToImapForAllClients();

