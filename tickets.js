const form = document.getElementById("ticketForm");
const responseMessage = document.getElementById("responseMessage");
const button = form.querySelector("button");

function generateTicketID() {
    return "SPK-" + Math.floor(1000 + Math.random() * 9000);
}

/* =========================
IMAGE PREVIEW
========================= */
window.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("imageUpload");
    const preview = document.getElementById("preview");

    if (input && preview) {
        input.addEventListener("change", () => {
            const file = input.files[0];
            if (!file) return;

            preview.src = URL.createObjectURL(file);
            preview.style.display = "block";
        });
    }
});

/* =========================
FORM SUBMIT
========================= */
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    button.disabled = true;
    button.textContent = "Submitting...";

    try {
        const file = document.getElementById("imageUpload").files[0];
        let imageURL = null;

        /* Upload image */
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

            if (!uploadData.secure_url) {
                throw new Error("Image upload failed");
            }

            imageURL = uploadData.secure_url;
            console.log("📸 Uploaded image:", imageURL);
        }

        /* Build ticket */
        const ticketData = {
            id: generateTicketID(),
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            discord: document.getElementById("discord").value.trim(),
            category: document.getElementById("category").value,
            subject: document.getElementById("subject").value.trim(),
            description: document.getElementById("description").value.trim(),
            image: imageURL
        };

        /* Validation */
        if (
            !ticketData.name ||
            !ticketData.email ||
            !ticketData.subject ||
            !ticketData.description
        ) {
            responseMessage.textContent = "Please fill in all required fields.";
            responseMessage.style.color = "red";

            button.disabled = false;
            button.textContent = "Submit Ticket";
            return;
        }

        /* =========================
        IMPORTANT FIX HERE
        ========================= */
        const res = await fetch("/api/ticket", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(ticketData)
        });

        const data = await res.json();

        /* Response */
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
        console.error(err);
        responseMessage.textContent = "Server not reachable.";
        responseMessage.style.color = "red";
    }

    button.disabled = false;
    button.textContent = "Submit Ticket";
});