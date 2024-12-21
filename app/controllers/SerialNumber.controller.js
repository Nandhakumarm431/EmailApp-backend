const db = require('../models')

const SerialNumDB = db.serialNumber
// const sequelize = db.sequelize

const padNumber = (num, size) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
};

const getNextSerialNumber = async (prefix) => {

    try {
        // Fetch the current number with a lock
        let serialNumber = await SerialNumDB.findOne({
            where: { prefix: prefix }
        });
        if (!serialNumber) {

            serialNumber = await SerialNumDB.create({
                prefix: prefix,
                currentNumber: 0
            });
        }

        let currentNumber = serialNumber.currentNumber;

        // Increment the number
        const nextNumber = currentNumber + 1;

        await SerialNumDB.update({ currentNumber: nextNumber }, { where: { id: serialNumber.id } })

        // Format the serial number
        const formattedSerialNumber = `${prefix}${padNumber(nextNumber, 6)}`;

        return formattedSerialNumber;
    } catch (error) {
        // Rollback the transaction in case of error
        // await transaction.rollback();
        throw error;
    }
};

module.exports = {
    getNextSerialNumber
}