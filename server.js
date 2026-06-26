const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { Resend } = require("resend");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 Server starting...");
console.log("📂 CWD:", process.cwd());
console.log("🔑 RESEND KEY EXISTS:", !!process.env.RESEND_API_KEY);
console.log("📧 SUPPORT INBOX:", process.env.RESEND_TO_EMAIL);

/* =========================
VALIDATION
========================= */
let resend = null;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
} else {
    console.warn("⚠️ No RESEND_API_KEY set - email sending disabled");
}

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve public/ as the static folder
app.use(express.static(path.join(__dirname, "public")));

// ✅ Preserve existing /images URLs by serving the same files from public/
app.use("/images", express.static(path.join(__dirname, "public")));

/* =========================
FRONTEND ROUTE
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
    try {
        console.log("📩 Ticket received");

        const ticket = req.body;

        if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
            return res.status(400).json({ error: "Missing fields" });
        }

        let tickets = loadTickets();
        tickets.push(ticket);
        saveTickets(tickets);

        console.log("USER EMAIL:", ticket.email);

        if (resend) {
            /* =========================
            EMAIL - SUPPORT
            ========================= */
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

            /* =========================
            EMAIL - USER CONFIRMATION
            ========================== */
            await resend.emails.send({
                from: "Shack Support <onboarding@resend.dev>",
                to: ticket.email,
                subject: `[SPK-${ticket.id}] We received your ticket`,
                html: `
                    <h2>We got your ticket</h2>
                    <p>Your ticket ID is:</p>
                    <h3>SPK-${ticket.id}</h3>
                    <p>We will reply soon.</p>
                `
            });

            console.log("✅ BOTH EMAILS SENT");
        } else {
            console.warn("⚠️ Email sending skipped because RESEND_API_KEY is not configured");
        }

        return res.json({
            success: true,
            id: ticket.id
        });

    } catch (err) {
        console.error("❌ EMAIL ERROR:", err);
        return res.status(500).json({ error: "Email failed" });
    }
});

/* =========================
INBOUND EMAIL
========================= */
app.post("/api/inbound-email", (req, res) => {
    console.log("📩 EMAIL REPLY RECEIVED");

    const subject = req.body.subject || "";
    const match = subject.match(/SPK-\d+/);

    if (!match) return res.status(200).send("OK");

    const ticketId = match[0];

    let tickets = loadTickets();

    const ticket = tickets.find(t =>
        `SPK-${t.id}` === ticketId || t.id === ticketId
    );

    if (!ticket) return res.status(200).send("OK");

    ticket.messages = ticket.messages || [];

    ticket.messages.push({
        from: req.body.from,
        text: req.body["stripped-text"] || "",
        time: Date.now()
    });

    saveTickets(tickets);

    console.log("✅ Stored reply for:", ticketId);

    res.status(200).send("OK");
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});