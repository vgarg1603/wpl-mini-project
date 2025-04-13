console.log("JS Loaded");
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const stopButton = document.querySelector("#stop-btn");
const themeToggle = document.querySelector("#theme-toggle-btn");



const API_KEY = "AIzaSyC154YC0lncSOs2leUBiBBse1uWqXDS0Ug";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const chatHistory = [];
let userMessage = "";
let isStopped = false;

// Function to create user-message div
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const scrollToBottom = () => {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
}

function typingEffect(responseText, textElement, botMsgDiv) {
    textElement.textContent = "";
    const words = responseText.split(" ");
    let wordIndex = 0;

    const typingInterval = setInterval(() => {
        if (isStopped) {
            clearInterval(typingInterval);
            textElement.textContent += " [Stopped]";
            botMsgDiv.classList.remove("loading");
            return;
        }
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        } else {
            clearInterval(typingInterval);
        }
    }, 40)
}


// Make the api call and generate bot's response
const generateResponse = async (botMsgDiv) => {
    promptInput.disabled = true;
    const textElement = botMsgDiv.querySelector(".message-text");

    const userPrompt = userMessage

    chatHistory.push({
        role: "user",
        parts: [{ text: userMessage }]
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        })

        const data = await response.json();

        if (isStopped) {
            textElement.textContent = "Try again.";
            botMsgDiv.classList.remove("loading");
            return;
        }

        const candidate = data.candidates?.[0];
        const botParts = candidate?.content?.parts || [];

        const botText = botParts.map(part => part.text).join("\n").replace(/\*\*([^*]+)\*\*/g, "$1").trim();

        // Add the response to chat history for context
        chatHistory.push({
            role: "model",
            parts: [{ text: botText }]
        });

        // Process the response text and display with typing effect
        typingEffect(botText, textElement, botMsgDiv)
        botMsgDiv.classList.remove("loading");



    } catch (error) {
        console.log(error)
        textElement.textContent = "Something went wrong. Please try again.";
        botMsgDiv.classList.remove("loading");
    }
}


// Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault()
    isStopped = false;
    stopButton.classList.remove("hide");
    stopButton.classList.add("show");
    userMessage = promptInput.value.trim();

    if (!userMessage) return;

    promptInput.value = "";
    document.body.classList.add("chats-active");

    const userMsgHTML = `<p class="message-text">${userMessage}</p>`;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        const botMsgHTML = `<img src="gemini.svg" alt="" class="avatar rotating"><p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();

        promptInput.disabled = true;
        console.log("Calling generateResponse with:", userMessage);
        generateResponse(botMsgDiv).finally(() => {
            promptInput.disabled = false;
            promptInput.focus();

            stopButton.classList.add("hide");
            stopButton.classList.remove("show");
        });
    }, 600)
}
promptForm.addEventListener("submit", handleFormSubmit);


// Pause response button
stopButton.addEventListener("click", () => {
    isStopped = true;
    console.log("Response generation stopped.");
});

// Delete chats button
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("chats-active")
})

// Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach((item) => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent
        promptForm.dispatchEvent(new Event("submit"));
    })
})


// Theme toggle functionality
const toggleTheme = document.querySelector("#theme-toggle-btn");
toggleTheme.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-mode");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode")
    toggleTheme.textContent = isLightTheme ? "dark_mode" : "light_mode"
})
const isLightTheme = localStorage.getItem("themeColor") === "light_mode"
document.body.classList.toggle("light-mode", isLightTheme)
toggleTheme.textContent = isLightTheme ? "dark_mode" : "light_mode"