module.exports = (sequelize, Sequelize) => {
    const Role = sequelize.define('roles', {
        name: {
            type: Sequelize.STRING
        },

        role_type: {
            type: Sequelize.STRING
        }
    })
    return Role;
}