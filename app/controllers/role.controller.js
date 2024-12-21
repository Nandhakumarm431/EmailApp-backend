const db = require('../models')
const roleDB = db.role

const createRole = async (req, res) => {
    try {
        const { roleName, roleType } = req.body;
        const role = await roleDB.create({
            name: roleName,
            role_type: roleType
        });
        res.status(200).json({
            data: role,
            message: "Role created"
        })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

const getRoles = async (req, res) => {
    try {
        let allRoles = await roleDB.findAll({});
        res.send(allRoles)
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

module.exports = {
    getRoles, createRole
}