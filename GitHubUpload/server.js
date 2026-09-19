
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Booking = require("./models/Booking");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Home test
app.get("/", (req, res) => {
    res.send("EventEase server is running");
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

        const bookedSeats =
            bookings.flatMap(booking => booking.seats || []);

        res.json({
            success: true,
            bookedSeats: [...new Set(bookedSeats)]
        });

    } catch (error) {

        console.error(
            "Seat fetch error:",
            error.message
        );

        res.status(500).json({
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

        // Check if selected seats are already booked
        const existingBookings =
            await Booking.find({
                eventName: eventName,
                seats: { $in: seats }
            }).select("bookingId seats");

        if (existingBookings.length > 0) {

            const alreadyBookedSeats = [
                ...new Set(
                    existingBookings
                        .flatMap(
                            booking => booking.seats || []
                        )
                        .filter(
                            seat => seats.includes(seat)
                        )
                )
            ];

            return res.status(409).json({
                success: false,
                message:
                    "One or more selected seats are already booked.",
                bookedSeats: alreadyBookedSeats
            });
        }

        const booking =
            new Booking(req.body);

        const savedBooking =
            await booking.save();

        res.status(201).json({
            success: true,
            message: "Booking saved successfully",
            booking: savedBooking
        });

    } catch (error) {

        console.error(
            "Booking save error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to save booking",
            error: error.message
        });
    }
});

// Get all bookings
app.get("/api/bookings", async (req, res) => {
    try {

        const bookings =
            await Booking.find()
                .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            bookings: bookings
        });

    } catch (error) {

        console.error(
            "Booking fetch error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch bookings"
        });
    }
});

// Delete all bookings
app.delete("/api/bookings", async (req, res) => {
    try {

        const result =
            await Booking.deleteMany({});

        res.status(200).json({
            success: true,
            message: "All bookings deleted successfully",
            deletedCount: result.deletedCount
        });

    } catch (error) {

        console.error(
            "Booking delete error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete bookings"
        });
    }
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {

        console.log(
            "MongoDB connected successfully"
        );

        app.listen(PORT, () => {

            console.log(
                `Server running on port ${PORT}`
            );

        });

    })
    .catch((error) => {

        console.error(
            "MongoDB connection failed:",
            error.message
        );

    });
