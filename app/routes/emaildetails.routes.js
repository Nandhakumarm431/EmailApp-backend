module.exports = app =>{
    const emailDetailAPI = require('../controllers/emaildetails.controller')

    app.post('/addemailDet',emailDetailAPI.createEmailDet);
    app.get('/getemaildetails',emailDetailAPI.getEmailDetails)
    app.get('/dashboard/email-stats',emailDetailAPI.getemailDashboard);
}