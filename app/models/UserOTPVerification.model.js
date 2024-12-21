module.exports = (sequelize, Sequelize) => {
    const UserOTPVerification = sequelize.define("userOTPVerification", {
        userID: {
            type: Sequelize.INTEGER
        },
        otp: {
            type: Sequelize.STRING
        },
        createdAt : {
            type:Sequelize.DATE
        },
        expiresAt : {
            type:Sequelize.DATE
        }

    });

    return UserOTPVerification;
};
