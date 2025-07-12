// Global State
let currentScreen = 'home';
let currentPage = 1;
let questionsPerPage = 5;
let currentFilter = 'newest';
let isLoggedIn = false;
let currentUser = null;
let currentQuestionId = null;
let selectedTags = [];
let allUsernames = [];
// let currentSort = 'newest'; 
// // global sort state
let currentSort = null; // 'newest' | 'mostVoted' | etc.
let lastSortedQuestions = []; // stores backend-fetched raw data

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
async function fetchAllUsernames() {
    try {
        const res = await fetch("http://localhost:5000/users");
        const data = await res.json();
        if (Array.isArray(data)) {
            allUsernames = data;
        }
    } catch (err) {
        console.error("Failed to fetch usernames", err);
    }
}

function highlightMentions(text) {
    return text.replace(/@(\w+)/g, '<span class="text-green-600 font-semibold">@$1</span>');
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
    const countHeader = document.getElementById('questionCountHeader');
    countHeader.textContent = `Total questions on portal: ${questions.length} `;
    questionList.innerHTML = '';

    questions.forEach(q => {
        const id = q._id || q.id;
        const div = document.createElement('div');
        
        div.className = 'bg-white p-4 rounded-lg shadow border border-gray-200';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-blue-700 cursor-pointer" onclick="showQuestion('${id}')">${q.title}</h3>
                <span class="text-xs text-gray-500">${q.upvotes || 0} Upvotes</span>
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
    let questions = await fetchQuestions()
    lastSortedQuestions = [...questions]; 
    renderQuestionsList(questions);
}
function sortQuestions(criteria) {
    if (!lastSortedQuestions.length) {
        console.warn("Questions not yet loaded!");
        return;
    }

    const isSameSort = currentSort === criteria;

    if (isSameSort) {
        currentSort = null;

        renderQuestionsList([...lastSortedQuestions]);

        document.querySelectorAll('.sort-button').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-black');
        });

    } else {
        currentSort = criteria;

        const sorted = [...lastSortedQuestions]; // clone original

        if (criteria === 'newest') {
            sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }

        renderQuestionsList(sorted);

        document.querySelectorAll('.sort-button').forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-black');
        });

        const activeBtn = document.getElementById(`${criteria}Btn`);
        if (activeBtn) {
            activeBtn.classList.add('bg-blue-500', 'text-white');
            activeBtn.classList.remove('bg-gray-200', 'text-black');
        }
    }
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

        window.questionAuthor = data.author;
        window.hasAcceptedAnswer = data.hasAcceptedAnswer || false;

        const formattedTime = new Date(data.timestamp).toLocaleString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

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

        const answersList = document.getElementById("answersList");
        const editor = document.getElementById("answerEditor");
        const submitBtn = document.getElementById("submitAnswerBtn");
        const reasonBox = document.getElementById("answerDisabledReason");

        answersList.innerHTML = "";
        editor.innerHTML = "";

        if (window.hasAcceptedAnswer) {
            editor.setAttribute("contenteditable", "false");
            editor.classList.add("opacity-50", "pointer-events-none", "bg-gray-100");
            submitBtn.disabled = true;
            if (reasonBox) {
                reasonBox.classList.remove("hidden");
                reasonBox.textContent = "❗ This question already has an accepted answer. No more answers are allowed.";
            }
        } else {
            editor.setAttribute("contenteditable", "true");
            editor.classList.remove("opacity-50", "pointer-events-none", "bg-gray-100");
            submitBtn.disabled = false;
            if (reasonBox) reasonBox.classList.add("hidden");
        }

        if (data.answers && data.answers.length > 0) {
            renderAnswers(data.answers);
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
    fetchAllUsernames(); 
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
            fetchNotifications(); // 🔔 Load immediately after login
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
function voteAnswer(index, type) {
    const questionId = currentQuestionId;

    if (!currentUser) {
        alert("You must be logged in to vote.");
        return;
    }

    fetch(`http://localhost:5000/question/${questionId}/answer/${index}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, username: currentUser }) // ✅ pass username
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            // Refresh the question screen to reflect updated vote counts
            showQuestion(questionId);
        } else {
            alert("Vote failed: " + data.error);
        }
    })
    .catch(err => console.error("Vote error", err));
}


function renderAnswers(answers) {
    const answersList = document.getElementById('answersList');
    answersList.innerHTML = '';

    answers.forEach((answer, index) => {
        const answerCard = document.createElement('div');
        answerCard.className = "p-4 bg-gray-50 rounded-lg border border-gray-200";

        const timestamp = new Date(answer.timestamp).toLocaleString("en-IN");

        const isAccepted = answer.accepted;
        const acceptedBadge = isAccepted
            ? `<div class="text-green-700 font-semibold mt-2">✅ Accepted Answer</div>`
            : '';

        let acceptButtonHTML = '';

        if (currentUser === window.questionAuthor) {
            if (!isAccepted && !window.hasAcceptedAnswer) {
                acceptButtonHTML = `
                    <button 
                        onclick="acceptAnswer(${index})" 
                        id="accept-btn-${index}" 
                        class="text-green-600 text-sm hover:underline">
                        ✅ Accept Answer
                    </button>`;
            } else if (!isAccepted && window.hasAcceptedAnswer) {
                acceptButtonHTML = `
                    <button 
                        disabled 
                        class="text-gray-400 text-sm cursor-not-allowed">
                        ✅ Accept Answer
                    </button>
                    <div class="text-xs text-red-500 italic">Only one answer can be accepted per question.</div>`;
            }
        }

        answerCard.innerHTML = `
            <div class="text-gray-800 mb-2">${answer.content}</div>
            <div class="text-sm text-gray-500 mb-2">
                Answered by <strong>${answer.author}</strong> on ${timestamp}
            </div>
            <div class="flex items-center space-x-4 text-gray-600">
                <button onclick="voteAnswer(${index}, 'up')" class="flex items-center space-x-1 hover:text-green-600">
                    <i class="fas fa-thumbs-up"></i>
                    <span id="upvotes-${index}">${answer.upvotes || 0}</span>
                </button>
                <button onclick="voteAnswer(${index}, 'down')" class="flex items-center space-x-1 hover:text-red-600">
                    <i class="fas fa-thumbs-down"></i>
                    <span id="downvotes-${index}">${answer.downvotes || 0}</span>
                </button>
                ${acceptButtonHTML}
            </div>
            ${acceptedBadge}
        `;

        answersList.appendChild(answerCard);
    });
}

function acceptAnswer(index) {
    if (!currentUser || currentUser !== window.questionAuthor) {
        alert("Only the question author can accept an answer.");
        return;
    }

    fetch(`http://localhost:5000/question/${currentQuestionId}/answer/${index}/accept`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: currentUser })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            window.hasAcceptedAnswer = true; // ✅ update global state
            showQuestion(currentQuestionId); // ✅ refresh question view
        } else {
            alert("Failed: " + data.error);
        }
    })
    .catch(err => {
        console.error("Accept error:", err);
        alert("Something went wrong.");
    });
}


