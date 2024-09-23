const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your shop name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your shop email address"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [6, "Password should be greater than 6 characters"],
    select: false,
  },
  description: {
    type: String,
    required: false,
  },
  currency: {
    type: String,
    default: "KES",
    required: false,
  },
  location: {
    type: Object,
  },
  workingHours: {
    type: Object,
    required: false,
  },

  address: {
    type: String,
    required: [true, "Please enter your shop Phone Address!"],
  },
  phoneNumber: {
    type: Number,
    required: [true, "Please enter your shop Phone Number!"],
  },
  whatsAppNumber: {
    type: Number,
    default: '254103787041',
  },
  supportEmail: {
    type: String,
    required: false,
  },
  website: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: "Seller",
  },
  accountType: {
    type: String,
    default: "individual",
  },

  avatar: {
    public_id: {
      type: String,
      required: false,
      default: 'default_avatar_public_id',
    },
    url: {
      type: String,
      required: false,
      default: 'https://dummyimage.com/300x300/000/fff&text=Avatar',
    },
  },
  banner: {
    public_id: {
      type: String,
      required: false,
      default: 'default_banner_public_id',
    },
    url: {
      type: String,
      required: false,
      default: 'https://dummyimage.com/600x200/000/fff&text=Banner',
    },
  },
  zipCode: {
    type: Number,
    required: false,
  },
  withdrawMethod: {
    type: Object,
    required: false,
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  transections: [
    {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        default: "Processing",
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
      updatedAt: {
        type: Date,
      },
    },
  ],
  otp:{
    type: String,
    default: null,
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
});

// Hash password
shopSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
shopSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};



// comapre password
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


shopSchema.methods.getResetPasswordToken = function () {
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
module.exports = mongoose.model("Shop", shopSchema);
