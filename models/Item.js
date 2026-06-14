const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
    itemName:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    location:{
        type:String,
        required:true
    },
    type:{
        type:String,
        required:true
    },
    status:{
        type:String,
        default:"Active"
    },
    image:{
        type:String, // Holds Base64 encoding string
        default: ""
    },
    owner:{
        type:String
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

module.exports = mongoose.model("Item",ItemSchema);