// Global State
let currentScreen = 'home';
let currentPage = 1;
let questionsPerPage = 5;
let currentFilter = 'newest';
let isLoggedIn = false;
let currentUser = null;
let currentQuestionId = null;
let selectedTags = [];

// Predefined list of available tags
const availableTags = [
    "javascript", "react", "html", "css", "python", "sql",
    "database", "api", "async", "promises", "authentication",
    "performance", "flexbox", "grid", "layout", "design", "rest"
];

// Helper: Format Timestamp
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// Fetch All Questions from Backend
async function fetchQuestions() {
    try {
        const res = await fetch("http://localhost:5000/questions");
        return await res.json();
    } catch (err) {
        console.error("Failed to fetch questions", err);
        return [];
    }
}

// Render Questions on Home Screen
function renderQuestionsList(questions) {
    const questionList = document.getElementById('questionList');
    questionList.innerHTML = '';

    questions.forEach(q => {
        const id = q._id || q.id;
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow border border-gray-200';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-blue-700 cursor-pointer" onclick="showQuestion('${id}')">${q.title}</h3>
                <span class="text-xs text-gray-500">${q.votes || 0} votes</span>
            </div>
            <div class="text-sm text-gray-600 mt-2">${q.description}</div>
            <div class="flex gap-2 mt-2">
                ${q.tags.map(tag => `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">${tag}</span>`).join('')}
            </div>
        `;
        questionList.appendChild(div);
    });
}

async function renderQuestions() {
    const questions = await fetchQuestions();
    renderQuestionsList(questions);
}

// Show Screens with Login Restriction
async function showScreen(screen) {
    if (!isLoggedIn && (screen === 'ask' || screen === 'question')) {
        toggleLogin();
        return;
    }

    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('askScreen').classList.add('hidden');
    document.getElementById('questionScreen').classList.add('hidden');

    document.getElementById(`${screen}Screen`).classList.remove('hidden');

    if (screen === 'home') {
        renderQuestions();
    }
}

// Show Question Details with ID and Title in Answer Header
async function showQuestion(id) {
    // If user not logged in, show login modal
    if (!isLoggedIn) {
        toggleLogin();
        return;
    }

    currentQuestionId = id;
    showScreen('question');

    try {
        const res = await fetch(`http://localhost:5000/question/${id}`);
        if (!res.ok) throw new Error("Failed to fetch question");
        const data = await res.json();

        const formattedTime = new Date(data.timestamp).toLocaleString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        // Populate Question Details
        document.getElementById("questionDetails").innerHTML = `
            <h2 class="text-2xl font-bold text-blue-800 mb-2">${data.title}</h2>
            <div class="text-sm text-gray-600 mb-3">
                Asked by <span class="font-medium text-gray-800">${data.author}</span>
                on <span class="italic">${formattedTime}</span>
            </div>
            <div class="text-gray-800 mb-4">${data.description}</div>
            <div class="flex flex-wrap gap-2 mb-4">
                ${data.tags.map(tag => `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">${tag}</span>`).join('')}
            </div>
        `;

        // Clear previous answers and editor content
        const answersList = document.getElementById("answersList");
        answersList.innerHTML = "";
        document.getElementById("answerEditor").innerHTML = "";

        // Render Answers if available
        if (data.answers && data.answers.length > 0) {
            data.answers.forEach(ans => {
                const ansDiv = document.createElement("div");
                ansDiv.className = "border p-4 rounded shadow-sm bg-gray-50";
                const ansTime = new Date(ans.timestamp).toLocaleString("en-IN");

                ansDiv.innerHTML = `
                    <div class="text-gray-800">${ans.content}</div>
                    <div class="text-xs text-gray-500 mt-2">
                        Answered by <strong>${ans.author}</strong> on ${ansTime}
                    </div>
                `;

                answersList.appendChild(ansDiv);
            });
        } else {
            answersList.innerHTML = `<div class="text-gray-400">No answers yet. Be the first to answer!</div>`;
        }

    } catch (err) {
        console.error("Error loading question:", err);
        alert("Failed to load the question.");
    }
}


// Ask Question Submission
document.getElementById("askQuestionForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const title = document.getElementById("questionTitle").value.trim();
    const description = document.getElementById("richTextEditor").innerHTML.trim();

    if (!title || !description || selectedTags.length === 0) {
        alert("Please fill all fields and select at least one tag.");
        return;
    }

    const questionData = {
        title,
        description,
        tags: selectedTags,
        author: currentUser
    };

    try {
        const res = await fetch("http://localhost:5000/ask-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData)
        });

        const result = await res.json();
        if (res.ok) {
            alert("Question posted successfully!");
            showScreen("home");
        } else {
            alert(result.error || "Failed to post question.");
        }
    } catch (err) {
        console.error("Post question error:", err);
        alert("Something went wrong.");
    }
});

// Authentication & UI Update Functions (unchanged)
function toggleLogin() {
    document.getElementById('loginModal').classList.toggle('hidden');
}
function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}
function toggleSignup() {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("signupModal").classList.remove("hidden");
}
function closeSignupModal() {
    document.getElementById("signupModal").classList.add("hidden");
}
function updateLoginStatusUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (isLoggedIn) {
        loginBtn.textContent = `Hi, ${currentUser}`;
        loginBtn.disabled = true;
        loginBtn.classList.add('cursor-default');
    }
}

// Rich Text Editor Functions (unchanged)
function formatText(command) { document.execCommand(command, false, null); }
function insertLink() {
    const url = prompt("Enter the URL");
    if (url) document.execCommand("createLink", false, url);
}
function insertEmoji(emoji) {
    const editor = document.getElementById("richTextEditor");
    editor.focus();
    document.execCommand("insertText", false, emoji);
    toggleEmojiPicker();
}
function toggleEmojiPicker() {
    const picker = document.getElementById("emojiPicker");
    picker.classList.toggle("hidden");
}
function insertImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const editor = document.getElementById("richTextEditor");
            const img = document.createElement("img");
            img.src = e.target.result;
            img.classList.add("max-w-full", "rounded", "my-2");
            editor.appendChild(img);

            document.getElementById("imagePreview").classList.remove("hidden");
            document.getElementById("previewImg").src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Tag Selection + Suggestion
function renderAvailableTags() {
    const tagContainer = document.getElementById("tagSelection");
    tagContainer.innerHTML = "";
    availableTags.forEach(tag => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tag-button px-2 py-1 bg-gray-100 rounded text-sm hover:bg-blue-200";
        btn.textContent = tag;
        btn.onclick = () => toggleTagSelection(tag);
        tagContainer.appendChild(btn);
    });
}
function toggleTagSelection(tag) {
    if (selectedTags.includes(tag)) return;
    if (selectedTags.length >= 5) {
        alert("You can select up to 5 tags only.");
        return;
    }
    selectedTags.push(tag);
    updateSelectedTagsUI();
}
function updateSelectedTagsUI() {
    const selectedContainer = document.getElementById("selectedTags");
    selectedContainer.innerHTML = "";
    selectedTags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs";
        span.textContent = tag;
        selectedContainer.appendChild(span);
    });
}
function suggestTagsFromDescription(text) {
    const lowerText = text.toLowerCase();
    selectedTags = [];
    availableTags.forEach(tag => {
        if (lowerText.includes(tag)) selectedTags.push(tag);
    });
    updateSelectedTagsUI();
}
document.getElementById("richTextEditor").addEventListener("input", () => {
    const desc = document.getElementById("richTextEditor").innerText;
    suggestTagsFromDescription(desc);
});

// Answer Editor Toolbar
function formatAnswerText(command) {
    document.getElementById('answerEditor').focus();
    document.execCommand(command, false, null);
}
function insertAnswerLink() {
    const url = prompt("Enter the URL");
    if (url) {
        document.getElementById('answerEditor').focus();
        document.execCommand("createLink", false, url);
    }
}
function toggleAnswerEmojiPicker() {
    const picker = document.getElementById("answerEmojiPicker");
    picker.classList.toggle("hidden");
}
function insertAnswerEmoji(emoji) {
    const editor = document.getElementById("answerEditor");
    editor.focus();
    document.execCommand("insertText", false, emoji);
    toggleAnswerEmojiPicker();
}

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    renderAvailableTags();
    showScreen('home');
});

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        alert("Please enter both username and password.");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const result = await res.json();

        if (res.ok) {
            isLoggedIn = true;
            currentUser = result.username;
            closeLoginModal();
            updateLoginStatusUI();
            alert("Login successful!");
        } else {
            alert(result.error || "Login failed.");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Something went wrong. Please try again later.");
    }
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!username || !email || !password) {
        alert("Please fill all the fields.");
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, email, password })
        });

        const result = await res.json();

        if (res.ok) {
            alert("Signup successful! You can now log in.");
            document.getElementById("signupModal").classList.add("hidden");
        } else {
            alert(result.error || "Signup failed.");
        }
    } catch (err) {
        console.error("Signup error:", err);
        alert("Something went wrong during signup.");
    }
});


document.getElementById("answerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const content = document.getElementById("answerEditor").innerHTML.trim();

    if (!content || !currentUser || !currentQuestionId) {
        alert("Answer cannot be empty or user not logged in.");
        return;
    }

    const answerData = {
        author: currentUser,
        content: content
    };

    try {
        const res = await fetch(`http://localhost:5000/question/${currentQuestionId}/answer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(answerData)
        });

        const result = await res.json();
        if (res.ok) {
            alert("Answer posted!");
            // Refresh question to show updated answers
            showQuestion(currentQuestionId);
        } else {
            alert(result.error || "Failed to post answer.");
        }
    } catch (err) {
        console.error("Answer post error:", err);
        alert("Something went wrong.");
    }
});

function handleAskClick() {
    if (!isLoggedIn) {
        toggleLogin(); // prompt login if not logged in
        return;
    }
    showScreen('ask');
}

