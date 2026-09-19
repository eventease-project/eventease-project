const form = document.getElementById("registrationForm");
const message = document.getElementById("message");

if (form) {
    form.addEventListener("submit", function(event) {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const selectedEvent = document.getElementById("event").value;

        message.textContent =
            "Thank you, " + name + "! Your registration for " +
            selectedEvent + " has been submitted successfully.";

        message.style.marginTop = "20px";
        message.style.fontWeight = "bold";

        form.reset();
    });
}