console.log("Server is starting...");

const express = require("express");
const nodemailer = require("nodemailer");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* =========================
   SERVE FRONTEND FILES
========================= */
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   TICKETS STORAGE
========================= */
function loadTickets() {
    try {
        const data = fs.readFileSync("tickets.json");
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveTickets(tickets) {
    fs.writeFileSync("tickets.json", JSON.stringify(tickets, null, 2));
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
    const ticket = req.body;

    if (!ticket.name || !ticket.email || !ticket.subject || !ticket.description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    let tickets = loadTickets();
    tickets.push(ticket);
    saveTickets(tickets);

    const ownerMail = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New Ticket: ${ticket.id} - ${ticket.subject}`,
        text: `
New Support Ticket Received

ID: ${ticket.id}
Name: ${ticket.name}
Email: ${ticket.email}
Discord: ${ticket.discord || "N/A"}
Category: ${ticket.category}

Subject: ${ticket.subject}

Description:
${ticket.description}
        `
    };

    const userMail = {
        from: process.env.EMAIL_USER,
        to: ticket.email,
        subject: `Sparks Support Ticket Received (${ticket.id})`,
        text: `
Hello ${ticket.name},

We have received your support request.

Ticket ID: ${ticket.id}
Category: ${ticket.category}
Subject: ${ticket.subject}

Our team will respond as soon as possible.

- Sparks Development
        `
    };

    try {
        await transporter.sendMail(ownerMail);
        await transporter.sendMail(userMail);

        res.json({
            success: true,
            id: ticket.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Email failed to send" });
    }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
