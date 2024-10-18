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
          // Process the image with watermark and text overlay
          await processImageWithWatermark(
            imageBuffer,
            watermarkBuffer,
            shop.name,
            watermarkedImagePath
          );

          // Upload watermarked image to Cloudinary
          const result = await cloudinary.v2.uploader.upload(watermarkedImagePath, {
            folder: "products",
            compression: "lossless", // Set compression to lossless
            // width: 800, // Desired width
            // height: 600, // Desired height
            crop: "fit", // Cropping mode
            gravity: "center" // Gravity parameter
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
        return next(new ErrorHandler("Product not found with this id", 404));
      }

      console.log('Product found:', product);

      // Deleting all associated images from Cloudinary
      for (let i = 0; i < product.images.length; i++) {
        const image = product.images[i];

        // Check if public_id exists before attempting to delete
        if (image.public_id) {
          await cloudinary.v2.uploader.destroy(image.public_id);
          console.log(`Deleted image with public_id: ${image.public_id}`);
        }
      }

      // Now delete the product from the database
      await product.deleteOne(); // Replacing .remove() with .deleteOne()

      // Send success response
      res.status(201).json({
        success: true,
        message: "Product deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      return next(new ErrorHandler(error.message || "Failed to delete product", 400));
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

/**
 * Function to process an image with both an image watermark and a text overlay.
 * @param {Buffer} imageBuffer - The buffer of the base image.
 * @param {Buffer} watermarkBuffer - The buffer of the watermark image.
 * @param {String} shopName - The name of the shop to be used in the text watermark.
 * @param {String} outputPath - The output path for the watermarked image.

 */ const processImageWithWatermark = async (imageBuffer, watermarkBuffer, shopName, outputPath) => {
  try {
    // Load the base image using sharp
    const baseImage = sharp(imageBuffer);
    const baseMetadata = await baseImage.metadata();

    // Set the desired maximum dimensions for resizing the base image
    const MAX_WIDTH = 800; // You can adjust this
    const MAX_HEIGHT = 600; // You can adjust this

    // Calculate the new dimensions while maintaining aspect ratio
    let width = baseMetadata.width;
    let height = baseMetadata.height;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const aspectRatio = width / height;
      if (width > height) {
        width = MAX_WIDTH;
        height = Math.floor(MAX_WIDTH / aspectRatio);
      } else {
        height = MAX_HEIGHT;
        width = Math.floor(MAX_HEIGHT * aspectRatio);
      }
    }

    // If dimensions are smaller than MAX_WIDTH and MAX_HEIGHT, use the original dimensions
    const finalWidth = baseMetadata.width < MAX_WIDTH ? baseMetadata.width : width;
    const finalHeight = baseMetadata.height < MAX_HEIGHT ? baseMetadata.height : height;


    // Calculate watermark dimensions to be at most 30% of the base image
    const watermarkMaxWidth = Math.floor(width * 0.3);
    const watermarkMaxHeight = Math.floor(height * 0.3);

    // Resize the watermark to fit within the calculated 30% size
    const resizedWatermarkBuffer = await sharp(watermarkBuffer)
      .resize({
        width: watermarkMaxWidth,
        height: watermarkMaxHeight,
        fit: 'inside', // Ensure aspect ratio is maintained
      })
      .toBuffer();

    // Composite the watermark onto the resized base image
    // Resize the base image only if necessary
    const watermarkedImageBuffer = await baseImage
      .resize(finalWidth, finalHeight, { fit: 'contain' }) // Only resize if necessary
      .composite([{
        input: resizedWatermarkBuffer,
        gravity: 'southeast', // Position watermark at bottom-right corner
        blend: 'over',
        opacity: 0.7
      }])
      .toBuffer();


    // Save or upload the watermarked image
    // await sharp(watermarkedImageBuffer)
    //   .png({
    //     quality: 80, // Compression quality (adjust between 50-90)
    //     compressionLevel: 9 // Maximum compression level
    //   })
    //   .toFile(outputPath);
    await sharp(watermarkedImageBuffer)
  .jpeg({
    quality: 80, // Adjust JPEG quality to balance size and quality
    progressive: true, // Progressive rendering for faster loading
  })
  .toFile(outputPath);


    console.log('Image processed and saved with watermark');
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

router.put('/update-product/:id', async (req, res) => {
  try {
    const shopId = req.body.shopId;
    const shop = await Shop.findById(shopId);

    // Find the product by id
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

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

    const imagesLinks = [];

    // Ensure temp directory exists
    const tempDir = './temp/';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Fetch watermark image from URL and convert to buffer
    const watermarkUrl = 'https://indazetu.com/static/media/footer-removebg-preview.5143febfbbe3be17120f.png';
    const watermarkResponse = await axios({
      url: watermarkUrl,
      responseType: 'arraybuffer',
    });
    const watermarkBuffer = Buffer.from(watermarkResponse.data, 'binary');

    for (let i = 0; i < images.length; i++) {
      if (images[i].startsWith('data:image/')) {
        // Convert base64 image to buffer
        const base64Image = images[i];
        const imageBuffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        const watermarkedImagePath = `${tempDir}watermarked_${i}.png`;


        // Process the image with the watermark
        await processImageWithWatermark(
          imageBuffer,
          watermarkBuffer,
          shop.name,
          watermarkedImagePath
        );

        const baseImage = sharp(imageBuffer);
        const baseMetadata = await baseImage.metadata();
        // Upload to Cloudinary with lossless compression
        const result = await cloudinary.v2.uploader.upload(watermarkedImagePath, {
          folder: "products",
          format: "jpg", // Force JPEG format for smaller sizes
          transformation: [
            baseMetadata.width > 800 || baseMetadata.height > 600
              ? { width: 800, height: 600, crop: "fit" }
              : {},
            { quality: "auto:eco" }
          ],
        });
        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
        });

        // Remove the temporary watermarked image file
        fs.unlinkSync(watermarkedImagePath);

      } else if (images[i].startsWith('https://res.cloudinary.com')) {
        // If the image is already hosted on Cloudinary, just reuse the existing link
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

    res.status(200).json({
      success: true,
      product: updatedProduct,
      message: "Product updated successfully!",
    });

  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Server Error' });
  }
}); module.exports = router;
