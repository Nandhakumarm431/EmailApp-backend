const { verifySignUp } = require("../middleware");
const userAPI = require('../controllers/user.controller.js')

module.exports = app => {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });
    app.post('/adduser', [
        verifySignUp.checkDuplicateUsernameOrEmail,
        verifySignUp.checkRolesExisted
    ],
        userAPI.adduserDetls
    )


    app.get('/getUserList', userAPI.getAllUsers)
    app.get('/getAllRoles', userAPI.getAllRoles)
    app.get('/getVolunteerRoles', userAPI.getVolunteerRoles)
    app.put('/updateUser/:id', userAPI.updateuserDetls)
    app.get('/getUser/:id', userAPI.getOneUserData)
    app.put('/deleteUser/:id', userAPI.deleteCampDet)

    app.get('/roleUserCount', userAPI.getRoleUsersCount);
    app.get('/users/count-by-month', userAPI.getUserCountsMonthbased);
    app.get('/campPatient/count-by-month', userAPI.getCampPatientTotalCounts);
}  