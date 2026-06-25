console.log("🚀 Server is starting...");

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

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
FRONTEND ROUTE
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
TICKETS STORAGE
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
API ROUTE
========================= */
app.post("/api/ticket", async (req, res) => {
    try {
        console.log("📩 Ticket received:", req.body);

        const ticket = req.body;

        // validation
        if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // save ticket
        const tickets = loadTickets();
        tickets.push(ticket);
        saveTickets(tickets);

        console.log(`💾 Ticket saved: ${ticket.id}`);

        // EMAIL (Resend)
        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to: process.env.EMAIL_FROM,
                subject: `New Ticket: ${ticket.id} - ${ticket.subject}`,
                html: `
                    <h2>New Ticket Received</h2>
                    <p><b>ID:</b> ${ticket.id}</p>
                    <p><b>Name:</b> ${ticket.name}</p>
                    <p><b>Email:</b> ${ticket.email}</p>
                    <p><b>Discord:</b> ${ticket.discord || "N/A"}</p>
                    <p><b>Category:</b> ${ticket.category || "General"}</p>
                    <p><b>Description:</b><br>${ticket.description}</p>
                `
            });

            await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to: ticket.email,
                subject: `We received your ticket (${ticket.id})`,
                html: `
                    <p>Hi ${ticket.name},</p>
                    <p>We received your ticket.</p>
                    <p><b>ID:</b> ${ticket.id}</p>
                    <p>We will respond within 24–48 hours.</p>
                    <br>
                    <p>- Shack Support</p>
                `
            });

            console.log("📧 Emails sent via Resend");

        } catch (emailErr) {
            console.error("⚠️ Email failed (non-blocking):", emailErr);
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