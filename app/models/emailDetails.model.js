const { DataTypes } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
    const EmailDetails = sequelize.define('emailDetails', {
        batchId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mailBoxType: {
            type: Sequelize.STRING
        },
        emailFolderType: {
            type: Sequelize.STRING
        },
        messageId: {
            type: Sequelize.STRING
        },
        senderName: {
            type: Sequelize.STRING
        },
        senderId: {
            type: Sequelize.STRING
        },
        receiverId: {
            type: Sequelize.STRING
        },
        receivedDateTime: {
            type: Sequelize.DATE
        },
        subject: {
            type: Sequelize.STRING
        },
        status: {
            type: Sequelize.STRING
        },
        statusReason: {
            type: Sequelize.STRING
        }
    })
    return EmailDetails;
}