async function toggleNotifications() {
    const dropdown = document.getElementById("notificationDropdown");
    dropdown.classList.toggle("hidden");

    if (!dropdown.classList.contains("hidden")) {
        await fetchNotifications(); // Load notifications when opened
    }
}

async function fetchNotifications() {
    if (!currentUser) return;

    try {
        const res = await fetch(`http://localhost:5000/notifications/${currentUser}`);
        const notifications = await res.json();
        renderNotificationList(notifications);
        updateNotificationCount(notifications);
    } catch (err) {
        console.error("Failed to load notifications", err);
    }
}

function renderNotificationList(notifications) {
    const list = document.getElementById("notificationList");
    list.innerHTML = "";

    if (!notifications.length) {
        list.innerHTML = `<div class="p-4 text-gray-500 text-sm">No new notifications.</div>`;
        return;
    }

    notifications.forEach(n => {
        const item = document.createElement("div");
        item.className = "p-3 hover:bg-gray-100 cursor-pointer text-sm text-gray-800";
        item.innerHTML = `
            <div>${n.message}</div>
            <div class="text-xs text-gray-500">${new Date(n.timestamp).toLocaleString()}</div>
        `;
        item.onclick = () => {
            window.location.href = "#"; // you can redirect to question detail page if needed
        };
        list.appendChild(item);
    });
}

function updateNotificationCount(notifications) {
    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById("notificationCount");

    if (unread > 0) {
        badge.textContent = unread;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}


function enableMentionDetection(editorId) {
    const editor = document.getElementById(editorId);
    const mentionBox = document.getElementById("mentionBox");

    editor.addEventListener("keyup", (e) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const textBeforeCursor = selection.anchorNode?.textContent?.slice(0, selection.anchorOffset) || "";

        const match = textBeforeCursor.match(/@(\w*)$/);
        if (match) {
            const query = match[1].toLowerCase();
            const matches = allUsernames.filter(name => name.toLowerCase().startsWith(query)).slice(0, 5);

            if (matches.length > 0) {
                mentionBox.innerHTML = matches.map(u =>
                    `<div class="px-3 py-1 hover:bg-blue-100 cursor-pointer" onclick="insertMention('${u}', '${editorId}')">@${u}</div>`
                ).join("");
                const rect = editor.getBoundingClientRect();
                mentionBox.style.top = (rect.top + window.scrollY + 30) + "px";
                mentionBox.style.left = (rect.left + 20) + "px";
                mentionBox.classList.remove("hidden");
                return;
            }
        }

        mentionBox.classList.add("hidden");
    });
}

function insertMention(username, editorId) {
    const editor = document.getElementById(editorId);
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    // Replace "@query" with "@username"
    const content = textNode.textContent;
    const cursorPos = range.startOffset;
    const beforeCursor = content.slice(0, cursorPos);
    const match = beforeCursor.match(/@(\w*)$/);
    if (match) {
        const newText = beforeCursor.replace(/@(\w*)$/, `@${username} `);
        textNode.textContent = newText + content.slice(cursorPos);
        range.setStart(textNode, newText.length);
        range.setEnd(textNode, newText.length);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    document.getElementById("mentionBox").classList.add("hidden");
}
enableMentionDetection("richTextEditor");
enableMentionDetection("answerEditor");