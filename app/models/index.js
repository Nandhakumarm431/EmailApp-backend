const config = require('../config/db.config.js')

const Sequelize = require('sequelize')

const sequelize = new Sequelize(
    config.DB,
    config.USER,
    config.PASSWORD,
    {
        host: config.HOST,
        dialect: config.dialect,
        operatorsAliases: false,
        dialectOptions: config.dialectOptions,

        pool: {
            max: config.pool.max,
            min: config.pool.min,
            acquire: config.pool.acquire,
            idle: config.pool.idle
        }
    }
);

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.emailDetails = require('../models/emailDetails.model.js')(sequelize, Sequelize)
db.emailAttachments = require('../models/emailAttachments.model.js')(sequelize, Sequelize)
db.clientDetails = require('../models/clientDetails.model.js')(sequelize, Sequelize)

db.emailDetails.hasMany(db.emailAttachments, { as: 'emailAttachments' });
db.emailAttachments.belongsTo(db.emailDetails, {
  foreignKey: 'batchId',
  as: 'emailDetails'
})

db.emailDetails.belongsTo(db.clientDetails, {
  foreignKey: 'clientId',
  as: 'clientDetails'
})


module.exports = db;