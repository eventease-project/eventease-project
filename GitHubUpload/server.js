
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const Booking = require("./models/Booking");
const User = require("./models/User");

const app = express();

app.use(cors());
app.use(express.json());

// Serve EventEase website files
app.use(express.static(__dirname));

// Serve EventEase images
app.use("/images", express.static(__dirname + "/images"));

const PORT = process.env.PORT || 5000;

// Password hashing
function hashPassword(password, salt) {
    return crypto
        .pbkdf2Sync(password, salt, 100000, 64, "sha512")
        .toString("hex");
}

// Verify password safely
function verifyPassword(password, salt, storedHash) {
    const enteredHash = Buffer.from(
        hashPassword(password, salt),
        "hex"
    );

    const originalHash = Buffer.from(storedHash, "hex");

    return (
        enteredHash.length === originalHash.length &&
        crypto.timingSafeEqual(enteredHash, originalHash)
    );
}

// Home page
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// SIGN UP
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            password.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Enter your name, a valid email, and a password of at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered. Please log in."
            });
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const passwordHash = hashPassword(password, salt);

        const user = new User({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: passwordHash,
            passwordSalt: salt
        });

        await user.save();

        return res.status(201).json({
            success: true,
            message: "Account created successfully. Please log in."
        });

    } catch (error) {
        console.error("Signup error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered. Please log in."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Signup failed. Please try again."
        });
    }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (
            !user ||
            !verifyPassword(
                password,
                user.passwordSalt,
                user.passwordHash
            )
        ) {
            return res.status(401).json({
                success: false,
                message: "Incorrect email or password."
            });
        }

        const loginToken = crypto.randomBytes(32).toString("hex");

        user.loginToken = loginToken;
        user.loginTokenCreatedAt = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token: loginToken,
            user: {
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});

// GET CURRENT USER
app.get("/api/auth/me", async (req, res) => {
    try {
        const authorization = req.headers.authorization || "";
        const parts = authorization.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                success: false,
                message: "Please log in."
            });
        }

        const user = await User.findOne({
            loginToken: parts[1]
        }).select("name email");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid login session. Please log in again."
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Current user error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve your account."
        });
    }
});

// LOGOUT
app.post("/api/auth/logout", async (req, res) => {
    try {
        const authorization = req.headers.authorization || "";
        const parts = authorization.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(200).json({
                success: true,
                message: "Logged out."
            });
        }

        await User.updateOne(
            { loginToken: parts[1] },
            {
                $set: {
                    loginToken: null,
                    loginTokenCreatedAt: null
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });

    } catch (error) {
        console.error("Logout error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Logout failed. Please try again."
        });
    }
});

// Get booked seats for an event
app.get("/api/bookings/seats", async (req, res) => {
    try {
        const eventName = req.query.eventName;

        if (!eventName) {
            return res.status(400).json({
                success: false,
                message: "eventName is required"
            });
        }

        const bookings = await Booking.find({
            eventName: eventName
        }).select("seats -_id");

        const bookedSeats = bookings.flatMap(
            booking => booking.seats || []
        );

        return res.json({
            success: true,
            bookedSeats: [...new Set(bookedSeats)]
        });

    } catch (error) {
        console.error("Seat fetch error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch booked seats"
        });
    }
});

// Save booking to MongoDB
app.post("/api/bookings", async (req, res) => {
    try {
        const { eventName, seats } = req.body;

        if (
            !eventName ||
            !Array.isArray(seats) ||
            seats.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Event name and seats are required"
            });
        }

        // Check whether selected seats are already booked
        const existingBookings = await Booking.find({
            eventName: eventName,
            seats: { $in: seats }
        }).select("bookingId seats");

        if (existingBookings.length > 0) {
            const alreadyBookedSeats = [
                ...new Set(
                    existingBookings
                        .flatMap(booking => booking.seats || [])
                        .filter(seat => seats.includes(seat))
                )
            ];

            return res.status(409).json({
                success: false,
                message: "One or more selected seats are already booked.",
                bookedSeats: alreadyBookedSeats
            });
        }

        const booking = new Booking(req.body);
        const savedBooking = await booking.save();

        return res.status(201).json({
            success: true,
            message: "Booking saved successfully",
            booking: savedBooking
        });

    } catch (error) {
        console.error("Booking save error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to save booking"
        });
    }
});

// Get all bookings
app.get("/api/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            bookings: bookings
        });

    } catch (error) {
        console.error("Booking fetch error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookings"
        });
    }
});

// Delete all bookings
app.delete("/api/bookings", async (req, res) => {
    try {
        const result = await Booking.deleteMany({});

        return res.status(200).json({
            success: true,
            message: "All bookings deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error("Booking delete error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to delete bookings"
        });
    }
});

// MongoDB connection and server startup
if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Add it to your environment variables.");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });
