const fs = require('fs/promises');
const path = require('path');

async function deleteFileAndFolder(filePath, folderPath = null) {
    try {
        // Delete the file if it exists
        const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
        if (fileExists) {
            await retryDelete(async () => {
                await fs.unlink(filePath);
                console.log(`File deleted from local storage: ${filePath}`);
            }, filePath);
        } else {
            console.warn(`File not found, skipping: ${filePath}`);
        }

        // Delete the folder if it exists
        if (folderPath) {
            const folderExists = await fs.access(folderPath).then(() => true).catch(() => false);
            if (folderExists) {
                await retryDelete(async () => {
                    await fs.rm(folderPath, { recursive: true, force: true });
                    console.log(`Folder deleted from local storage: ${folderPath}`);
                }, folderPath);
            } else {
                console.warn(`Folder not found, skipping: ${folderPath}`);
            }
        }
    } catch (error) {
        if (error.code === 'EPERM') {
            console.error(
                'Permission error. Ensure no process is locking the file or folder and that you have sufficient permissions.'
            );
        } else {
            console.error('Error deleting file or folder:', error);
        }
    }
}

// Retry mechanism to handle locked files
async function retryDelete(deleteOperation, pathToDelete, retries = 5, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            await deleteOperation();
            return; // Exit if successful
        } catch (error) {
            if (error.code === 'EPERM' || error.code === 'EBUSY') {
                console.warn(
                    `Retrying deletion of ${pathToDelete} in ${delay}ms... (${i + 1}/${retries})`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw error; // Re-throw other errors
            }
        }
    }
    console.error(`Failed to delete ${pathToDelete} after ${retries} attempts.`);
}


module.exports = deleteFileAndFolder;