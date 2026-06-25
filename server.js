console.log("🚀 Server is starting...");

const express = require("express");
const nodemailer = require("nodemailer");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
    console.log(`\n📥 ${req.method} ${req.url}`);
    next();
});

/* =========================
FRONTEND
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
TICKETS DB
========================= */
const TICKET_FILE = "tickets.json";

function loadTickets() {
    try {
        if (!fs.existsSync(TICKET_FILE)) return [];
        return JSON.parse(fs.readFileSync(TICKET_FILE, "utf8"));
    } catch (err) {
        console.error("❌ Load error:", err);
        return [];
    }
}

function saveTickets(tickets) {
    try {
        fs.writeFileSync(TICKET_FILE, JSON.stringify(tickets, null, 2));
    } catch (err) {
        console.error("❌ Save error:", err);
    }
}

/* =========================
EMAIL SETUP
========================= */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/* =========================
API ROUTE
========================= */
app.post("/api/ticket", async (req, res) => {

    try {
        console.log("📩 Ticket received:", req.body);

        const ticket = req.body;

        if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let tickets = loadTickets();
        tickets.push(ticket);
        saveTickets(tickets);

        console.log(`💾 Saved ticket ${ticket.id}`);

        // EMAIL (non-blocking failure protection)
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: `Ticket ${ticket.id} - ${ticket.subject}`,
                text: JSON.stringify(ticket, null, 2)
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: ticket.email,
                subject: `We received your ticket (${ticket.id})`,
                text: `Hi ${ticket.name}, we received your ticket. We'll respond soon.`
            });

            console.log("📧 Emails sent");
        } catch (emailErr) {
            console.error("⚠️ Email failed:", emailErr);
        }

        return res.json({
            success: true,
            id: ticket.id
        });

    } catch (err) {
        console.error("❌ Server error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});