const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name:{
    type: String,
    required: [true, "Please enter your name!"],
  },
  email:{
    type: String,
    required: [true, "Please enter your email!"],
  },
  password:{
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  phoneNumber:{
    type: String,
    required: [true, "Please enter your Phone Number!"],
  },
  addresses:[
    {
      county: {
        type: String,
      },
      city:{
        type: String,
      },
      address:{
        type: String,
      },
      addressType:{
        type: String,
      },
      primaryPhoneNumber:{
        type: Number,
      },
      secondaryPhoneNumber:{
        type: Number,
      },
      additionalInformation:{
        type: String,
      },
    }
  ],
  role:{
    type: String,
    default: "user",
  },

  avatar: {
    public_id: {
      type: String,
      required: true,
      default: 'default_avatar_public_id',
    },
    url: {
      type: String,
      required: true,
      default: 'https://dummyimage.com/300x300/000/fff&text=Avatar',
    },
  },
 otp:{
  type: String,
  default: null,
},
isSuspended: {
  type: Boolean,
  default: false
},
 createdAt:{
  type: Date,
  default: Date.now(),
 },
 resetPasswordToken: String,
 resetPasswordTime: Date,
});


//  Hash password
userSchema.pre("save", async function (next){
  if(!this.isModified("password")){
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id}, process.env.JWT_SECRET_KEY,{
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set token expire time
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};


module.exports = mongoose.model("User", userSchema);
