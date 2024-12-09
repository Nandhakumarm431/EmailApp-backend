const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const { PDFDocument } = require('pdf-lib');

function isPdf(filePath) {
    return filePath.toLowerCase().endsWith('.pdf');
}

async function convertImageToPdf(inputFilePath, outputFilePath) {
    try {
        const fileExt = path.extname(inputFilePath).toLowerCase();
        console.log(`Converting file: ${inputFilePath}, file extension: ${fileExt}`);

        if (['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp'].includes(fileExt)) {
            await sharp(inputFilePath)
                .toFormat('pdf')
                .toFile(outputFilePath);
            console.log(`Image converted to PDF and saved to ${outputFilePath}`);
        } else {
            console.log(`Unsupported image format: ${fileExt}`);
        }
    } catch (error) {
        console.error('Error converting image to PDF:', error);
    }
}



async function convertToPdf(inputFilePath, outputFilePath) {
    const fileExt = path.extname(inputFilePath).toLowerCase();
    try {
        // If it's a PDF, just copy it to the output location
        if (fileExt === '.pdf') {
            fs.copyFileSync(inputFilePath, outputFilePath);
            console.log(`PDF file copied to ${outputFilePath}`);
        }
        // If it's an image, convert it to PDF
        else if (['.jpg', '.jpeg', '.png', '.tiff', '.tif'].includes(fileExt)) {
            await convertImageToPdf(inputFilePath, outputFilePath);
        }
        // If it's a Word document, convert it to PDF
        else if (fileExt === '.docx') {
            // await convertDocxToPdf(inputFilePath, outputFilePath);
        }
        // If the file type is not supported
        else {
            console.log('Unsupported file type');
        }
    } catch (error) {
        console.error('Error during conversion:', error);
    }
}

module.exports = {
    convertToPdf,
    isPdf
}