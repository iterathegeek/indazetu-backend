const express = require("express");
const User = require("../model/user");
const router = express.Router();
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const bcrypt = require("bcryptjs");

// create user
router.post("/create-user", async (req, res, next) => {
  try {
    const { name, email, password, avatar, phoneNumber } = req.body;
    const userEmail = await User.findOne({ email });

    if (userEmail) {
      return next(new ErrorHandler("User already exists", 400));
    }


    const myCloud = avatar ? await cloudinary.v2.uploader.upload(avatar, {
      folder: 'avatars',
    }) : {
      public_id: 'default_avatar_public_id',
      secure_url: 'https://dummyimage.com/300x300/000/fff&text=Avatar',
    };


    const user = {
      name: name,
      email: email,
      password: password,
      phoneNumber: phoneNumber,
      avatar: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
    };

    const activationToken = createActivationToken(user);



    // const activationUrl = `http://localhost:3000/activation/${activationToken}`;
    const activationUrl = `https://indazetu.com/activation/${activationToken}`;
    
    console.log('tokenop', activationToken, email, activationUrl)
    console.log('hello', user)
    try {

      await sendMail({
        email: user.email,
        subject: "Activate your Account",
        message: `
          <p>Hello ${user.name},</p>
          <p>Please click on the button below to activate your Account:</p>
          <a href="${activationUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007BFF; border-radius: 5px; text-decoration: none;">
          Activate Account
        </a>
        `,
        order: null
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token
const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "15m",
  });
};

// activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    console.log('we here', req)
    try {
      const { activation_token } = req.body;

      console.log('we here2', activation_token)
      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );
      console.log('we here3', newUser)
      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar, phoneNumber } = newUser;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }
      user = await User.create({
        name,
        email,
        avatar,
        password,
        phoneNumber,
      });

      sendToken(user, 201, res);

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login user
router.post(
  "/complete-login",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { userId, password } = req.body;

      if (!userId || !password) {
        return next(new ErrorHandler("Please provide all fields!", 400));
      }

      const user = await User.findById(userId).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exist!", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(new ErrorHandler("Incorrect credentials", 400));
      }

      // Log the user in by issuing a token or session
      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



// load user
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
router.post(
  '/reauthenticate',
  // isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    let { userId, password } = req.body;
    console.log('reauthenticate', req.body);

    if (!userId || !password) {
      return next(new ErrorHandler('Please provide all fields', 400));
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    console.log('reauthenticate2', user);

    const isPasswordMatched = await user.comparePassword(password);

    console.log('reauthenticate3', isPasswordMatched);

    if (!isPasswordMatched) {
      return next(new ErrorHandler('Incorrect password', 401));
    }

    res.status(200).json({
      success: true,
      message: 'Reauthenticated successfully',
    });
  })
);


// log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let existsUser = await User.findById(req.user.id);
      if (req.body.avatar !== "") {
        const imageId = existsUser.avatar.public_id;

        await cloudinary.v2.uploader.destroy(imageId);

        const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
          folder: "avatars",
          width: 150,
        });

        existsUser.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      await existsUser.save();

      res.status(200).json({
        success: true,
        user: existsUser,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log('body', req.body);
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler("User is not available with this id", 400)
        );
      }



      const imageId = user.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      await User.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Anonymize user data
router.patch(
  '/user/:id/anonymize',
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    user.name = 'Deleted User';
    user.email = `deleted_${user._id}@example.com`;
    user.password = undefined; // or hash some default password
    // anonymize other sensitive fields as necessary
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User anonymized successfully',
    });
  })
);
// Suspend user
router.put(
  '/suspend',
  catchAsyncErrors(async (req, res, next) => {
    const { reason, userId } = req.body;
   
    
    if (!reason || !userId) {
      return next(new ErrorHandler('Missing required fields', 400));
    }
  
    const user = await User.findById(userId);
    
    user.isSuspended = !user.isSuspended;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
    });
  })
);

// Delete user account
router.delete(
  '/delete',
  catchAsyncErrors(async (req, res, next) => {

    const { reason, userId } = req.body;
   
    if (!reason || !userId) {
      return next(new ErrorHandler('Missing required fields', 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }


    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    user.name = 'Deleted User';
    user.email = `deleted_${user.email}@example.com`;
    user._id = `deleted_${user._id}`;
    // user.password = undefined; // or hash some default password
    // anonymize other sensitive fields as necessary
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User anonymized successfully',
    });


    // Optionally log the reason for deletion
    //await DeletionLog.create({ userId: user._id, reason });

    //await user.remove();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  })
);

// Forgot Password
router.post(
  '/forgot-password',
  catchAsyncErrors(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      return next(new ErrorHandler('Please provide an email address', 400));
    }

    // Check if the user exists
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorHandler('User not found with this email', 404));
    }

    // Generate a password reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/password/reset/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested a password reset for your account. Please click on the following link, or paste it into your browser to complete the process:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`;

    try {
      // Send email
      await sendMail({
        email: user.email,
        subject: 'Password Reset Request',
        message,
      });

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email}`,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorHandler('Email could not be sent', 500));
    }
  })
);

// Password reset route
router.put(
  '/password/reset/:token',
  catchAsyncErrors(async (req, res, next) => {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user by token and ensure token hasn't expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new ErrorHandler('Password reset token is invalid or has expired', 400)
      );
    }

    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler('Passwords do not match', 400));
    }

    // Set new password
    user.password = req.body.password;

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  })
);


module.exports = router;
