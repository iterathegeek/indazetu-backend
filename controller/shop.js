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
const ShippingCost = require("../model/shippingCosts");
const shippingCosts = require("../model/shippingCosts");
// create shop

router.post("/create-shop", catchAsyncErrors(async (req, res, next) => {
  try {
    const { email,avatar, accountType } = req.body;
    console.log('avatar',req.body.accountType)
    const sellerEmail = await Shop.findOne({ email });
    if (sellerEmail) {
      return next(new ErrorHandler("User already exists", 400));
    }

 
    const myCloud = avatar ? await cloudinary.v2.uploader.upload(avatar, {
      folder: 'avatars',
    }) : {
      public_id: 'default_avatar_public_id',
      secure_url: 'https://dummyimage.com/300x300/000/fff&text=Avatar',
    };


    const seller = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      },
      banner: {
        public_id: 'default_banner_public_id',
        url: 'https://dummyimage.com/600x200/000/fff&text=Banner',
      },
      address: req.body.address,
      location: req.body.location,
      workingHours: req.body.working_hours,
      phoneNumber: req.body.phoneNumber,
      country:  req.body.country,
      accountType:accountType
    };

    const activationToken = createActivationToken(seller);
    console.log('activationToken', activationToken)

    const activationUrl = `http://localhost:3000/seller/activation/${activationToken}`;

    try {
      await sendMail({
        email: seller.email,
        subject: "Activate your Shop",
        message: `
          <p>Hello ${seller.name},</p>
          <p>Please click on the button below to activate your shop:</p>
          <a href="${activationUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007BFF; border-radius: 5px; text-decoration: none;">
          Activate Shop
        </a>
        `,
        order: null
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${seller.email} to activate your shop!`,
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
    expiresIn: "50m",
  });
};



// activate user
router.get("/activation/:activation_token",catchAsyncErrors(async (req, res, next) => {
    try {
      console.log('welcome home')
      const { activation_token } = req.params;
      // console.log('token',token);
      // console.log('token2',process.env.JWT_SECRET_KEY);
      // const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      // console.log('Decoded Token:', decoded);
      // console.log('activation_token',token);

      const newSeller = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );
      console.log('activation_token2', newSeller);

      if (!newSeller) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      const { name, email, password, avatar, country, banner, address, phoneNumber, location, workingHours } =
        newSeller;

      let seller = await Shop.findOne({ email });

      if (seller) {
        return next(new ErrorHandler("Seller already exists", 400));
      }
     

      seller = await Shop.create({
        name,
        email,
        avatar,
        password,
        country,
        banner,
        address,
        phoneNumber,
        location,
        workingHours,
        accountType
      });
      res.status(201).json({
        success: true,
        message: 'success...',
       // redirectUrl: 'http://localhost:3000'
      });
    //  sendShopToken(seller, 201, res);


    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
      // res.status(500).json({ 
      //   success: false, 
      //   message: 'An error occurred, redirecting...', 
      //   redirectUrl: 'http://localhost:3000' 
      // });
    //  res.redirectUrl('http://localhost:3000');
    };
  // res.redirectUrl('http://localhost:3000');
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
//get all followed shops
router.get('/followed-shops/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const following = await Following.find({ follower: userId, isFollowing: true });
    console.log('following', following);

    if (following.length > 0) {
      const shopIds = following.map(follow => follow.followee);
      res.status(200).json({ followedShops: shopIds });
    } else {
      res.status(404).json({ error: 'No followed shops found' });
    }
  } catch (error) {
    console.error('Error fetching followed shops:', error);
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
    const { shop, images, videos, postContent, postTitle, postTag, homeContent, homeTag, shippingInputs, returnPolicy } = req.body;

    console.log('images', shop, images[0], videos, postContent, homeContent, homeTag);

    const foundShop = await Shop.findById(shop);
    if (!foundShop) {
      return next(new ErrorHandler("Shop ID is invalid!", 400));
    }

    let shopInfo = [];

    // Process images
    if (images && images.length > 0) {
      console.log("Processing", images.length, "image(s)...", images);
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
        console.log("Processing4", imageInfo);
        shopInfo.push(imageInfo);
      }
    }

    // Process videos
    if (videos && videos.length > 0) {
      console.log("Processingv", videos.length, "videos(s)...", videos);
      for (let i = 0; i < videos.length; i++) {
        console.log("Processingv1", videos[i]);
        const videoLink = videos[i];
        const videoInfo = await ShopVideos.create({ shop: foundShop._id, video: videoLink });
        console.log("Processingv2", videoInfo);
        shopInfo.push(videoInfo);
      }
    }

    // Process post content
    if (postContent && postContent.trim() !== '') {
      console.log("Processingp", postContent.length, "post(s)...", postContent, postTitle, postTag);
      const postInfo = await ShopPosts.create({ shop: foundShop._id, postContent, postTitle, postTag });
      shopInfo.push(postInfo);
    }
    // Process post content
    if (homeContent && homeContent.trim() !== '') {
      console.log("Processingp", homeContent.length, "home(s)...", homeContent, homeTag);
      const postInfo = await ShopPosts.create({ shop: foundShop._id, homeContent, homeTag, postType: 'home' });
      shopInfo.push(postInfo);
    }
    // Process post content
    // if (shippingInputs) {
    //   console.log("Processingp", homeContent.length, "shippingInput(s)...", shippingInputs);
    //   const postInfo = await ShippingCost.create({ shop: foundShop._id, shippingInputs });
    //   shopInfo.push(postInfo);
    // }
    if (returnPolicy && returnPolicy.trim() !== '') {
      // console.log("Processingp", returnPolicy.length, "home(s)...", homeContent, homeTag);
      const postInfo = await ShopPosts.create({ shop: foundShop._id, returnPolicy, postType: 'return-policy' });
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

// Get shop info for multiple shop IDs
router.post(
  "/get-shops",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopIds = req.body; // Expecting an array of IDs in the request body
      console.log('shoppers', shopIds);
      const shops = await Shop.find({ _id: { $in: shopIds } });
      res.status(201).json({
        success: true,
        shops,
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
      console.log('existSeller', existsSeller);
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
      const { name, description, address, phoneNumber, country, location, workingHours, currency,accountType,supportEmail ,website,zipCode} = req.body;

      const shop = await Shop.findOne(req.seller._id);

      if (!shop) {
        return next(new ErrorHandler("User not found", 400));
      }

      shop.name = name;
      shop.description = description;
      shop.address = address;
      shop.phoneNumber = phoneNumber;
      shop.country = country;
      shop.location = location;
      shop.workingHours = workingHours;
      shop.currency = currency;
      shop.accountType = accountType;
      shop.supportEmail=supportEmail;
      shop.website=website; 
      shop.zipCode=zipCodeange;

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

// all sellers --- for header
router.get(
  "/all-sellers",
  // isAuthenticated,
  // isAdmin("Admin"),
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

// Get all shop posts
router.get(
  '/posts/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const ShopPost = await ShopPosts.find({ shop: req.params.id });

      if (!ShopPost) {
        return res.status(404).json({ success: false, message: 'Shop post not found' });
      }


      res.status(200).json({
        success: true,
        data: ShopPost,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);
// single blog post
router.get(
  '/single-post/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const ShopPost = await ShopPosts.find({ _id: req.params.id });

      if (!ShopPost) {
        return res.status(404).json({ success: false, message: 'Shop post not found' });
      }


      res.status(200).json({
        success: true,
        data: ShopPost,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);

// single blog post
router.get(
  '/home-post/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log('params', req.params.id);
      const homePost = await ShopPosts.findOne({ shop: req.params.id, postType: 'home' }).sort({ _id: -1 });

      console.log('params2', homePost);
      if (!homePost) {
        return res.status(404).json({ success: false, message: 'Home post not found' });
      }

      console.log('Home post', homePost);
      res.status(200).json({
        success: true,
        data: homePost,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);

// return-policy post
router.get(
  '/return-policy/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log('params', req.params.id);
      const returnPolicy = await ShopPosts.findOne({ shop: req.params.id, postType: 'return-policy' }).sort({ _id: -1 });

      if (!returnPolicy) {
        return res.status(404).json({ success: false, message: 'Home post not found' });
      }

      console.log('returnPolicy', returnPolicy);
      res.status(200).json({
        success: true,
        data: returnPolicy,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);
// Get all videos
router.get(
  "/videos/:id",
  catchAsyncErrors(async (req, res, next) => {

    try {
      const videos = await ShopVideos.find({ shop: req.params.id });

      if (!videos) {
        return next(new ErrorHandler("Videos doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        data: videos,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);


// Get all images
router.get(
  '/images/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const images = await ShopImages.find({ shop: req.params.id });
      if (!images) {
        return next(new ErrorHandler("Images doesn't exists", 400));
      }
      console.log('plasma', images, req.params.id);
      res.status(200).json({
        success: true,
        data: images,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);


// Get all shipping
router.get(
  '/shipping-setting/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shipping = await ShippingCost.find({
        shop: req.params.id,
        shippingInputs: { $ne: [] }, // Check if homepage array is not empty
        //  postType: 'shipping-costs' 
        //hometags: { $ne: [] }  // Check if hometags array is not empty
      });
      if (!shipping) {
        return next(new ErrorHandler("Shipping doesn't exists", 400));
      }
      console.log('plasma', shipping, req.params.id);
      res.status(200).json({
        success: true,
        data: shipping,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);
router.post(
  '/cart-shipping-setting',
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { cartData } = req.body;

      console.log('Received cartData:', cartData);

      // Ensure cartData is not empty and contains valid data
      if (!cartData || cartData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No cart data provided',
        });
      }

      // Extract shopIds and cartIds from cartData
      const shopIds = cartData.map((item) => item.shopId);
      const cartIds = cartData.map((item) => item.cartId);

      console.log('Extracted shopIds:', shopIds);
      console.log('Extracted cartIds:', cartIds);

      // Fetch shipping data based on shopIds and cartIds
      const shipping = await ShippingCost.find({
        shop: { $in: shopIds },
        'shippingInputs.allProducts.value': { $in: cartIds },
        shippingInputs: { $ne: [] }, // Check if shippingInputs array is not empty
      });

      console.log('Fetched shipping data:', shipping);

      // If shipping data is not found, return free shipping
      if (!shipping || shipping.length === 0) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No shipping data found, defaulting to free shipping',
        });
      }

      res.status(200).json({
        success: true,
        data: shipping,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



// Get Home Page Post
router.get(
  '/home-page-post/:id',
  catchAsyncErrors(async (req, res, next) => {
    try {

      const home = await ShopPosts.find({
        shop: req.params.id,
        homepage: { $ne: [] }, // Check if homepage array is not empty
        hometags: { $ne: [] },  // Check if hometags array is not empty
        postType: 'home'
      });
      if (!home) {
        return next(new ErrorHandler("Home Page doesn't exists", 400));
      }
      console.log('plasma', home, req.params.id);
      res.status(200).json({
        success: true,
        data: home,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 500));
    }
  })
);
// update post
router.put(
  "/update-post/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log('baby', req.body)
      const { postContent, postTitle, postTag } = req.body;

      const shop = await ShopPosts.findOne({ _id: req.params.id }); // Use findOne instead of find

      if (!shop) {
        return next(new ErrorHandler("Shop Post not found", 400));
      }

      shop.postContent = postContent;
      shop.postTitle = postTitle;
      shop.postTag = postTag;

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

// delete shipping
router.delete(
  "/delete-shipping-cost/:id",

  catchAsyncErrors(async (req, res, next) => {
    try {


      const shipping = await shippingCosts.findByIdAndDelete(req.params.id);
      if (!shipping) {
        return next(
          new ErrorHandler("Shipping is not available with this id", 400)
        );
      }
      res.status(201).json({
        success: true,
        message: "Shipping deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// update post
router.put(
  "/update-home-post/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log('baby', req.body, req.params)
      const { homeContent, homeTag } = req.body;
      const shop = await ShopPosts.findOne({ shop: req.params.id, postType: 'home' }).sort({ _id: -1 });;

      if (!shop) {
        return next(new ErrorHandler("Shop Home not found", 400));
      }

      shop.homeContent = homeContent;
      shop.homeTag = homeTag;

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

// delete post
router.delete(
  "/delete-post/:id",
  // isSeller,
  // isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {


      const post = await ShopPosts.findByIdAndDelete(req.params.id);
      if (!post) {
        return next(
          new ErrorHandler("Post is not available with this id", 400)
        );
      }
      res.status(201).json({
        success: true,
        message: "Post deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// update post
router.put(
  "/update-return-policy/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      // console.log('baby', req.body, req.params)
      const { returnPolicy } = req.body;
      const shop = await ShopPosts.findOne({ shop: req.params.id, postType: 'return-policy' }).sort({ _id: -1 });;

      if (!shop) {
        return next(new ErrorHandler("Return Policy not found", 400));
      }

      shop.returnPolicy = returnPolicy;

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
router.post(
  '/reauthenticate',
  // isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    let { sellerId, password } = req.body;
    console.log('reauthenticate', req.body);

    if (!sellerId || !password) {
      return next(new ErrorHandler('Please provide all fields', 400));
    }

    const seller = await Shop.findById(sellerId).select("+password");

    if (!seller) {
      return next(new ErrorHandler('User not found', 404));
    }

    console.log('reauthenticate2', seller);

    const isPasswordMatched = await seller.comparePassword(password);

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




// Suspend seller
router.put(
  '/suspend',
  catchAsyncErrors(async (req, res, next) => {
    const { reason, sellerId } = req.body;
   
    
    if (!reason || !sellerId) {
      return next(new ErrorHandler('Missing required fields', 400));
    }
  
    const seller = await Shop.findById(sellerId);
    
    seller.isSuspended = !seller.isSuspended;
    await seller.save();

    res.status(200).json({
      success: true,
      message: `Shop ${seller.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
    });
  })
);

// Delete seller account
router.delete(
  '/delete',
  catchAsyncErrors(async (req, res, next) => {

    const { reason, sellerId } = req.body;
   
    if (!reason || !sellerId) {
      return next(new ErrorHandler('Missing required fields', 400));
    }

    const seller = await Shop.findById(sellerId);
    if (!seller) {
      return next(new ErrorHandler('User not found', 404));
    }


    if (!seller) {
      return next(new ErrorHandler('User not found', 404));
    }

    seller.name = 'Deleted User';
    seller.email = `deleted_${seller.email}@example.com`;
    seller._id = `deleted_${seller._id}`;
    // seller.password = undefined; // or hash some default password
    // anonymize other sensitive fields as necessary
    await seller.save();

    res.status(200).json({
      success: true,
      message: 'Shop removed successfully',
    });


    // Optionally log the reason for deletion
    //await DeletionLog.create({ userId: user._id, reason });

    //await user.remove();

  }));


module.exports = router;
