// Global State
let currentScreen = 'home';
let currentPage = 1;
let questionsPerPage = 5;
let currentFilter = 'newest';
let isLoggedIn = false;
let currentUser = null;
let currentQuestionId = null;
let selectedTags = [];

// Sample Questions
const sampleQuestions = [
    {
        id: 1,
        title: "How to implement authentication in React?",
        description: "I'm building a React application and need to implement user authentication. What's the best approach for handling login/logout and protecting routes?",
        tags: ["react", "authentication", "javascript"],
        author: "john_doe",
        timestamp: "2024-01-15T10:30:00Z",
        votes: 15,
        answers: 3,
        views: 127,
        hasAcceptedAnswer: true
    },
    {
        id: 2,
        title: "Python list comprehension vs regular loops",
        description: "When should I use list comprehensions over regular for loops in Python? Are there performance differences?",
        tags: ["python", "performance", "list-comprehension"],
        author: "python_guru",
        timestamp: "2024-01-14T15:45:00Z",
        votes: 8,
        answers: 2,
        views: 89,
        hasAcceptedAnswer: false
    },
    {
        id: 3,
        title: "CSS Grid vs Flexbox - when to use which?",
        description: "I'm confused about when to use CSS Grid vs Flexbox. Can someone explain the key differences and use cases?",
        tags: ["css", "grid", "flexbox", "layout"],
        author: "css_newbie",
        timestamp: "2024-01-13T09:20:00Z",
        votes: 12,
        answers: 5,
        views: 203,
        hasAcceptedAnswer: true
    },
    {
        id: 4,
        title: "Database normalization best practices",
        description: "What are the key principles of database normalization? How do I know when I've normalized enough?",
        tags: ["database", "sql", "normalization"],
        author: "db_admin",
        timestamp: "2024-01-12T14:10:00Z",
        votes: 6,
        answers: 1,
        views: 64,
        hasAcceptedAnswer: false
    },
    {
        id: 5,
        title: "Understanding async/await in JavaScript",
        description: "I'm having trouble understanding how async/await works in JavaScript. Can someone explain with examples?",
        tags: ["javascript", "async", "promises"],
        author: "js_learner",
        timestamp: "2024-01-11T11:55:00Z",
        votes: 20,
        answers: 4,
        views: 156,
        hasAcceptedAnswer: true
    },
    {
        id: 6,
        title: "Best practices for API design",
        description: "What are the essential principles for designing RESTful APIs? Looking for guidance on URL structure, HTTP methods, and error handling.",
        tags: ["api", "rest", "design", "backend"],
        author: "api_architect",
        timestamp: "2024-01-10T16:30:00Z",
        votes: 11,
        answers: 0,
        views: 45,
        hasAcceptedAnswer: false
    },
];

// Render Questions
function renderQuestions() {
    const questionList = document.getElementById('questionList');
    questionList.innerHTML = '';
    sampleQuestions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-lg shadow border border-gray-200';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-blue-700 cursor-pointer" onclick="showQuestion(${q.id})">${q.title}</h3>
                <span class="text-xs text-gray-500">${q.votes} votes</span>
            </div>
            <div class="text-sm text-gray-600 mt-2">${q.description}</div>
            <div class="flex gap-2 mt-2">
                ${q.tags.map(tag => `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">${tag}</span>`).join('')}
            </div>
        `;
        questionList.appendChild(div);
    });
}

// Show Screens with Login Restriction
function showScreen(screen) {
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

// Handle Click on Ask Question
function handleAskClick() {
    if (!isLoggedIn) {
        toggleLogin();
    } else {
        showScreen('ask');
    }
}

// Show Question Details with Login Check
function showQuestion(id) {
    if (!isLoggedIn) {
        toggleLogin();
        return;
    }

    currentQuestionId = id;
    showScreen('question');
    document.getElementById('questionDetails').innerHTML = `<div>Question ID: ${id}</div>`;
}

// Toggle Login Modal
function toggleLogin() {
    document.getElementById('loginModal').classList.toggle('hidden');
}

// Close Login Modal
function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

// Update Login UI
function updateLoginStatusUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (isLoggedIn) {
        loginBtn.textContent = `Hi, ${currentUser}`;
        loginBtn.disabled = true;
        loginBtn.classList.add('cursor-default');
    }
}

// Login Form Handling
document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (username && password) {
        isLoggedIn = true;
        currentUser = username;
        closeLoginModal();
        updateLoginStatusUI();
        alert(`Welcome, ${username}!`);
    } else {
        alert("Please enter valid login credentials.");
    }
});

// Initial Render
document.addEventListener('DOMContentLoaded', () => {
    showScreen('home');
});


function toggleSignup() {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("signupModal").classList.remove("hidden");
}

function closeSignupModal() {
    document.getElementById("signupModal").classList.add("hidden");
}



document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("signupUsername").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

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
            closeSignupModal();
        } else {
            alert(result.error || "Signup failed");
        }
    } catch (err) {
        console.error("Signup error:", err);
        alert("Something went wrong.");
    }
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

