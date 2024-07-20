const express = require("express");
const { isCategoryOwner, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Category = require("../model/category");
const cloudinary = require("cloudinary");
const ErrorHandler = require("../utils/ErrorHandler");

// Create Category Route
router.post(
  "/create-category",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { title, subTitle, image_url, subcategories } = req.body;

      if (!title || !subTitle) {
        return next(new ErrorHandler("Please provide all required fields!", 400));
      }

      const categoryData = {
        title,
        subTitle,
        image_url,
        subcategories // Include subcategories data in the category model
      };

      const category = await Category.create(categoryData);

      res.status(201).json({
        success: true,
        category,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// Get All Categories Route
router.get("/get-all-categories", catchAsyncErrors(async (req, res, next) => {
  try {
    const categories = await Category.find();

    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Get Category by ID Route
router.get(
  "/get-category/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const category = await Category.findById(req.params.id);

      if (!category) {
        return next(new ErrorHandler("Category not found with this id", 404));
      }

      res.status(200).json({
        success: true,
        category,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Create Subcategory Route
router.post(
  "/create-subcategory",
  catchAsyncErrors(async (req, res, next) => {
    console.log('logs');
    try {
      const { categoryId, title, description } = req.body;

      const category = await Category.findById(categoryId);

      if (!category) {
        return next(new ErrorHandler("Category not found with this id", 404));
      }
      
      console.log("Category: ", category);
      
      // Ensure that subcategories property is initialized as an empty array
      if (!category.subcategories) {
        category.subcategories = [];
      }
      
      category.subcategories.push({ title,description });
      await category.save();
      
      res.status(201).json({
        success: true,
        category,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);

// Delete Subcategory Route
router.delete(
  "/delete-subcategory/:categoryId/:subcategoryId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { categoryId, subcategoryId } = req.params;

      const category = await Category.findById(categoryId);

      if (!category) {
        return next(new ErrorHandler("Category not found with this id", 404));
      }

      const subcategoryIndex = category.subcategories.findIndex(subcategory => subcategory._id.toString() === subcategoryId);

      if (subcategoryIndex === -1) {
        return next(new ErrorHandler("Subcategory not found with this id", 404));
      }

      category.subcategories.splice(subcategoryIndex, 1);
      await category.save();

      res.status(200).json({
        success: true,
        message: "Subcategory deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  })
);



// // Now, use these middleware functions in your route file
// router.put(
//   "/update-category/:id",
//   isCategoryOwner,
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       const { title, subTitle, image_url } = req.body;

//       if (!title || !subTitle) {
//         return next(new ErrorHandler("Please provide all required fields!", 400));
//       }

//       const category = await Category.findByIdAndUpdate(
//         req.params.id,
//         { title, subTitle, image_url },
//         { new: true, runValidators: true }
//       );

//       if (!category) {
//         return next(new ErrorHandler("Category not found with this id", 404));
//       }

//       await category.save();

//       res.status(200).json({
//         success: true,
//         category,
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error.message, 400));
//     }
//   })
// );

// // delete category
// router.delete(
//   "/delete-category/:id",
//   isCategoryOwner,
//   catchAsyncErrors(async (req, res, next) => {
//     try {
//       const category = await Category.findById(req.params.id);

//       if (!category) {
//         return next(new ErrorHandler("Category not found with this id", 404));
//       }

//       await category.remove();

//       res.status(200).json({
//         success: true,
//         message: "Category deleted successfully!",
//       });
//     } catch (error) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   })
// );

module.exports = router;
