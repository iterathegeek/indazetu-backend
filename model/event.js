const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter your event product name!"],
    },
    description: {
        type: String,
        required: [true, "Please enter your event product description!"],
    },
    category: {
        type: String,
        required: [true, "Please enter your event product category!"],
    },
 
    tags: {
        type: Array,
    },
    selectedColor: {
        type: String,
    },
    packaging: {
        type: Object,
    },
    priceInput: {
        type: Object,
        required: [true, "Please enter your product price!"],
    },
    samplePriceInput: {
        type: Object,
        required: [true, "Please enter your sample product price!"],
    },
    stock: {
        type: Number,
        required: [true, "Please enter your product stock!"],
    },
    start_Date: {
        type: Date,
        required: true,
    },
    Finish_Date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        default: "Running",
    },
    category: {
        type: String,
        required: [true, "Please enter your product category!"],
    },
    tags: {
        type: Array,
    },
    selectedColor: {
        type: String,
    },
    packaging: {
        type: Object,
    },
    priceInput: {
        type: Object,
        required: [true, "Please enter your product price!"],
    },
    samplePriceInput: {
        type: Object,
        required: [true, "Please enter your sample product price!"],
    },
    stock: {
        type: Number,
        required: [true, "Please enter your product stock!"],
    },
    images: [
        {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            },
        },
    ],
    shopId: {
        type: String,
        required: true,
    },
    shop: {
        type: Object,
        required: true,
    },
    sold_out: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    }
});

module.exports = mongoose.model("Event", eventSchema);