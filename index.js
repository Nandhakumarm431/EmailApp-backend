const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
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
const deleteFileAndFolder = require('./app/services/deleteFileAndFolder');
const { htmlToText } = require('html-to-text');
const processAttachment = require('./app/services/processAttachment');
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
            console.log('Connection starts..');            
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
                setTimeout(() => connectToImap(client), 5000); // Retry after delay
                return;
            }
            const clientInfo = await getClientInfoFromMailID(client.clientEmailID);
            if (!clientInfo) {
                console.error('Client information not found!');
                setTimeout(() => connectToImap(client), 5000);
                return;
            }
            const config = {
                imap: {
                    user: clientInfo.clientEmailID,
                    xoauth2: token,
                    host: process.env.IMAP_HOST,
                    port: process.env.IMAP_PORT,
                    tls: true,
                    tlsOptions: { rejectUnauthorized: false },
                },
            };

            imaps.connect(config).then((connection) => {
                console.log('Connected to IMAP server.');
                setupListeners(connection); // Set up listeners for email events and errors
                connection.openBox('INBOX', true).then(() => {
                    console.log('Listening for new emails...');
                    connection.on('mail', () =>
                        checkNewEmails(connection, client.clientEmailID)
                    ); // Listen for new email events
                }).catch((boxErr) => {
                    console.error('Error opening INBOX:', boxErr);
                    setTimeout(() => connectToImap(client), 5000); // Retry after delay
                });
            }).catch((connErr) => {
                console.error('IMAP connection failed:', connErr);
                setTimeout(() => connectToImap(client), 5000); // Retry after delay
            });
        });
    } catch (error) {
        console.error('Error in connectToImap:', error);
        setTimeout(() => connectToImap(client), 5000); // Retry after delay
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
                clientId: clientInfo.id
            });

            const isForwarded = subject.toUpperCase().startsWith('FWD:');
            const isReply = subject.toUpperCase().startsWith('RE:');

            // Parse sender's email from "from" field and send acknowledgment
            const senderEmail = from.match(/<(.+?)>/) ? from.match(/<(.+?)>/)[1] : null;
            sendAcknowledgment(clientInfo.clientName, senderName, senderEmail, receiverId, subject, "New", null);
            if (senderEmail) {
                //Check Domain ID is valid
                const domain = senderEmail.split('@')[1];
                const hasAttachment = parts.some(part => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT');
                if (domain !== clientInfo.validdomainname) {
                    // Send a response email if the domain is not "gmail.com"
                    console.log(`Unauthorized domain: ${domain}`);
                    sendAcknowledgment(clientInfo.clientName, senderName, senderEmail, receiverId, subject, "DOMAINID NOT VALID", null);
                    await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                    await emailDB.update({
                        emailFolderType: 'Not Processed',
                        status: 'Failed',
                        statusReason: 'DOMAINID NOT VALID'
                    }, { where: { id: emaildata.id } });
                }
                else if (isForwarded || isReply) {
                    console.log(`FW or RE email not supported`);
                    sendAcknowledgment(clientInfo.clientName, senderName, senderEmail, receiverId, subject, "FW or RE Email", null);
                    await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                    await emailDB.update({
                        emailFolderType: 'Not Processed',
                        status: 'Failed',
                        statusReason: 'FW or RE Email'
                    }, { where: { id: emaildata.id } });
                }
                else if (!hasAttachment) {
                    console.log('Missing attachments');
                    sendAcknowledgment(clientInfo.clientName, senderName, senderEmail, receiverId, subject, "ATTACHMENT MISSING", null);
                    await moveEmailToFolder(connection, message.attributes.uid, 'Not Processed');
                    const updateData = await emailDB.update({
                        emailFolderType: 'Not Processed',
                        status: 'Failed',
                        statusReason: 'ATTACHMENT MISSING'
                    }, { where: { id: emaildata.id } });
                }

                else {
                    const encryptedFiles = [];
                    await Promise.all(
                        parts.filter(part => part.disposition?.type.toUpperCase() === 'ATTACHMENT')
                            .map(part => processAttachment(part, message, connection, batchId, emaildata, encryptedFiles))
                    );

                    if (encryptedFiles.length > 0) {
                        sendAcknowledgment(clientInfo.clientName, senderName, senderEmail, receiverId, subject, "ENCRYPTED ATTACHMENTS", emaildata.id);
                        await moveEmailToFolder(connection, message.attributes.uid, 'Exception');
                        const emailupdate = await emailDB.update({
                            emailFolderType: 'Exception',
                            status: 'Failed',
                            statusReason: 'The attachment is corrupted or has protected with password'
                        }, { where: { id: emaildata.id } });
                    } else {
                        let emailBody = 'No Body Available';
                        if (parts[0].type.toUpperCase() === 'TEXT') {
                            try {
                                const partData = await connection.getPartData(message, parts[0]);
                                emailBody = parts[0].subtype.toUpperCase() === 'HTML'
                                    ? htmlToText(partData, { wordwrap: 130 })
                                    : partData;
                            } catch (error) {
                                console.error('Error fetching email body:', error);
                            }
                        }
                        const emailText = {
                            sender: from,
                            receiver: receiverId,
                            subject: subject,
                            receivedDate: date,
                            body: emailBody
                        };
                        await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait for 60 seconds
                        const filePathEmail = await convertEmailToPdf(emailText, batchId);
                        const emailPdfLocation = await uploadToS3(filePathEmail, batchId, `${batchId}-email.pdf`, emaildata, false, `${batchId}-email.pdf`, false, false);
                        console.log(`Email PDF uploaded to S3: ${emailPdfLocation}`);
                        const folderPath = path.dirname(filePathEmail);
                        await deleteFileAndFolder(filePathEmail, folderPath)
                        console.log(`Folder deleted from local storage: ${folderPath}`);
                        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 60 seconds

                        const folderlocation = await processAndMergePdfs(batchId, emaildata);
                        const mergePath = path.dirname(folderlocation);
                        // fs.rm(mergePath, { recursive: true, force: true });
                        await deleteFileAndFolder(mergePath, folderPath)
                        console.log(`File deleted from local storage: ${mergePath}`);
                        const updateData = await emailDB.update({
                            emailFolderType: 'Success',
                            status: 'Success',
                            statusReason: 'File has been processed successfully'
                        }, { where: { id: emaildata.id } });
                        await moveEmailToFolder(connection, message.attributes.uid, 'Success');
                        sendAcknowledgment(clientInfo.clientName, senderName, senderEmail, receiverId, subject, "SUCCESS", emaildata.id);
                    }
                }
            }
        };
    }).catch(console.error);
}

// Start the initial IMAP connection
connectToImapForAllClients();

