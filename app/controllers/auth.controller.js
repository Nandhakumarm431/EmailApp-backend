const db = require("../models");
const config = require("../config/auth.config");
const User = db.user;
const Role = db.role;
const UserOTPVerification = db.userOTPVerification;
const Op = db.Sequelize.Op;
const { getNextSerialNumber } = require('./SerialNumber.controller');
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
var validator = require("node-email-validation");
// Email handler
const nodemailer = require("nodemailer")
//unique string
const { v4: uuidv4 } = require("uuid")
//env variables
require('dotenv').config();
//node mailer stuff
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  }
})
// Email configuration verify

// transporter.verify((error, success) => {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log("ready for message");
//     console.log(success);
//   }
// })
exports.signup = async (req, res) => {
  if (!req.body.fullName || !req.body.email || !req.body.password) {
    res.json({
      status: "FAILED",
      message: "Empty Input fields!"
    });
  } else if (!validator.is_email_valid(req.body.email)) {
    res.json({
      status: "FAILED",
      message: "Invalid EmailID entered!"
    });
  }
  // else if (req.body.password != req.body.password2) {
  //   res.json({
  //     status: "FAILED",
  //     message: "Password not match!"
  //   });
  // }
  else {
    const prefix = 'NHU'
    const serialNumber = await getNextSerialNumber(prefix);
    User.create({
      userID: serialNumber,
      fullName: req.body.fullName,
      email: req.body.email,
      roleId: req.body.roleId,
      password: bcrypt.hashSync(req.body.password, 8),
      password2: bcrypt.hashSync(req.body.password, 8),
      isActive: true,
      isDeleted: false
    })
      .then(user => {
        res.json({
          status: "SUCCESS",
          message: "User registered successfully!",
          data: user.id
        });
        //Handle account verification
        // sendOTPVerificationEmail(user, res);
      })
      .catch(err => {
        res.status(500).json({
          status: "ERROR",
          message: err.message
        });
      });
  }
};
const sendOTPVerificationEmail = async ({ id, email }, res) => {
  try {
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify your Email",
      html: `<p> Enter <b>${otp}</b> in the app to verify your email address and complete signup </p>
      <p>This link <b>expire in 5 mintues.</b></p>
      `,
    };
    const saltRounds = 10;
    const hashedOTP = await bcrypt.hash(otp, saltRounds)
    UserOTPVerification.create({
      userID: id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 300000,
    }).then(() => {
      transporter.sendMail(mailOptions)
        .then(() => {
          res.json({
            status: "PENDING",
            message: "Verification otp Email sent",
            data: {
              userID: id,
              emailID: email
            }
          });
        }).
        catch((error) => {
          res.json({
            status: "FAILED",
            message: "Verification Email failed"
          });
        })
    })
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message
    });
  }
}
exports.verifyOTP = (req, res) => {
  try {
    let { userID, otp } = req.body;
    if (!userID || !otp) {
      res.json({
        status: "FAILED",
        message: "Empty otp details are not allowed!"
      });
    } else {
      UserOTPVerification.findOne({
        where: {
          userID: userID
        }
      }).then(userOTPVerification => {
        if (userOTPVerification === null) {
          return res.status(404).json({
            status: "FAILED",
            message: "Account record doesn't exist or has been verified already. Please signup or login."
          });
        } else {
          const expiresAt = userOTPVerification.expiresAt;
          const hashedOTP = userOTPVerification.otp;

          if (expiresAt < Date.now()) {
            UserOTPVerification.destory({
              where: {
                userID: req.body.userID
              }
            }).then(res => {
              res.json({
                status: "FAILED",
                message: "Code has expired. Please request again."
              });
            })
          } else {
            bcrypt.compare(otp, hashedOTP).then(async validOTP => {
              if (!validOTP) {
                return res.status(404).json({
                  status: "FAILED",
                  message: "Invalid code passed. Check your inbox."
                });
              } else {
                User.update({ isActive: true }, { where: { id: userID } })
                  .then(res => {
                    const deletedRowCount = UserOTPVerification.destroy({
                      where: {
                        userID: userID,
                      },
                    });
                    console.log(deletedRowCount);
                  });
                res.json({
                  status: "VERIFIED",
                  message: "User email verified successfully."
                });
              }
            })
          }
        }
      })
    }
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message
    });
  }
}
exports.signin = (req, res) => {
  User.findOne({
    where: {
      [Op.or]: [
        { email: req.body.emailorContactNo },
        { contactNo: req.body.emailorContactNo }
      ]
    }
  })
    .then(async user => {
      if (!user) {
        return res.status(404).json({
          status: "FAILED",
          message: "User Not found."
        });
      } else if (user.isActive === false) {
        return res.status(404).json({
          status: "FAILED",
          message: "Please verify your account before you login."
        })
      }
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );
      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!"
        });
      }
      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400 // 24 hours
      });
      // var authorities = [];
      // user.getRoles().then(async roles => {
      //   for (let i = 0; i < roles.length; i++) {
      //     authorities.push("ROLE_" + roles[i].name.toUpperCase());
      //   }
      let role = await Role.findOne({
        where: { id: user.roleId }, attributes: ['name']
      })
      res.status(200).json({
        status: "SUCCESS",
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: "ROLE_" + role.name.replace(/ /g, '_').toUpperCase(),
        authToken: token
      });
    })
    .catch(err => {
      res.status(500).json({
        status: "ERROR",
        message: err.message
      });
    });
};
exports.getuserName = (req, res) => {
  User.findOne({
    where: { id: req.body.id },
    include: [{
      model: Role,
      as: 'roles',
      attributes: ['name'],
    }],
  }).then(user => {
    if (!user) {
      return res.json({
        status: "FAILED",
        message: "User Not found."
      });
    }
    res.json({
      status: "SUCCESS",
      data: user
    });
  });
};
exports.forgetPassword = (req, res) => {
  if (!req.body.email) {
    res.json({
      status: "FAILED",
      message: "Empty Input fields!"
    });
  } else if (!validator.is_email_valid(req.body.email)) {
    res.json({
      status: "FAILED",
      message: "Invalid EmailID entered!"
    });
  } else {
    User.findOne({
      where: {
        email: req.body.email
      }
    }).then(userdatas => {
      if (!userdatas) {
        return res.status(404).send({ message: "User Not found." });
      }
      else {
        UserOTPVerification.findOne({
          where: { userID: userdatas.id }
        }).then(userOTPVerification => {
          if (userOTPVerification === null) {
            sendOTPVerificationEmail(userdatas, res);
          } else {
            const expiresAt = userOTPVerification.expiresAt;
            if (expiresAt > Date.now()) {
              const deletedRowCount = UserOTPVerification.destroy({
                where: {
                  userID: userdatas.id,
                },
              });
            }
            sendOTPVerificationEmail(userdatas, res);
          }
        })
      }
    });
  }
}
exports.verifyResetPWDOTP = (req, res) => {
  try {
    let { userID, otp } = req.body;
    if (!userID || !otp) {
      res.json({
        status: "FAILED",
        message: "Empty otp details are not allowed!"
      });
    } else {
      UserOTPVerification.findOne({
        where: {
          userID: userID
        }
      }).then(userOTPVerification => {
        const expiresAt = userOTPVerification.expiresAt;
        const hashedOTP = userOTPVerification.otp;
        if (expiresAt < Date.now()) {
          const deletedRowCount = UserOTPVerification.destroy({
            where: {
              userID: userID,
            },
          });
          console.log(deletedRowCount);
          res.json({
            status: "FAILED",
            message: "Code has expired. Please request again."
          });
        } else {
          bcrypt.compare(otp, hashedOTP).then(async validOTP => {
            if (!validOTP) {
              return res.status(404).json({
                status: "FAILED",
                message: "Invalid code passed. Check your inbox."
              });
            } else {
              if (req.body.password != req.body.password2) {
                res.json({
                  status: "FAILED",
                  message: "Password not match!"
                });
              } else {
                User.update({
                  password: bcrypt.hashSync(req.body.password, 8),
                  password2: bcrypt.hashSync(req.body.password2, 8),
                }, { where: { id: userID } })
                  .then(res => {
                    const deletedRowCount = UserOTPVerification.destroy({
                      where: {
                        userID: userID,
                      },
                    });
                    console.log(deletedRowCount);
                  });
                res.json({
                  status: "VERIFIED",
                  message: "Password Reset done."
                });
              }
            }
          })
        }
      })
    }
  } catch (error) {
    res.json({
      status: "FAILED",
      message: error.message
    });
  }
}
exports.passwordChange = (req, res) => {
  User.findOne({ where: { id: req.body.id } })
    .then(async user => {
      if (!user) {
        return res.status(404).json({
          status: "FAILED",
          message: "User Not found."
        });
      } else if (user.isActive === false) {
        return res.status(404).json({
          status: "FAILED",
          message: "Please verify your account before you login."
        })
      }
      var passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );
      if (!passwordIsValid) {
        return res.status(401).send({
          status: "FAILED",
          message: "Invalid Password!"
        });
      }
      if (req.body.password === req.body.newpassword) {
        return res.status(401).send({
          status: "FAILED",
          message: "Password and New Password cannot be same!"
        });
      }
      else if (req.body.newpassword != req.body.newpassword2) {
        return res.status(401).send({
          status: "FAILED",
          message: "Password not match!"
        });
      } else {
        User.update({
          password: bcrypt.hashSync(req.body.newpassword, 8),
          password2: bcrypt.hashSync(req.body.newpassword2, 8),
        }, {
          where: { id: req.body.id }
        })
          .then(user => {
            res.json({
              status: "SUCCESS",
              message: "Password Reset done."
            });
          });
      }
    });
}
