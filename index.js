import { useNavigate } from "react-router-dom";


document.getElementById("ticketForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const file = document.getElementById("imageUpload").files[0];

    console.log(file); // this is your image
});
