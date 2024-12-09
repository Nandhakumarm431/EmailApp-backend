module.exports = (sequelize, Sequelize) =>{
    const emailAttachments = sequelize.define('emailAttachments',{
        fileName:{
            type: Sequelize.STRING
        },
        fileType:{
            type: Sequelize.STRING
        },
        fileURL:{
            type: Sequelize.STRING
        },
        receivedDateTime: {
            type: Sequelize.DATE
        },
        status: {
            type: Sequelize.STRING
        },
        statusReason: {
            type: Sequelize.STRING
        },
        isMerged:{
            type: Sequelize.BOOLEAN
        }
    })
    return emailAttachments;
}