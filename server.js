if (global.__SERVER_RUNNING__) {
    console.log("⚠️ Server already running - skipping duplicate init");
    process.exit(0);
}
global.__SERVER_RUNNING__ = true;

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
console.log("🔑 RESEND KEY EXISTS:", !!process.env.RESEND_API_KEY);
console.log("📧 RESEND TO:", process.env.RESEND_TO_EMAIL);

/* =========================
MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* =========================
RESEND INIT (SAFE)
========================= */
if (!process.env.RESEND_API_KEY) {
    console.error("❌ Missing RESEND_API_KEY");
    process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
FRONTEND
========================= */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
TICKET STORAGE
========================= */
function loadTickets() {
    try {
        if (!fs.existsSync("tickets.json")) return [];
        return JSON.parse(fs.readFileSync("tickets.json", "utf8"));
    } catch (err) {
        console.error("❌ Load error:", err);
        return [];
    }
}

function saveTickets(tickets) {
    try {
        fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
    } catch (err) {
        console.error("❌ Save error:", err);
    }
}

/* =========================
CREATE TICKET
========================= */
app.post("/api/ticket", async (req, res) => {
    console.log("📩 Ticket received");

    const ticket = req.body;

    if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
        return res.status(400).json({ error: "Missing fields" });
    }

    let tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    try {
        console.log("📧 Sending confirmation email...");

        const result = await resend.emails.send({
            from: "Shack Support <support@developershack.com>",
            to: process.env.RESEND_TO_EMAIL,
            subject: `[SPK-${ticket.id}] ${ticket.subject}`,
            replyTo: ticket.email,
            html: `
                <h2>New Shack Ticket</h2>
                <p><b>ID:</b> SPK-${ticket.id}</p>
                <p><b>Name:</b> ${ticket.name}</p>
                <p><b>Email:</b> ${ticket.email}</p>
                <h3>Description</h3>
                <p>${ticket.description}</p>
            `
        });

        console.log("📨 RESEND RESPONSE:", result);

        return res.json({
            success: true,
            id: ticket.id
        });

    } catch (err) {
        console.error("❌ RESEND FAILED:", err);
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

    if (!match) {
        console.log("❌ No ticket ID found");
        return res.status(200).send("OK");
    }

    const ticketId = match[0];

    let tickets = loadTickets();

    const ticket = tickets.find(t =>
        `SPK-${t.id}` === ticketId || t.id === ticketId
    );

    if (!ticket) {
        console.log("❌ Ticket not found");
        return res.status(200).send("OK");
    }

    ticket.messages = ticket.messages || [];

    ticket.messages.push({
        from: req.body.from,
        text: req.body["stripped-text"] || "",
        time: Date.now()
    });

    saveTickets(tickets);

    console.log("✅ Message stored for:", ticketId);

    res.status(200).send("OK");
});

/* =========================
START SERVER
========================= */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Server running on port ${PORT}`);
});