window.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("ticketForm");
    const responseMessage = document.getElementById("responseMessage");

    if (!form) {
        console.log("❌ Form not found");
        return;
    }

    const button = form.querySelector("button");

    function generateTicketID() {
        return "SPK-" + Math.floor(1000 + Math.random() * 9000);
    }

    console.log("🔥 tickets.js loaded");

    /* =========================
    IMAGE PREVIEW
    ========================= */
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
            }

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

            const res = await fetch("/api/ticket", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(ticketData)
            });

            const data = await res.json();

            if (res.ok) {
                responseMessage.textContent = `Ticket Created Successfully! ID: ${data.id}`;
                form.reset();
                if (preview) preview.style.display = "none";
            } else {
                responseMessage.textContent = data.error || "Something went wrong.";
            }

        } catch (err) {
            console.error(err);
            responseMessage.textContent = "Server not reachable.";
        }

        button.disabled = false;
        button.textContent = "Submit Ticket";
    });

});