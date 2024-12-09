const db = require('../models')
const emailDB = db.emailDetails;


const generateBatchId = async (req, res) => {
    const { clientId, id } = req;
    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }
    const lastEmail = await emailDB.findOne({
        where: { clientId: id },
        order: [['createdAt', 'DESC']],
        attributes: ['batchId'],
    });

    if (!lastEmail) {
        return `${clientId}-EMAIL-UAT-001`;
    }

    const lastBatchId = lastEmail.batchId;
    const lastNumber = parseInt(lastBatchId.split('-').pop(), 10);

    const newBatchNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `${clientId}-EMAIL-UAT-${newBatchNumber}`;
}

module.exports = {
    generateBatchId
}