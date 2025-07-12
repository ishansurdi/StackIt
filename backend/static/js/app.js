// =================== GLOBAL STATE ===================
let currentScreen = 'home';
let currentPage = 1;
let questionsPerPage = 5;
let currentFilter = 'newest';
let isLoggedIn = false;
let currentUser = null;
let currentQuestionId = null;
let selectedTags = [];
let allUsernames = [];
let currentSort = null; // 'newest' | 'mostVoted' | etc.
let lastSortedQuestions = []; // stores backend-fetched raw data

// Predefined list of available tags
const availableTags = [
    "javascript", "react", "html", "css", "python", "sql",
    "database", "api", "async", "promises", "authentication",
    "performance", "flexbox", "grid", "layout", "design", "rest"
];

// =================== PAGINATION ===================
async function fetchQuestionsPaginated(page = 1, sort = null) {
    try {
        let url = `http://localhost:5000/questions/page/${page}`;
        if (sort) url += `?sort=${sort}`;
        const res = await fetch(url);
        return await res.json();
    } catch (err) {
        console.error("Failed to fetch paginated questions", err);
        return { questions: [], total: 0, total_pages: 0 };
    }
}

function renderPagination(currentPage, totalPages, onPageClick = renderQuestions) {
    const pageContainer = document.getElementById("pageNumbers");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    pageContainer.innerHTML = "";

    const pagesToShow = [];

    for (let i = 1; i <= totalPages; i++) {
        pagesToShow.push(i);
    }

    pagesToShow.forEach(page => {
        const btn = document.createElement("button");
        btn.textContent = page;
        btn.className = `px-3 py-1 text-sm rounded ${page === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`;
        btn.onclick = () => onPageClick(page);
        pageContainer.appendChild(btn);
    });

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    prevBtn.onclick = () => {
        if (currentPage > 1) onPageClick(currentPage - 1);
    };
    nextBtn.onclick = () => {
        if (currentPage < totalPages) onPageClick(currentPage + 1);
    };
}

async function fetchQuestionsPaginated(page = 1, sort = null) {
    try {
        let url = `http://localhost:5000/questions/page/${page}`;
        if (sort) {
            url += `?sort=${sort}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Failed to fetch paginated questions", err);
        return { questions: [], total: 0, total_pages: 0 };
    }
}

// =================== HELPER FUNCTIONS ===================
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

function highlightMentions(text) {
    return text.replace(/@(\w+)/g, '<span class="text-green-600 font-semibold">@$1</span>');
}

// =================== FETCH FUNCTIONS ===================
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

async function fetchQuestions() {
    try {
        const res = await fetch("http://localhost:5000/questions");
        return await res.json();
    } catch (err) {
        console.error("Failed to fetch questions", err);
        return [];
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

// =================== RENDER FUNCTIONS ===================
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
                
            </div>
            <div class="text-sm text-gray-600 mt-2 rendered-content">${q.description}</div>
            <div class="flex gap-2 mt-2">
                ${q.tags.map(tag => `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">${tag}</span>`).join('')}
            </div>
        `;
        questionList.appendChild(div);
    });
}
{/* <span class="text-xs text-gray-500">${q.votes || 0} Upvotes</span> */}

async function renderQuestions(page = 1, sort = null) {
    const data = await fetchQuestionsPaginated(page, sort);
    lastSortedQuestions = [...data.questions];

    renderQuestionsList(data.questions);
    renderPagination(data.page, data.total_pages);
}

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
            <div class="text-gray-800 mb-2 rendered-content">${answer.content}</div>
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

// =================== SORTING ===================
async function sortQuestions(criteria) {
    const isSameSort = currentSort === criteria;

    if (isSameSort) {
        // Reset to default (unsorted)
        currentSort = null;
        await renderQuestions(currentPage); // No sort param
    } else {
        currentSort = criteria;
        await renderQuestions(currentPage, currentSort); // With sort param
    }

    // Update sort button UI
    document.querySelectorAll('.sort-button').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200', 'text-black');
    });

    const activeBtn = document.getElementById(`${criteria}Btn`);
    if (!isSameSort && activeBtn) {
        activeBtn.classList.add('bg-blue-500', 'text-white');
        activeBtn.classList.remove('bg-gray-200', 'text-black');
    }
}


// =================== SCREEN MANAGEMENT ===================
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

// =================== QUESTION DETAILS ===================
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
            <div class="text-gray-800 mb-4 rendered-content">${data.description}</div>
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
        showNotification("Failed to load the question.");
    }
}

// =================== TAG SELECTION ===================
function toggleTagSelection(tag) {
    if (selectedTags.includes(tag)) return;
    if (selectedTags.length >= 5) {
        showNotification("You can select up to 5 tags only.");
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

// =================== RICH TEXT EDITOR ===================
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

// =================== ANSWER EDITOR ===================
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

// =================== MENTION DETECTION ===================
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

// =================== VOTING & ACCEPTING ANSWERS ===================
function voteAnswer(index, type) {
    const questionId = currentQuestionId;

    if (!currentUser) {
        showNotification("You must be logged in to vote.");
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
            showNotification("Vote failed: " + data.error);
        }
    })
    .catch(err => console.error("Vote error", err));
}

function acceptAnswer(index) {
    if (!currentUser || currentUser !== window.questionAuthor) {
        showNotification("Only the question author can accept an answer.");
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
            showNotification(data.message);
            window.hasAcceptedAnswer = true; // ✅ update global state
            showQuestion(currentQuestionId); // ✅ refresh question view
        } else {
            showNotification("Failed: " + data.error);
        }
    })
    .catch(err => {
        console.error("Accept error:", err);
        showNotification("Something went wrong.");
    });
}

// =================== NOTIFICATIONS ===================
async function toggleNotifications() {
    const dropdown = document.getElementById("notificationDropdown");
    dropdown.classList.toggle("hidden");

    if (!dropdown.classList.contains("hidden")) {
        await fetchNotifications(); // Load notifications when opened
    }
}

// =================== UI & AUTH ===================
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

// =================== EVENT HANDLERS ===================

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    renderAvailableTags();
    fetchAllUsernames(); 
    showScreen('home');
    enableMentionDetection("richTextEditor");
    enableMentionDetection("answerEditor");
});

document.getElementById("richTextEditor").addEventListener("input", () => {
    const desc = document.getElementById("richTextEditor").innerText;
    suggestTagsFromDescription(desc);
});

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showNotification("Please enter both username and password.");
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
            showNotification("Login successful!");
        } else {
            showNotification(result.error || "Login failed.");
        }
    } catch (error) {
        console.error("Login error:", error);
        showNotification("Something went wrong. Please try again later.");
    }
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!username || !email || !password) {
        showNotification("Please fill all the fields.");
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
            showNotification("Signup successful! You can now log in.");
            document.getElementById("signupModal").classList.add("hidden");
        } else {
            showNotification(result.error || "Signup failed.");
        }
    } catch (err) {
        console.error("Signup error:", err);
        showNotification("Something went wrong during signup.");
    }
});

document.getElementById("askQuestionForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const title = document.getElementById("questionTitle").value.trim();
    const description = document.getElementById("richTextEditor").innerHTML.trim();

    if (!title || !description || selectedTags.length === 0) {
    showNotification("Please fill all fields and select at least one tag.");
    return;
}

if (containsBadWords(title) || containsBadWords(description)) {
    showNotification("🚫 Your question contains inappropriate or offensive content.", "error");
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
            showNotification("Question posted successfully!");
            showScreen("home");
        } else {
            showNotification(result.error || "Failed to post question.");
        }
    } catch (err) {
        console.error("Post question error:", err);
        showNotification("Something went wrong.");
    }
});

document.getElementById("answerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const content = document.getElementById("answerEditor").innerHTML.trim();

    if (!content || !currentUser || !currentQuestionId) {
    showNotification("Answer cannot be empty or user not logged in.");
    return;
}

if (containsBadWords(content)) {
    showNotification("🚫 Your answer contains offensive language and cannot be submitted.", "error");
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
            showNotification("Answer posted!");
            // Refresh question to show updated answers
            showQuestion(currentQuestionId);
        } else {
            showNotification(result.error || "Failed to post answer.");
        }
    } catch (err) {
        console.error("Answer post error:", err);
        showNotification("Something went wrong.");
    }
});

// =================== SEARCH LOGIC ===================
async function handleSearch(page = 1) {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) {
        // If empty, reset to default view
        renderQuestions(1);
        return;
    }

    try {
        const res = await fetch(`http://localhost:5000/questions/search?q=${encodeURIComponent(query)}&page=${page}`);
        const data = await res.json();
        lastSortedQuestions = [...data.questions]; // update state

        renderQuestionsList(data.questions);
        renderPagination(data.page, data.total_pages);
    } catch (err) {
        console.error("Search failed", err);
        showNotification("Failed to search questions.");
    }
}



// =================== UI BUTTONS ===================
function handleAskClick() {
    if (!isLoggedIn) {
        toggleLogin(); // prompt login if not logged in
        return;
    }
    showScreen('ask');
}

document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        handleSearch();
    }
});


