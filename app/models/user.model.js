module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("users", {
    userID: {
      type: Sequelize.STRING
    },
    fullName: {
      type: Sequelize.STRING
    },
    dateOfBirth: {
      type: Sequelize.DATEONLY,
      allowNull: true
    },
    contactNo: {
      type: Sequelize.STRING,
      allowNull: true
    },
    email: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    password2: {
      type: Sequelize.STRING
    },
    isActive: {
      type: Sequelize.BOOLEAN
    },
    googleId: {
      type: Sequelize.STRING
    },
    picture: {
      type: Sequelize.STRING
    },
    street: {
      type: Sequelize.STRING
    },
    city: {
      type: Sequelize.STRING
    },
    state: {
      type: Sequelize.STRING
    },
    zipCode: {
      type: Sequelize.BIGINT
    },
    created_by: {
      type: Sequelize.INTEGER
    },
    isDeleted: {
      type: Sequelize.BOOLEAN
    },
  });

  return User;
};
