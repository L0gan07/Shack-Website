const form = document.getElementById("ticketForm");
const responseMessage = document.getElementById("responseMessage");
const button = form.querySelector("button");

function generateTicketID() {
    return "SPK-" + Math.floor(1000 + Math.random() * 9000);
}

/* =========================
   IMAGE PREVIEW (FIXED)
========================= */
window.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("imageUpload");
    const preview = document.getElementById("preview");

    if (input && preview) {
        input.addEventListener("change", function () {
            const file = this.files[0];

            if (!file) return;

            preview.src = URL.createObjectURL(file);
            preview.style.display = "block";
        });
    }
});

/* =========================
   FORM SUBMIT + UPLOAD
========================= */
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const file = document.getElementById("imageUpload").files[0];

        let imageURL = null;

        // Upload image first
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "tickets");

            const uploadRes = await fetch(
                "https://api.cloudinary.com/v1_1/dfvureiis/image/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const uploadData = await uploadRes.json();
            imageURL = uploadData.secure_url;

            console.log("Uploaded image:", imageURL);
        }

        // Build ticket
        const ticketData = {
            id: generateTicketID(),
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            discord: document.getElementById("discord").value,
            category: document.getElementById("category").value,
            subject: document.getElementById("subject").value,
            description: document.getElementById("description").value,
            image: imageURL
        };

        // Validation
        if (!ticketData.name || !ticketData.email || !ticketData.subject || !ticketData.description) {
            responseMessage.textContent = "Please fill in all required fields.";
            responseMessage.style.color = "red";

            button.disabled = false;
            button.textContent = "Submit Ticket";
            return;
        }

        const res = await fetch("http://localhost:3000/api/ticket", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(ticketData)
        });

        const data = await res.json();

        if (res.ok) {
            responseMessage.textContent = `Ticket Created Successfully! ID: ${data.id}`;
            responseMessage.style.color = "rgb(150,201,201)";
            form.reset();

            const preview = document.getElementById("preview");
            if (preview) preview.style.display = "none";

        } else {
            responseMessage.textContent = data.error || "Something went wrong.";
            responseMessage.style.color = "red";
        }

    } catch (err) {
        responseMessage.textContent = "Server not reachable.";
        responseMessage.style.color = "red";
    }

    button.disabled = false;
    button.textContent = "Submit Ticket";
});