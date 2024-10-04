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
      console.log('Received product data:', req.body);

      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);

      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      }

      let images = [];

      if (typeof req.body.images === "string") {
        images.push(req.body.images);
      } else {
        images = req.body.images;
      }

      const imagesLinks = [];
      const tempDir = './temp/';

      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      // Fetch watermark image from a URL
      const watermarkUrl = 'https://indazetu.com/static/media/footer-removebg-preview.5143febfbbe3be17120f.png';
      const watermarkResponse = await axios({
        url: watermarkUrl,
        responseType: 'arraybuffer', // Get the image as a buffer
      });
      const watermarkBuffer = Buffer.from(watermarkResponse.data, 'binary');
      for (let i = 0; i < images.length; i++) {
        const base64Image = images[i];

        // Convert base64 image to buffer
        const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const watermarkedImagePath = `${tempDir}watermarked_${i}.png`;

       
        try {
          // Resize the image to a maximum width and height if it's too large
          const resizedImageBuffer = await sharp(imageBuffer)
            .resize({
              width: 2000,   // Set max width
              height: 2000,  // Set max height
              fit: 'inside', // Ensure the image fits within these dimensions while maintaining the aspect ratio
            })
            .toBuffer();

          // Now proceed with adding the watermark to the resized image
          const resizedWatermarkedImageBuffer = await sharp(resizedImageBuffer)
            .composite([{ input: watermarkBuffer, gravity: 'southeast' }]) // Position watermark
            .png()
            .toBuffer();

          // Further process the image (e.g., add text overlay or upload to Cloudinary)
          await sharp(resizedWatermarkedImageBuffer)
            .composite([{
              input: Buffer.from(`
        <svg width="500" height="150" xmlns="http://www.w3.org/2000/svg">
          <text x="50%" y="50%" font-size="40" fill="white" font-family="Arial" stroke="black" stroke-width="1"
                text-anchor="middle" dominant-baseline="middle">
            ${shop.name}
          </text>
        </svg>
        `),
              gravity: 'center',
            }])
            .png()
            .toFile(watermarkedImagePath);  // Save final image

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

        } catch (error) {
          console.error('Error processing image with sharp:', error);
          throw new Error('Image processing failed');
        }
      }

      // Prepare the product data for saving
      let productData = req.body;

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

      // Attach processed images to product data
      productData.images = imagesLinks;

      // Create the product in the database
      const product = await Product.create(productData);

      console.log('Product successfully created:', product);

      // Respond with success
      res.status(201).json({
        success: true,
        product,
      });

    } catch (error) {
      console.error('Error occurred:', error); // Log the error for debugging
      return next(new ErrorHandler(error.message, 400));
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

// get all products of a shop
router.get(
  "/get-product-details/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return next(new ErrorHandler("Product is not found with this id", 404));
      }


      res.status(201).json({
        success: true,
        product,
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

router.put(
  "/update-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) {
        return next(new ErrorHandler("Shop not found", 404));
      }

      const updatedData = {
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        location: req.body.location,
        workingHours: req.body.workingHours,
        country: req.body.country,
        accountType: req.body.accountType,
        avatar: req.body.avatar,
        banner: req.body.banner,
      };

      // Updating the shop with the provided data
      const updatedShop = await Shop.findByIdAndUpdate(req.params.id, updatedData, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        success: true,
        message: "Shop updated successfully!",
        shop: updatedShop,
      });
    } catch (error) {
      return next(new ErrorHandler("Error updating shop details", 500));
    }
  })
);

// Update product route
// router.put('/update-product/:id', async (req, res) => {
//   const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
//   res.json(product);
// });
router.put('/update-product/:id', async (req, res) => {
  try {

    const shopId = req.body.shopId;
    const shop = await Shop.findById(shopId);
    // Find the product by id
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

    console.log('existing',existingProduct);

    // Delete old images from Cloudinary
    if (existingProduct.images && existingProduct.images.length > 0) {
      for (let img of existingProduct.images) {
        if (img.public_id) {
          await cloudinary.v2.uploader.destroy(img.public_id);
        }
      }
    }

    // Process new images
    let images = [];
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else {
      images = req.body.images || [];
    }


    console.log('existing images',images);
    const imagesLinks = [];

    // Ensure temp directory exists
    const tempDir = './temp/';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const watermarkUrl = 'https://indazetu.com/static/media/footer-removebg-preview.5143febfbbe3be17120f.png';
    const watermarkResponse = await axios({
      url: watermarkUrl,
      responseType: 'arraybuffer',
    });
    const watermarkBuffer = Buffer.from(watermarkResponse.data, 'binary');

    for (let i = 0; i < images.length; i++) {
      if (images[i].startsWith('data:image/')) {
        const imageBuffer = Buffer.from(images[i].replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const watermarkedImagePath = `${tempDir}watermarked_${i}.png`;
        console.log('imageBuffer',imageBuffer)

        await sharp(imageBuffer)
          .composite([{ input: watermarkBuffer, gravity: 'southeast' }])
          .png()
          .toBuffer()
          .then(async (bufferedImage) => {
            await sharp(bufferedImage)
              .composite([{
                input: Buffer.from(`
                  <svg width="500" height="150" xmlns="http://www.w3.org/2000/svg">
                  <text x="50%" y="50%" font-size="40" fill="white" font-family="Arial" stroke="black" stroke-width="1"
                        text-anchor="middle" dominant-baseline="middle">
                    ${shop?.name }
                  </text>
                </svg>
                  `),
                gravity: 'center'
              }])
              .png()
              .toFile(watermarkedImagePath);
          });

        const result = await cloudinary.v2.uploader.upload(watermarkedImagePath, {
          folder: "products",
        });

        console.log('result',result);

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });

        fs.unlinkSync(watermarkedImagePath);
      } else if (images[i].startsWith('https://res.cloudinary.com')) {
        const public_id = images[i].split('/').pop().split('.')[0];
        imagesLinks.push({
          public_id: public_id,
          url: images[i],
        });
      }
    }

    let productData = req.body;

    // Replace old images with new ones
    productData.images = imagesLinks;

    // Update the product in the database
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { ...productData, images: imagesLinks },
      { new: true }
    );
    
    console.log('Updated Product:', updatedProduct);
    

    res.status(200).json({
      success: true,
      product: updatedProduct,
      message: "Product Update successful!",
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
