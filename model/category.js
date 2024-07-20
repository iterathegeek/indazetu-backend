const mongoose = require("mongoose");


const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please enter your Category name!"],
  },

  subTitle: {
    type: String,
  },
  image_Url: {
    type: String,
  },
  subcategories: {
    type: Array
  }

});

module.exports = mongoose.model("Category", categorySchema);
