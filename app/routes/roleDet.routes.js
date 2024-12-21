module.exports = app => {
    const roleAPI = require('../controllers/role.controller')

    app.post('/createRole', roleAPI.createRole)
    app.get('/getAllRoles', roleAPI.getRoles)
}