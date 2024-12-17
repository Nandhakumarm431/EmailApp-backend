const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const OfficeParser = require('officeparser'); // For Word and Excel files
const crypto = require('crypto'); // For general file signature checks
const sharp = require('sharp'); // For image processing

/**
 * Check if the file is encrypted or password-protected.
 * Supports PDF, Word (docx), Excel (xlsx), TIFF, and Image files (png, jpg, etc.).
 * @param {string} filePath - The path of the file to check.
 * @returns {Promise<boolean>} - Returns true if the file is encrypted, otherwise false.
 */
async function isFileEncrypted(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();

    try {
        switch (ext) {
            case 'pdf':
                return await isPdfPasswordProtected(filePath);
            case 'docx':
            case 'xlsx':
                return await isOfficeFilePasswordProtected(filePath);
            case 'tif':
            case 'tiff':
                return await isTiffEncrypted(filePath);
            case 'jpg':
            case 'jpeg':
            case 'png':
                return await isImageEncrypted(filePath);
            default:
                console.warn(`File type ${ext} not explicitly supported for encryption check.`);
                return false; // Assume not encrypted for unsupported types
        }
    } catch (error) {
        console.error(`Error checking encryption for file: ${filePath}`, error);
        return false;
    }
}

// PDF Check
async function isPdfPasswordProtected(filePath) {
    try {
        // Read file into a buffer
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
        console.log('PDF is not password-protected.');
        return false; // Not password-protected
    } catch (error) {
        if (error.message.includes('encrypted')) {
            console.log('PDF is password-protected.');
            return true; // Password-protected
        }
        console.error('Error reading PDF:', error.message);
        return true; // Assume protected if unreadable
    }
}
// Helper function to convert stream to buffer
const streamToBuffer = (filePath) => {
    return new Promise((resolve, reject) => {
        const buffers = [];
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            buffers.push(chunk);
        });

        stream.on('end', () => {
            resolve(Buffer.concat(buffers));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
};
// Office Files Check (Word, Excel)
async function isOfficeFilePasswordProtected(filePath) {
    try {
        // OfficeParser library does not have built-in encryption checks, but catching exceptions can indicate encryption
        OfficeParser.parseFile(filePath, (error, data) => {
            if (error) {
                console.error('Error reading Office file:', error);
                return true; // Likely encrypted or unreadable
            }
            console.log('Office file parsed successfully:', data);
            return false; // Not encrypted
        });
    } catch (error) {
        console.error('Error parsing Office file:', error);
        return true; // Assume encrypted
    }
}

// TIFF Check
async function isTiffEncrypted(filePath) {
    try {
        // Example implementation; more advanced TIFF parsing may be needed
        const fileBuffer = fs.readFileSync(filePath);
        const signature = fileBuffer.slice(0, 4).toString('hex'); // TIFF signatures: 49492A00 or 4D4D002A
        const isTiff = signature === '49492a00' || signature === '4d4d002a';
        return !isTiff; // If not a valid TIFF, treat as "encrypted or unsupported"
    } catch (error) {
        console.error('Error reading TIFF file:', error);
        return true;
    }
}

// Image Files Check (JPEG, PNG)
async function isImageEncrypted(filePath) {
    try {
        const validFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'bmp'];
        const ext = filePath.split('.').pop().toLowerCase();

        if (!validFormats.includes(ext)) {
            console.error(`Unsupported image format: ${ext}`);
            return true; // Treat unsupported formats as "encrypted or unreadable"
        }

        await sharp(filePath).metadata(); // Check if the image is readable
        return false; // If readable, it's not encrypted
    } catch (error) {
        console.error('Error reading image file:', error);
        return true; // Treat unreadable images as encrypted
    }
}



module.exports = isFileEncrypted;