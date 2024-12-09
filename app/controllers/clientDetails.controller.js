const db = require('../models')
const clientDetDB = db.clientDetails

const createClientDetails = async (req, res) => {
    try {
        const { clientName, clientId, clientEmailID, password, clientGoogleID, clientGoogleSecret, clientAuthToken, clientRefToken } = req.body;
        const createClient = await clientDetDB.create({
            clientRefToken: clientRefToken,
            clientAuthToken: clientAuthToken,
            clientGoogleSecret: clientGoogleSecret,
            clientGoogleID: clientGoogleID,
            password: password,
            clientEmailID: clientEmailID,
            clientId: clientId,
            clientName: clientName
        });
        res.status(200).json({
            message: 'Client is created successfully'
        });


    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

const getOneClient = async (req, res) => {
    let emailid = req.params.emailid
    try {
        let client = await clientDetDB.findOne({
            where: { clientEmailID: emailid }
        });
        res.json({
            status: "SUCCESS",
            data: client
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

const getAllClients = async (req, res) => {
    try {
        let allClients = await clientDetDB.findAll({
            attributes: ['clientEmailID']
        });
        res.send(allClients)
        
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
module.exports = {
    createClientDetails, getOneClient, getAllClients
}