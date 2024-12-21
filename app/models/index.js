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

db.user = require("../models/user.model.js")(sequelize, Sequelize);
db.role = require("../models/role.model.js")(sequelize, Sequelize);
db.ROLES = ["user", "admin", "client"]
db.userOTPVerification = require("../models/UserOTPVerification.model.js")(sequelize, Sequelize);
db.serialNumber = require('../models/SerialNumber.model.js')(sequelize, Sequelize);

db.role.hasMany(db.user, { as: 'users' });
db.user.belongsTo(db.role, {
  foreignKey: 'roleId',
  as: 'roles'
})

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