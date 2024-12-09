module.exports = app =>{
    const clientDetAPI = require('../controllers/clientDetails.controller')

    app.get('/getOneClient/:emailid',clientDetAPI.getOneClient)
    app.get('/getAllClients',clientDetAPI.getAllClients)
    app.post("/createClient", clientDetAPI.createClientDetails);

    const commonDetAPI = require('../controllers/commondet.controller')

    app.get('/getCountsintheProject',commonDetAPI.getCountsintheProject)
}