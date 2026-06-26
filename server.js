const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");
require("dotenv").config({ path: "/root/Shack-Website/.env" });

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 Server starting...");
console.log("📂 CWD:", __dirname);

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ THIS IS THE IMPORTANT FIX
app.use(express.static(path.join(__dirname, "public")));

/* =========================
HOME
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
TICKETS
========================= */
function loadTickets() {
    if (!fs.existsSync("tickets.json")) return [];
    return JSON.parse(fs.readFileSync("tickets.json", "utf8"));
}

function saveTickets(tickets) {
    fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
}

/* =========================
CREATE TICKET
========================= */
app.post("/api/ticket", async (req, res) => {
    const ticket = req.body;

    if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
        return res.status(400).json({ error: "Missing fields" });
    }

    let tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    try {
        await resend.emails.send({
            from: "Shack Support <onboarding@resend.dev>",
            to: process.env.RESEND_TO_EMAIL,
            subject: `[SPK-${ticket.id}] ${ticket.subject}`,
            replyTo: ticket.email,
            html: `<p>New ticket SPK-${ticket.id}</p>`
        });

        await resend.emails.send({
            from: "Shack Support <onboarding@resend.dev>",
            to: ticket.email,
            subject: `[SPK-${ticket.id}] We received your ticket`,
            html: `<h3>Ticket ID: SPK-${ticket.id}</h3>`
        });

        return res.json({ success: true, id: ticket.id });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Email failed" });
    }
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});