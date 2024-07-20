const express = require("express");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const Shop = require("../model/shop");
const Following = require('../model/following');
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const cloudinary = require("cloudinary");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const sendShopToken = require("../utils/shopToken");
const ShopImages = require("../model/shopImages");
const ShopVideos = require("../model/shopVideos");
const ShopPosts = require("../model/shopPosts");

// create shop
router.post("/create-shop", catchAsyncErrors(async (req, res, next) => {
  try {
    const { email } = req.body;
    const sellerEmail = await Shop.findOne({ email });
    if (sellerEmail) {
      return next(new ErrorHandler("User already exists", 400));
    }

    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "avatars",
    });


    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
      banner: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
      address: req.body.address,
      location: req.body.location,
      workingHours: req.body.working_hours,
      phoneNumber: '123456',
      zipCode: '1111',
    };

    const activationToken = createActivationToken(seller);

    const activationUrl = `http://localhost:8000/api/v2/shop/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `Hello ${seller.name}, please click on the link to activate your shop: ${activationUrl}`,
        order:null
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${seller.email} to activate your shop!`,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
}));

// create activation token
const createActivationToken = (seller) => {
  return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      const { name, email, password, avatar, zipCode, banner, address, phoneNumber, location, workingHours } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("User already exists", 400));
      }

      seller = await Shop.create({
        name,
        email,
        avatar,
        password,
        zipCode,
        address,
        phoneNumber,
        location,
        workingHours
      });

      sendShopToken(seller, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// GET endpoint to fetch follow status
router.get('/:id/follow-status/:userId', async (req, res) => {
  const { id, userId } = req.params;

  console.log(`coomas`, userId, id)
  const shopId = id;
  try {
    let following = await Following.findOne({ follower: userId, followee: shopId });
    console.log('follow status', following);
    if (following) {
      res.status(200).json({ isFollowing: following.isFollowing });
    } else {
      res.status(404).json({ error: 'Seller not found' });
    }
  } catch (error) {
    console.error('Error fetching follow status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST endpoint to toggle follow status
router.post('/:id/toggle-follow', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // Assuming userId is sent in the request body

  const shopId = id;

  console.log('Toggling follow status', id, req.params, req.body);
  try {
    // Check if the user is already following the shop
    let following = await Following.findOne({ follower: userId, followee: shopId });
    console.log('Toggling following', following);
    if (!following) {
      console.log('shoot');
      // If not following, create a new following entry
      following = new Following({ follower: userId, followee: shopId, isFollowing: true });
      console.log('follow status', following);
    } else {
      // If already following, toggle the isFollowing status
      following.isFollowing = !following.isFollowing;
    }
    console.log('following', following);
    // Save the updated following status
    await following.save();

    res.status(200).json({ message: 'Follow status updated successfully', following });
  } catch (error) {
    console.error('Error updating follow status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST endpoint to toggle follow status
router.post('/shop-info', async (req, res, next) => {
  try {
    console.log('images', req.body);
    const { shop, images, videos, postContent, postTitle, postTag } = req.body;

    console.log('images', shop, images[0], videos, postContent);

    const foundShop = await Shop.findById(shop);
    if (!foundShop) {
      return next(new ErrorHandler("Shop ID is invalid!", 400));
    }

    let shopInfo = [];

    // Process images
    if (images && images.length > 0) {
      console.log("Processing", images.length, "image(s)...",images);
      for (let i = 0; i < images.length; i++) {
        console.log("Processing2", images[i]);
        const result = await cloudinary.v2.uploader.upload(images[i], {
          folder: "shop_images",
        });
        const imageLink = {
          public_id: result.public_id,
          url: result.secure_url,
        };
        console.log("Processing3", imageLink);
        const imageInfo = await ShopImages.create({ shop: foundShop._id, image: imageLink });
        //const imageInfo = await ShopImages.create({ shop: foundShop._id, image: imageLink });
        console.log("Processing4", imageInfo);
        shopInfo.push(imageInfo);
      }
    }

    // Process videos
    if (videos && videos.length > 0) {
      console.log("Processingv", videos.length, "videos(s)...",videos);
      for (let i = 0; i < videos.length; i++) {
        console.log("Processingv1", videos[i]);
        const videoLink = videos[i];
        const videoInfo = await ShopVideos.create({ shop: foundShop._id, video: videoLink });
        console.log("Processingv2",videoInfo);
        shopInfo.push(videoInfo);
      }
    }

    // Process post content
    if (postContent && postContent.trim() !== '') {
      const postInfo = await ShopPosts.create({ shop: foundShop._id, postContent,postTitle,postTag});
      shopInfo.push(postInfo);
    }

    console.log('shizos', shopInfo);
    res.status(201).json({
      success: true,
      shopInfo,
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// login shop
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await Shop.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      sendShopToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("seller_token", null, {
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

// get shop info
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture
router.put(
  "/update-shop-avatar",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let existsSeller = await Shop.findById(req.seller._id);

      const imageId = existsSeller.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
        folder: "avatars",
        width: 150,
      });


      existsSeller.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };


      await existsSeller.save();

      res.status(200).json({
        success: true,
        seller: existsSeller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// update Banner
router.put(
  "/update-shop-banner",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      let existsSeller = await Shop.findById(req.seller._id);
      const imageId = existsSeller.banner.public_id;

      await cloudinary.v2.uploader.destroy(imageId);

      const myCloud = await cloudinary.v2.uploader.upload(req.body.banner, {
        folder: "banners",
        width: 150,
      });

      existsSeller.banner = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };


      await existsSeller.save();

      res.status(200).json({
        success: true,
        seller: existsSeller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// update seller info
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, zipCode, location, workingHours } = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.zipCode = zipCode;
      shop.location = location;
      shop.workingHours = workingHours;

      await shop.save();

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await Shop.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.params.id);

      if (!seller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      await Shop.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await Shop.findByIdAndUpdate(req.seller._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await Shop.findById(req.seller._id);

      if (!seller) {
        return next(new ErrorHandler("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
