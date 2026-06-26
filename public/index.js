require("dotenv").config({ path: "/root/Shack-Website/.env" });

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 Server starting...");
console.log("📂 CWD:", process.cwd());

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ THIS IS THE IMPORTANT FIX
app.use(express.static(path.join(__dirname, "public")));

/* =========================
FRONTEND ROUTES
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
TICKETS STORAGE
========================= */
function loadTickets() {
    if (!fs.existsSync("tickets.json")) return [];
    return JSON.parse(fs.readFileSync("tickets.json", "utf8"));
}

function saveTickets(tickets) {
    fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
}

/* =========================
EMAIL (RESEND)
========================= */
if (!process.env.RESEND_API_KEY) {
    console.error("❌ Missing RESEND_API_KEY");
    process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
CREATE TICKET
========================= */
app.post("/api/ticket", async (req, res) => {
    try {
        const ticket = req.body;

        if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
            return res.status(400).json({ error: "Missing fields" });
        }

        let tickets = loadTickets();
        tickets.push(ticket);
        saveTickets(tickets);

        console.log("📩 Ticket received:", ticket.id);

        await resend.emails.send({
            from: "Shack Support <onboarding@resend.dev>",
            to: process.env.RESEND_TO_EMAIL,
            subject: `[SPK-${ticket.id}] ${ticket.subject}`,
            replyTo: ticket.email,
            html: `
                <h2>New Ticket</h2>
                <p><b>ID:</b> SPK-${ticket.id}</p>
                <p><b>Name:</b> ${ticket.name}</p>
                <p><b>Email:</b> ${ticket.email}</p>
                <p><b>Description:</b> ${ticket.description}</p>
            `
        });

        await resend.emails.send({
            from: "Shack Support <onboarding@resend.dev>",
            to: ticket.email,
            subject: `[SPK-${ticket.id}] We received your ticket`,
            html: `
                <h2>We got your ticket</h2>
                <p>Your ticket ID is:</p>
                <h3>SPK-${ticket.id}</h3>
            `
        });

        return res.json({ success: true, id: ticket.id });

    } catch (err) {
        console.error("❌ EMAIL ERROR:", err);
        return res.status(500).json({ error: "Email failed" });
    }
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});