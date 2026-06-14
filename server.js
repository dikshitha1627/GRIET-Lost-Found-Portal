const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Item = require("./models/Item");

const app = express();

// Increased payload limit to support base64 image strings safely
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/griet_lost_found")
.then(() => {
    console.log("MongoDB Connected Successfully");
})
.catch((err) => {
    console.log("Database connection error: ", err);
});

const SECRET = "griet_secret_key";

/* ==========================
   AUTHENTICATION MIDDLEWARE
========================== */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ success: false, message: "Access token missing" });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Token invalid or expired" });
        req.user = user;
        next();
    });
};

/* ==========================
   REGISTER
========================== */
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.json({ success: false, message: "User Already Exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();

        res.json({ success: true, message: "Registered Successfully" });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Registration Failed" });
    }
});

/* ==========================
   LOGIN
========================== */
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User Not Found" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.json({ success: false, message: "Wrong Password" });
        }

        const token = jwt.sign({ email: user.email, name: user.name }, SECRET);

        res.json({
            success: true,
            token,
            user: user.name
        });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Login Failed" });
    }
});

/* ==========================
   ADD ITEM
========================== */
app.post("/add-item", authenticateToken, async (req, res) => {
    try {
        const { itemName, category, description, location, type, image } = req.body;
        
        const item = new Item({
            itemName,
            category,
            description,
            location,
            type,
            image: image || "", // Store base64 image string optionally
            owner: req.user.email,
            status: "Active"
        });

        await item.save();
        res.json({ success: true, message: "Item Reported Successfully" });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Failed To Add Item" });
    }
});

/* ==========================
   GET ITEMS
========================== */
app.get("/items", async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.log(err);
        res.json([]);
    }
});

/* ==========================
   UPDATE STATUS (CLAIM ITEM)
========================== */
app.put("/items/claim/:id", authenticateToken, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.json({ success: false, message: "Item not found" });

        item.status = "Claimed";
        await item.save();

        res.json({ success: true, message: "Item status marked as Claimed!" });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Update status failed" });
    }
});

/* ==========================
   DELETE ITEM
========================== */
app.delete("/delete/:id", authenticateToken, async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.json({ success: false, message: "Item not found" });

        // Ensure user can only delete their own listing
        if (item.owner !== req.user.email) {
            return res.json({ success: false, message: "Unauthorized deletion attempt" });
        }

        await Item.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Deleted Successfully" });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: "Delete Failed" });
    }
});

app.listen(3000, () => {
    console.log("Server Running On Port 3000");
});