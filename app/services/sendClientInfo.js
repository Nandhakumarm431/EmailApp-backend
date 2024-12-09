const db = require('../models')
const clientInfoDB = db.clientDetails

async function getClientInfoFromMailID(clientID) {
    try {
        let clientDet = await clientInfoDB.findOne({
            where: { clientEmailID: clientID }
        }); 
        return clientDet;

    } catch (error) {
        console.log({ message: 'Internal server error', error: error.message });
    }
}

module.exports = getClientInfoFromMailID