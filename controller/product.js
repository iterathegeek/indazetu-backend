const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");
const sharp = require('sharp');
const fs = require('fs');
const axios = require('axios');

const downloadImage = async (url) => {
  const response = await axios({
    url,
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data, 'binary');
};


router.post(
  "/create-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        let images = [];

        if (typeof req.body.images === "string") {
          images.push(req.body.images);
        } else {
          images = req.body.images;
        }

        const imagesLinks = [];

        // Ensure temp directory exists
        const tempDir = './temp/';
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir);
        }

        // Fetch watermark image from URL
        const watermarkUrl = 'https://indazetu.com/static/media/footer-removebg-preview.5143febfbbe3be17120f.png';
        const watermarkResponse = await axios({
          url: watermarkUrl,
          responseType: 'arraybuffer', // Get the image as a buffer
        });
        const watermarkBuffer = Buffer.from(watermarkResponse.data, 'binary');

        for (let i = 0; i < images.length; i++) {
          // Load the product image from base64
          const imageBuffer = Buffer.from(images[i].replace(/^data:image\/\w+;base64,/, ""), 'base64');

          // Add watermark and custom text to the processed image
          const watermarkedImagePath = `${tempDir}watermarked_${i}.png`;

          await sharp(imageBuffer)
            .composite([{ input: watermarkBuffer, gravity: 'southeast' }]) // Position watermark at bottom-right
            .png() // First add the watermark logo
            .toBuffer() // Create a buffer to work with further
            .then(async (bufferedImage) => {
              // Overlay text on the watermarked image
              await sharp(bufferedImage)
                .composite([{
                  input: Buffer.from(`
                  <svg width="500" height="150" xmlns="http://www.w3.org/2000/svg">
                  <text x="50%" y="50%" font-size="40" fill="white" font-family="Arial" stroke="black" stroke-width="1"
                        text-anchor="middle" dominant-baseline="middle">
                    ${shop.name}
                  </text>
                </svg>
                  `), // Customize this SVG for your text
                  gravity: 'center' // Adjust position, e.g., south for bottom, southeast for bottom-right
                }])
                .png()
                .toFile(watermarkedImagePath); // Save final image
            });

          // Upload watermarked image to Cloudinary
          const result = await cloudinary.v2.uploader.upload(watermarkedImagePath, {
            folder: "products",
          });

          imagesLinks.push({
            public_id: result.public_id,
            url: result.secure_url,
          });

          // Optionally, delete the local temporary file
          fs.unlinkSync(watermarkedImagePath);
        }

        let productData = req.body;

        // Log initial product data
        console.log('productData before modification:', productData);

        // Ensure shoppingOptions is defined
        if (!productData.shoppingOptions) {
          productData.shoppingOptions = {};
        }

        // Set cart and contact options
        if (productData.isCartChecked) {
          productData.shoppingOptions.cart = true;
        }
        if (req.body.isContactChecked) {
          productData.shoppingOptions.contact = true;
        }

        // Log modified product data
        console.log('productData after shoppingOptions modification:', productData);

        // Ensure imagesLinks is an array
        if (!imagesLinks || !Array.isArray(imagesLinks)) {
          console.error('imagesLinks is not defined or not an array.');
        } else {
          productData.images = imagesLinks;
        }

        // Log productData after adding images
        console.log('productData after images modification:', productData);

        const product = await Product.create(productData);
        console.log('Product successfully created:', product);

        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      console.error('Error occurred:', error); // Log the error for debugging
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product is not found with this id", 404));
      }

      for (let i = 0; 1 < product.images.length; i++) {
        const result = await cloudinary.v2.uploader.destroy(
          product.images[i].public_id
        );
      }

      await product.remove();

      res.status(201).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviewed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



module.exports = router;
