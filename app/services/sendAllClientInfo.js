const db = require('../models')
const clientInfoDB = db.clientDetails

async function getAllClientsInfo() {
    try {
        let allClients = await clientInfoDB.findAll({
            attributes: ['clientEmailID']
        });
        return allClients;

    } catch (error) {
        console.log({ message: 'Internal server error', error: error.message });
    }
}

module.exports = getAllClientsInfo