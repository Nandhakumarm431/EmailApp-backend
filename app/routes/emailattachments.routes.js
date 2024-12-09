module.exports = app =>{
    const emailAttachmentsAPI = require('../controllers/emailattachmnt.controler')

    app.get('/getEmailAttachments/:batchId',emailAttachmentsAPI.getEmailAttachments)
    
    app.get('/getOneAttachment/:batchId',emailAttachmentsAPI.getOneAttachment)
    
    app.post("/downloadAttachmens", emailAttachmentsAPI.downloadAttachments);

}