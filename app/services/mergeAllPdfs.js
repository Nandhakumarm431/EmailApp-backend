const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const uploadToS3 = require('../middleware/uploadReports');
const axios = require('axios');


// Set up AWS S3 client
const s3 = new AWS.S3();
const lambda = new AWS.Lambda();


/**
 * Merge all PDF files into one.
 * @param {Array} pdfBuffers - Array of Buffers for the PDF files to merge.
 * @returns {Buffer} - Buffer containing the merged PDF file.
 */

async function mergePdfs(pdfBuffers) {
    if (!Array.isArray(pdfBuffers) || pdfBuffers.length === 0) {
        throw new Error('Input must be a non-empty array of PDF buffers');
    }
    try {
        const mergedPdf = await PDFDocument.create();
        for (let i = 0; i < pdfBuffers.length; i++) {
            const pdfBuffer = pdfBuffers[i];

            // Ensure pdfBuffer has the required structure
            if (!pdfBuffer || !pdfBuffer.data || !pdfBuffer.data.fileContent) {
                throw new Error(`Missing fileContent in PDF buffer at index ${i}`);
            }

            let fileContent = pdfBuffer.data.fileContent;
            if (typeof fileContent === 'string') {
                fileContent = Buffer.from(fileContent, 'base64');
            }

            // Ensure that fileContent is now a Buffer
            if (!Buffer.isBuffer(fileContent)) {
                throw new Error(`Invalid fileContent (not a Buffer) in PDF buffer at index ${i}`);
            }

            try {
                const pdfDoc = await PDFDocument.load(fileContent);
                const pageIndices = pdfDoc.getPageIndices();

                // Check if there are pages to copy
                if (pageIndices.length === 0) {
                    throw new Error(`No pages found in PDF buffer at index ${i}`);
                }

                const pages = await mergedPdf.copyPages(pdfDoc, pageIndices);
                pages.forEach((page) => mergedPdf.addPage(page));

            } catch (loadError) {
                console.error(`Error loading or processing PDF at index ${i}:`, loadError);
                throw loadError;  // Re-throw after logging
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        console.log('Merged PDF successfully created');
        return Buffer.from(mergedPdfBytes);

    } catch (error) {
        console.error('Error merging PDFs:', error);
        throw error;  // Re-throw the error after logging
    }
}





async function processAndMergePdfs(batchId, emaildata) {
    const mergedPdfKey = `${batchId}-merged.pdf`;  // Name for the merged PDF file in S3
    try {
        // Step 1: Call Lambda to fetch all PDFs from S3 based on batchId

        const lambdaUrl = process.env.AWS_LAMBDA_URL_GETFILES;
        const lambdaResponse = await axios.post(lambdaUrl, { batchId: batchId });

        if (!lambdaResponse.data.pdfFiles) {
            console.log('No PDF files found in the S3 bucket for batchId:', batchId);
            return;
        }

        const pdfFiles = lambdaResponse.data.pdfFiles;

        // Step 2: Download PDF files from S3 and create PDF Buffers
        const pdfBuffers = [];
        for (const fileKey of pdfFiles) {
            const lambdaUrlGetObj = process.env.AWS_LAMBDA_URL_GETOBJECT_FROMFILE;
            const fileData = await axios.post(lambdaUrlGetObj, {
                bucketName: process.env.AWS_BUCKET_NAME,
                fileKey: fileKey
            }, { timeout: 30000 });  // Timeout set to 10 seconds

            pdfBuffers.push(fileData);
        }

        // Step 3: Merge the PDF files
        const mergedPdfBuffer = await mergePdfs(pdfBuffers);
        console.log('PDFs merged successfully.');

        // Step 4: Store the merged PDF temporarily in a local directory
        const directory = path.join(__basedir, 'resources', 'emails', 'attachments', batchId);
        const filePath = path.join(directory, mergedPdfKey);

        // Ensure the directory exists
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Write the merged PDF buffer to a local file
        fs.writeFileSync(filePath, mergedPdfBuffer);
        console.log(`Merged PDF saved locally at: ${filePath}`);
        // Step 5: Upload the merged PDF to S3
        const mergedPdfLocation = await uploadToS3(filePath, batchId, mergedPdfKey, emaildata, true, mergedPdfKey, false);
        console.log(`Merged PDF uploaded to S3: ${mergedPdfLocation}`);
        return filePath;
    } catch (error) {
        console.error('Error processing PDFs for batchId:', batchId, error);
    }
}

module.exports = processAndMergePdfs;
