console.log("RESEND KEY LOADED:", !!process.env.RESEND_API_KEY);
console.log("🚀 Server is starting...");

require("dotenv").config(); // MUST BE FIRST

const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
RESEND SETUP
========================= */
if (!process.env.RESEND_API_KEY) {
    console.error("❌ Missing RESEND_API_KEY in .env");
    process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* =========================
FRONTEND
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
TICKETS STORAGE
========================= */
function loadTickets() {
    try {
        if (!fs.existsSync("tickets.json")) return [];
        return JSON.parse(fs.readFileSync("tickets.json", "utf8"));
    } catch (err) {
        console.error("Load error:", err);
        return [];
    }
}

function saveTickets(tickets) {
    try {
        fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
    } catch (err) {
        console.error("Save error:", err);
    }
}

/* =========================
API ROUTE
========================= */
app.post("/api/ticket", async (req, res) => {
    console.log("📩 Ticket received");

    const ticket = req.body;

    if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    let tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    try {
        console.log("📧 Sending via Resend...");

        const result = await resend.emails.send({
            from: "Shack Support <onboarding@resend.dev>",
            to: process.env.RESEND_TO_EMAIL,
            subject: `New Ticket: ${ticket.subject}`,
            html: `
                <h2>New Ticket</h2>
                <p><b>ID:</b> ${ticket.id || "N/A"}</p>
                <p><b>Name:</b> ${ticket.name}</p>
                <p><b>Email:</b> ${ticket.email}</p>
                <p><b>Discord:</b> ${ticket.discord || "N/A"}</p>
                <p><b>Category:</b> ${ticket.category || "General"}</p>
                <h3>Description</h3>
                <p>${ticket.description}</p>
            `
        });
<p><b>Image:</b> ${ticket.image ? `<a href="${ticket.image}">View Image</a>` : "None"}</p>
        console.log("✅ Email sent:", result);

        return res.json({
            success: true,
            id: ticket.id
        });

    } catch (err) {
        console.error("❌ Resend error:", err);
        return res.status(500).json({ error: "Email failed via Resend" });
    }
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});