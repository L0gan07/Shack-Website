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
LOGGING MIDDLEWARE (MUST BE FIRST)
========================= */
app.use((req, res, next) => {
    const time = new Date().toISOString();

    console.log(`\n📥 [${time}] Incoming Request`);
    console.log(`➡️ Method: ${req.method}`);
    console.log(`➡️ URL: ${req.url}`);
    console.log(`➡️ IP: ${req.ip}`);

    next();
});

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* =========================
FRONTEND ROUTE
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
TICKETS STORAGE (SAFE)
========================= */
function loadTickets() {
    try {
        if (!fs.existsSync("tickets.json")) return [];
        const data = fs.readFileSync("tickets.json", "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("❌ Error loading tickets:", err);
        return [];
    }
}

function saveTickets(tickets) {
    try {
        fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
    } catch (err) {
        console.error("❌ Error saving tickets:", err);
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
    console.log("📩 Ticket API called");
    console.log("📦 Body:", req.body);

    const ticket = req.body;

    // validation
    if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    let tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    console.log(`💾 Ticket saved: ${ticket.id}`);

    try {
        const ownerMail = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `New Ticket: ${ticket.id} - ${ticket.subject}`,
            text: `
New Ticket Received

ID: ${ticket.id}
Name: ${ticket.name}
Email: ${ticket.email}
Discord: ${ticket.discord || "N/A"}
Category: ${ticket.category || "General"}

Subject: ${ticket.subject}

Description:
${ticket.description}
            `
        };

        const userMail = {
            from: process.env.EMAIL_USER,
            to: ticket.email,
            subject: `DeveloperShack Ticket (${ticket.id})`,
            text: `
Hi ${ticket.name},

We received your ticket.

ID: ${ticket.id}
Subject: ${ticket.subject}

We will respond within 24–48 hours.

- Shack Support
            `
        };

        console.log("📧 Sending emails...");

        await transporter.sendMail(ownerMail);
        await transporter.sendMail(userMail);

        console.log("✅ Emails sent");

        return res.json({
            success: true,
            id: ticket.id
        });

    } catch (err) {
        console.error("❌ Email error:", err);
        return res.status(500).json({ error: "Email failed to send" });
    }
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});