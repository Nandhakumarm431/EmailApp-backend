module.exports = (sequelize, Sequelize) => {
    const serialNum = sequelize.define("serialNumbers", {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        prefix: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        currentNumber: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
    });

    return serialNum;
};