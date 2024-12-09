const db = require('../models')
const clientDetDB = db.clientDetails
const emailDetailsDB = db.emailDetails


const getCountsintheProject = async (req, res) => {
    try {
        let clientsCount = await clientDetDB.count()
        let emailCount = await emailDetailsDB.count()
        res.json({
            clientsCount: clientsCount,
            emailCount: emailCount
        })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


module.exports = { getCountsintheProject }