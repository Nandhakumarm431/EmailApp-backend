const db = require('../models')
const config = require('../config/auth.config');
const { getNextSerialNumber } = require('./SerialNumber.controller');
const Utils = require('../utill/Utils')
const { Sequelize } = require('sequelize');

const userDB = db.user;
const Role = db.role;
const OrgnDB = db.organizationTypes;

const CampDet = db.campPlanning;
const PatientDB = db.patientDetls;
const Op = db.Sequelize.Op;

var validator = require("node-email-validation");
var bcrypt = require("bcryptjs");

const adduserDetls = async (req, res) => {

    try {
        if (req.body.fullName == "" || req.body.email == "" || req.body.contactNo == "") {
            res.status(400).send({
                status: "FAILED",
                message: "Empty Input fields!"
            });
        } else if (!validator.is_email_valid(req.body.email)) {
            res.status(400).send({
                status: "FAILED",
                message: "Invalid EmailID entered!"
            });
        } else {

            const validMobile = Utils.validateMobileNum(req.body.contactNo)
            if (!validMobile) {
                res.status(400).send({
                    status: "FAILED",
                    message: "Mobile number not valid. Please check your mobile number!"
                });
            } else if (req.body.zipCode < 0 || req.body.zipCode > 999999) {
                res.status(400).send({
                    status: "FAILED",
                    message: "Invalid ZIP code."
                });

            } else {
                let dateofBirth = req.body.dateOfBirth;
                if (!dateofBirth || !Utils.isValidDate(dateofBirth)) {
                    dateofBirth = null;
                }

                let zipcode = Utils.preprocessZipcode(req.body.zipCode)
 
                const dobDate = new Date();
                const yearDate = dobDate.getFullYear();
                var createPassword = req.body.fullName.substring(0, 4) + yearDate
                const prefix = 'HCU'
                const serialNumber = await getNextSerialNumber(prefix);


                userDB.create({
                    userID: serialNumber,
                    fullName: req.body.fullName,
                    dateOfBirth: dateofBirth,
                    contactNo: req.body.contactNo,
                    email: req.body.email,
                    street: req.body.street,
                    city: req.body.city,
                    state: req.body.state,
                    zipCode: zipcode,
                    created_by: req.body.created_by,
                    roleId: req.body.roleId,
                    password: bcrypt.hashSync(createPassword, 8),
                    password2: bcrypt.hashSync(createPassword, 8), 
                    isActive: true,
                    isDeleted: false
                })
                    .then(user => {
                        res.json({
                            status: "SUCCESS",
                            message: "User registered successfully!"
                        })
                    })
                    .catch(err => {
                        res.status(500).json({
                            status: "ERROR",
                            message: err.message
                        });
                    });
            }
        }
    } catch (error) {
        res.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
}


const updateuserDetls = async (req, res) => {
    const id = req.params.id;

    // Validate and format dateOfBirth
    let dateOfBirth = req.body.dateOfBirth;
    if (!dateOfBirth || !Utils.isValidDate(dateOfBirth)) {
        dateOfBirth = null;
    }

    // Preprocess zipCode
    const zipCode = Utils.preprocessZipcode(req.body.zipCode);

    try {
        // Prepare updated fields
        const updatedFields = {
            ...req.body, // Other fields from request body
            dateOfBirth: dateOfBirth, // Validated dateOfBirth
            zipCode: zipCode, // Processed zipCode
        };

        // Ensure Sequelize update call includes the `where` clause
        const [updatedRows] = await userDB.update(updatedFields, {
            where: { id: id }, // Specify the row to update
        });

        if (updatedRows === 0) {
            // No rows were updated
            return res.status(404).json({
                status: "FAILED",
                message: "User not found or no changes were made.",
            });
        }

        // Success response
        res.json({
            status: "SUCCESS",
            message: "User updated successfully!",
        });
    } catch (error) {
        console.error("Error updating user:", error.message);
        res.status(500).json({
            status: "FAILED",
            message: "Error updating user: " + error.message,
        });
    }
};

const getOneUserData = async (req, res) => {
    let id = req.params.id
    try {
        let userDet = await userDB.findOne({
            where: {
                id: id
            },
            include: [{
                model: Role,
                as: 'roles',
                attributes: ['id', 'name'],
            }]
        })
        res.status(200).send(userDet)
    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message
        });
    }
}

