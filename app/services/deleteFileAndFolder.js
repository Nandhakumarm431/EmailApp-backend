const fs = require('fs').promises; // Use promise-based fs API
const path = require('path');

async function deleteFileAndFolder(filePath, folderPath = null) {
    try {
        // Delete the file
        await fs.unlink(filePath);
        console.log(`File deleted from local storage: ${filePath}`);

        // If a folder path is provided, delete the folder
        if (folderPath) {
            await fs.rm(folderPath, { recursive: true, force: true });
            console.log(`Folder deleted from local storage: ${folderPath}`);
        }
    } catch (error) {
        console.error('Error deleting file or folder:', error);
    }
}

module.exports = deleteFileAndFolder;