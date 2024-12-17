const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const mammoth = require('mammoth');

function isPdf(filePath) {
    return filePath.toLowerCase().endsWith('.pdf');
}

async function convertImageToPdf(inputFilePath, outputFilePath) {
    try {
        const fileExt = path.extname(inputFilePath).toLowerCase();

        // Convert TIFF to PNG using sharp if needed
        let imageBuffer = (fileExt.toLowerCase() === '.tiff' || fileExt.toLowerCase() === '.tif')
            ? await sharp(inputFilePath).png().toBuffer()
            : fs.readFileSync(inputFilePath);

        // Create PDF document and embed image
        const pdfDoc = await PDFDocument.create();
        const embeddedImage = fileExt === '.jpg' || fileExt === '.jpeg'
            ? await pdfDoc.embedJpg(imageBuffer)
            : await pdfDoc.embedPng(imageBuffer);

        const { width, height } = embeddedImage.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width, height });

        // Save PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputFilePath, pdfBytes);
        console.log(`Image converted to PDF and saved to ${outputFilePath}`);
        return outputFilePath;
    } catch (error) {
        console.error('Error converting image to PDF:', error);
    }
}

async function convertDocxToPdf(inputFilePath, outputFilePath) {
    try {
        // Extract text from .docx file
        const { value: docText } = await mammoth.extractRawText({ path: inputFilePath });

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);  // A4 size
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const { height } = page.getSize();

        // Add extracted text to PDF
        page.drawText(docText, {
            x: 50,
            y: height - 50,
            font,
            size: 12,
            maxWidth: 500,
            lineHeight: 14,
        });

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputFilePath, pdfBytes);
        console.log(`Converted DOCX to PDF at ${outputFilePath}`);
    } catch (error) {
        console.error('Error converting DOCX to PDF:', error);
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
        else if (['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.TIF', '.TIFF', '.webp'].includes(fileExt)) {
            console.log('file check', await convertImageToPdf(inputFilePath, outputFilePath));
            await convertImageToPdf(inputFilePath, outputFilePath);
        }
        // If it's a Word document, convert it to PDF
        else if (fileExt === '.docx' || fileExt === '.doc') {
            await convertDocxToPdf(inputFilePath, outputFilePath);
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