const getAllUsers = (req, res) => {
    userDB.findAll({
        where: {
            isDeleted: false
        },
        order: [['id', 'DESC']],
        include: [{
            model: Role,
            as: 'roles',
            attributes: ['name']
        }
        ],
    }).then(userdata => {
        if (!userdata) {
            return res.json({
                status: "FAILED",
                message: "Empty list!"
            })
        }
        res.json({
            status: "SUCCESS",
            data: userdata
        })
    })
}

const deleteCampDet = async (req, res) => {
    let id = req.params.id

    try {
        const userDelt = await userDB.update({ isDeleted: true }, { where: { id: id } });

        res.json({
            status: "SUCCESS",
            message: "User details deleted"
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({
            message: "Delete failed",
        });
    }
}

const getAllRoles = async (req, res) => {
    try {

        let roleDet = await Role.findAll({
            // where: { role_type: { [Op.ne]: 'P' } },
            order: [['name', 'ASC']]
        })
        res.status(200).send(roleDet)

    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message
        });
    }
}

const getVolunteerRoles = async (req, res) => {
    try {

        let roleDet = await Role.findAll({
            where: { role_type: { [Op.eq]: 'S' } },
            order: [['name', 'ASC']]
        })
        res.status(200).send(roleDet)

    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message
        });
    }
}

const getRoleUsersCount = async (req, res) => {
    try {
        const roleCounts = await userDB.findAll({
            attributes: [
                'roleId',
                [Sequelize.fn('COUNT', Sequelize.col('users.id')), 'userCount']
            ],
            group: ['roleId', 'roles.id', 'roles.name'],
            include: [
                {
                    model: Role,
                    as: 'roles',
                    attributes: ['name'],
                    where: {
                        name: {
                            [Sequelize.Op.ne]: 'Super Admin' // Exclude "super admin"
                        }
                    }
                }
            ]
        });

        const result = roleCounts.map(roleCount => ({
            // roleId: roleCount.roleId,
            roleName: roleCount.roles.name,
            userCount: roleCount.dataValues.userCount
        }));

        res.json(result);

    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message
        });

    }
}

const getUserCountsMonthbased = async (req, res) => {
    try {
        const userCounts = await userDB.findAll({
            attributes: [
                [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'month'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'userCount']
            ],
            group: ['month'],
            order: [['month', 'ASC']],
        });

        const result = userCounts.map(userCount => ({
            month: userCount.dataValues.month,
            userCount: userCount.dataValues.userCount
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const getCampPatientTotalCounts = async (req, res) => {
    try {
        const campData = await db.campPlanning.findAll({
            attributes: [
                [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('campDate')), 'month'], // Group by truncated month
                'campName', // Include camp name
                [Sequelize.fn('COUNT', Sequelize.col('patientDetls->patients_camps.patientId')), 'patientCount'],
            ],
            include: [
                {
                    model: db.patientDetls,
                    through: { attributes: [] }, // Exclude fields from the junction table
                    attributes: [], // Exclude patient fields
                },
            ],
            group: [
                Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('campDate')), // Month grouping
                'campPlanningDet.campName', // Group by camp name
                'campPlanningDet.id', // Group by the primary key of campPlanning
            ],
            order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('campDate')), 'DESC']],
        });

        // Format the data into the desired structure
        const groupedData = campData.reduce((acc, camp) => {
            const month = camp.dataValues.month.toLocaleString('default', { month: 'long' }); // Convert to month name
            const campName = camp.campName;
            const patientCount = parseInt(camp.dataValues.patientCount, 10);

            if (!acc[month]) {
                acc[month] = [];
            }

            acc[month].push({ name: campName, patientCount });
            return acc;
        }, {});

        // Transform grouped data into the final structure
        const result = Object.entries(groupedData).map(([month, camps]) => ({
            month,
            camps,
        }));

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};




module.exports = {
    adduserDetls, getOneUserData,
    updateuserDetls,
    getAllUsers,
    deleteCampDet,
    getAllRoles, getVolunteerRoles, getRoleUsersCount,
    getUserCountsMonthbased, getCampPatientTotalCounts
}

