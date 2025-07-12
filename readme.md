# StackIt

StackIt is a modern Question & Answer forum web application inspired by Stack Overflow. It allows users to ask programming questions, answer others, upvote, search, and more. An admin panel is included for user and content management.

---

## Table of Contents

- [StackIt](#stackit)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Installation](#installation)
    - [1. **Clone the repository**](#1-clone-the-repository)
    - [2. **Set up Python environment**](#2-set-up-python-environment)
    - [3. **Install dependencies**](#3-install-dependencies)
    - [4. **Set up MongoDB**](#4-set-up-mongodb)
- [or for Atlas:](#or-for-atlas)
- [MONGO\_URI=mongodb+srv://:@cluster0.mongodb.net/](#mongo_urimongodbsrvcluster0mongodbnet)

---

## Features

- User registration and login
- Ask, answer, upvote, and search questions
- Rich text editor with image and emoji support
- Tagging system
- Responsive, modern UI (Tailwind CSS)
- Admin dashboard to manage users, questions, and answers
- Notification system
- Pagination and filtering
- Secure password storage (if implemented)
- MongoDB backend

---

## Project Structure

```
StackIt/
├── backend/
│   ├── app.py                # Flask backend
│   ├── requirements.txt      # Python dependencies
│   └── templates/
│       ├── admin.html        # Admin dashboard
│       └── ...               # (other templates if any)
├── css/
│   └── styles.css            # Custom styles
├── images/
│   └── layers.png            # Logo and other images
├── js/
│   └── app.js                # Frontend logic
├── index.html                # Main frontend
├── .env                      # Environment variables (not committed)
└── README.md                 # This file
```

---

<!-- ## Screenshots

> _Add screenshots of your home page, question page, and admin dashboard here for visual reference._

--- -->

## Installation

### 1. **Clone the repository**

```sh
git clone https://github.com/ishansurdi/StackIt.git
cd StackIt/backend
```

### 2. **Set up Python environment**

It is recommended to use a virtual environment:

```sh
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. **Install dependencies**

```sh
pip install -r requirements.txt
```

### 4. **Set up MongoDB**

- You need a running MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)).
- Create a `.env` file in the `backend/` directory with your MongoDB URI:

```
MONGO_URI=mongodb://localhost:27017/stackit
# or for Atlas:
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/