async function filterQuestions(type, page = 1) {
    if (type === 'unanswered') {
        try {
            const res = await fetch(`http://localhost:5000/questions/unanswered?page=${page}`);
            const data = await res.json();
            lastSortedQuestions = [...data.questions]; // Update state

            renderQuestionsList(data.questions);
           renderPagination(data.page, data.total_pages, (p) => filterQuestions('unanswered', p));


            // Reset sort UI state
            currentSort = null;
            document.querySelectorAll('.sort-button').forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-black');
            });

        } catch (err) {
            console.error("Failed to fetch unanswered questions", err);
            showNotification("Could not load unanswered questions.");
        }
    }
}

// Show a professional notification
function showNotification(message, type = "error", duration = 3500) {
    const toast = document.getElementById("notificationToast");
    const content = document.getElementById("notificationToastContent");

    // Set icon and background color based on type
    let icon = '<i class="fa-solid fa-circle-exclamation"></i>';
    let bgClass = "bg-red-600";
    if (type === "success") {
        icon = '<i class="fa-solid fa-circle-check"></i>';
        bgClass = "bg-green-600";
    } else if (type === "info") {
        icon = '<i class="fa-solid fa-circle-info"></i>';
        bgClass = "bg-blue-600";
    }

    toast.className = `fixed top-6 right-6 z-50 show`;
    content.className = `px-6 py-4 rounded shadow-lg text-white flex items-center gap-3 ${bgClass}`;
    content.innerHTML = `${icon} <span>${message}</span>`;
    toast.style.opacity = "1";
    toast.style.pointerEvents = "auto";
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.pointerEvents = "none";
        toast.classList.add("hidden");
    }, duration);
}


function containsBadWords(text) {
    const badWords = [
        "fuck", "shit", "bitch", "asshole", "bastard", "nigger", "slut", "dick", "cunt", "pussy"
        
    ];
    const normalized = text.toLowerCase().replace(/[^a-z]/g, ""); // remove punctuation and spaces

    return badWords.some(word => normalized.includes(word));
}
