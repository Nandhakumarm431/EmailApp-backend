module.exports = (sequelize, Sequelize) => {
    const clientDetails = sequelize.define('clientDetails', {
        clientName: {
            type: Sequelize.STRING
        },
        clientId: {
            type: Sequelize.STRING
        },
        clientEmailID: {
            type: Sequelize.STRING
        },
        password: {
            type: Sequelize.STRING
        },
        clientGoogleID: {
            type: Sequelize.STRING
        },
        clientAuthorizationCode: {
            type: Sequelize.STRING
        },
        clientGoogleSecret: {
            type: Sequelize.STRING
        },
        clientAuthToken: {
            type: Sequelize.STRING
        },
        clientRefToken: {
            type: Sequelize.STRING
        },
        clientTokenExp: {
            type: Sequelize.STRING
        },
        tokenExpiryTimestamp: {
            type: Sequelize.BIGINT,
            allowNull: true,
        },
        validdomainname: {
            type: Sequelize.STRING
        },
        activeStatus: {
            type: Sequelize.BOOLEAN
        }
    })
    return clientDetails;
}