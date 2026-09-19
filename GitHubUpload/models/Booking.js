const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        bookingId: {
            type: String,
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            required: true
        },

        event: {
            type: String,
            required: true
        },

        eventName: {
            type: String,
            required: true
        },

        eventDate: {
            type: String,
            required: true
        },

        eventTime: {
            type: String,
            required: true
        },

        location: {
            type: String,
            required: true
        },

        ticketPrice: {
            type: Number,
            required: true
        },

        quantity: {
            type: Number,
            required: true
        },

        ticketQuantity: {
            type: Number,
            required: true
        },

        seats: {
            type: [String],
            required: true
        },

        seat: {
            type: String,
            required: true
        },

        totalAmount: {
            type: Number,
            required: true
        },

        bookingDate: {
            type: String,
            required: true
        },

        registrationTime: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Booking", bookingSchema);