const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { isPdf } = require('./pdf.helper');

/**
 * Converts an email into a PDF, stores it locally, and returns the file path.
 * @param {Object} emailData - The email data containing details like sender, subject, and body.
 * @param {Array} attachments - Array of attachments, each containing { filename, buffer }.
 * @param {string} batchId - The batch ID to use for organizing files.
 * @returns {string} - The local file path of the generated PDF.
 */
async function convertEmailToPdf(emailData, batchId) {
    try {
        const pdfDoc = await PDFDocument.create();

        // Add a page for email metadata
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;

        let textY = height - 20;
        const lineHeight = fontSize + 4;

        const addText = (text) => {
            if (textY < lineHeight) {
                textY = height - 20;
                pdfDoc.addPage();
            }
            page.drawText(text, { x: 20, y: textY, size: fontSize, font });
            textY -= lineHeight;
        };

        addText(`Sender: ${emailData.sender}`);
        addText(`Receiver: ${emailData.receiver}`);
        addText(`Subject: ${emailData.subject}`);
        addText(`Date: ${emailData.receivedDate}`);
        addText(`Body:`);
        addText(emailData.body);

        // Serialize the PDF to a buffer
        const pdfBytes = await pdfDoc.save();

        // Create a local file path for the PDF
        const directory = path.join(__basedir, 'resources', 'emails', 'attachments', 'emails', batchId);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
        const filePath = path.join(directory, `${batchId}-email.pdf`);

        // Save the PDF to the local file system
        fs.writeFileSync(filePath, pdfBytes);
        return filePath; // Return the file path
    } catch (error) {
        console.error('Error converting email to PDF:', error);
        throw error;
    }
}

module.exports = convertEmailToPdf;
