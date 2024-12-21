const { verifySignUp } = require("../middleware");
const controller = require("../controllers/auth.controller");

const path = require("path")

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      verifySignUp.checkRolesExisted
    ],
    controller.signup
  );

  app.post("/api/auth/signin", controller.signin);
  app.post("/api/auth/verifyOTP", controller.verifyOTP);
  app.post("/api/auth/forgetPassword", controller.forgetPassword);
  app.post("/api/auth/resetPassword", controller.verifyResetPWDOTP);
  app.post("/api/auth/getuser", controller.getuserName);

  app.post("/api/auth/changePassword",controller.passwordChange);



  // app.get("/verify:id:uniqueString",controller.verifyEmail);

  // app.get("verified",(req,res)=>{
  //   res.sendFile(path.join(__dirname,"./../views/verified.html"));
  // })

};
