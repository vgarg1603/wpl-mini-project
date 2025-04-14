console.log("JS Loaded");

const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = document.querySelector(".prompt-input");
const stopButton = document.querySelector("#stop-btn");
const themeToggle = document.querySelector("#theme-toggle-btn");
const sidebar = document.querySelector("#sidebar");
const toggleSidebarBtn = document.querySelector("#toggle-sidebar");
const closeSidebarBtn = document.querySelector("#close-sidebar");
const navLinksContainer = document.querySelector(".nav-links")

// Sidebar Toggle
function toggleSidebar() {
    sidebar.classList.toggle('active');
    container.classList.toggle('sidebar-active');
}

toggleSidebarBtn.addEventListener('click', toggleSidebar);
closeSidebarBtn.addEventListener('click', toggleSidebar);

// Close sidebar when clicking outside
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) &&
        !toggleSidebarBtn.contains(e.target) &&
        sidebar.classList.contains('active')) {
        toggleSidebar();
    }
});

async function loadRecentChats() {
    fetch('server.php', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_recent_chats" })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                const chatList = document.getElementById("recent-chats-list");
                chatList.innerHTML = "";

                data.prompts.forEach(chat => {
                    const li = document.createElement("li");
                    li.innerHTML = `
            <span class="chat-text">${chat.prompt_text}</span>
            <div class="chat-actions">
              <span class="material-symbols-outlined" onclick="deleteChat(${chat.prompt_id})">delete</span>
              <span class="material-symbols-outlined ${chat.starred ? 'active' : ''}" onclick="toggleStar(${chat.prompt_id}, this)">star</span>
            </div>
          `;

                    li.addEventListener("click", () => {
                        loadConversation(`${chat.prompt_id}`)
                    })

                    chatList.appendChild(li);
                })
            } else {
                console.error(data.message);
            }
        }).catch(err => console.error("Error loading chats:", err));
}

function loadConversation(promptId) {
    fetch(`load_conversation.php?prompt_id=${promptId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                chatsContainer.innerHTML = ""; // Clear current chat
                document.body.classList.add("chats-active");

                // User message
                const userMsgHTML = `<p class="message-text">${data.prompt_text}</p>`;
                const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
                chatsContainer.appendChild(userMsgDiv);

                // Bot response
                const botMsgHTML = `<p class="message-text">${data.response_text}</p>`;
                const botMsgDiv = createMsgElement(botMsgHTML, "bot-message");
                chatsContainer.appendChild(botMsgDiv);

                scrollToBottom();
            } else {
                alert("Failed to load conversation.");
            }
        }).catch(error => {
            console.error("erro occured", error)
        });
}


function deleteChat(promptId) {
    fetch("server.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_prompt", prompt_id: promptId })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") loadRecentChats();
        }).catch(err => console.error("Error deleting chats:", err));
}

function toggleStar(promptId, icon) {
    fetch("server.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_star", prompt_id: promptId })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                icon.classList.toggle("active");
            }
        });
}

const API_KEY = "AIzaSyC154YC0lncSOs2leUBiBBse1uWqXDS0Ug"; // Replace with your actual Gemini API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const chatHistory = [];
let userMessage = "";
let isStopped = false;

const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

const scrollToBottom = () => {
    chatsContainer.scrollTo({ top: chatsContainer.scrollHeight, behavior: "smooth" });
};

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
    }, 20);
}

const generateResponse = async (botMsgDiv) => {
    promptInput.disabled = true;
    const textElement = botMsgDiv.querySelector(".message-text");

    const userPrompt = userMessage;

    chatHistory.push({
        role: "user",
        parts: [{ text: userPrompt }]
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory })
        });

        const data = await response.json();

        if (data.error) {
            textElement.textContent = `Error: ${data.error.message}`;
            botMsgDiv.classList.remove("loading");
            return;
        }

        if (isStopped) {
            textElement.textContent = "Try again.";
            botMsgDiv.classList.remove("loading");
            return;
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
            textElement.textContent = "Sorry, I didn't understand that. Try again.";
            botMsgDiv.classList.remove("loading");
            return;
        }

        const botParts = candidate.content?.parts || [];
        const botText = botParts.map(part => part.text).join("\n").replace(/\*\*([^*]+)\*\*/g, "$1").trim();

        chatHistory.push({
            role: "model",
            parts: [{ text: botText }]
        });

        typingEffect(botText, textElement, botMsgDiv);
        botMsgDiv.classList.remove("loading");

        // Store the prompt and response in the database
        try {
            const storeResponse = await fetch('server.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'store_prompt_response',
                    prompt_text: userPrompt,
                    response_text: botText
                })
            });

            const storeData = await storeResponse.json();
            if (storeData.status === 'error') {
                console.error('Failed to save prompt and response:', storeData.message);
            } else {
                console.log('Prompt and response saved successfully');
            }
        } catch (error) {
            console.error('Error saving prompt and response:', error);
        }

    } catch (error) {
        console.log(error);
        textElement.textContent = "Something went wrong. Please try again.";
        botMsgDiv.classList.remove("loading");
    }
};

const handleFormSubmit = (e) => {
    e.preventDefault();
    isStopped = false;
    stopButton.classList.remove("hide");
    stopButton.classList.add("show");

    userMessage = promptInput.value.trim();
    if (!userMessage) return;

    promptInput.value = "";
    document.body.classList.add("chats-active");

    const userMsgHTML = `<p class="message-text">${userMessage}</p>`;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
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
    }, 600);
};

window.addEventListener("DOMContentLoaded", () => {
    loadRecentChats();
})

promptForm.addEventListener("submit", handleFormSubmit);

stopButton.addEventListener("click", () => {
    isStopped = true;
    console.log("Response generation stopped.");
});

document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("chats-active");
});

document.querySelectorAll(".suggestions-item").forEach((item) => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-mode", isLightTheme);
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLight ? "dark_mode" : "light_mode";
});
