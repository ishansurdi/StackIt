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
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
  - [How to Use](#how-to-use)
    - [User Features](#user-features)
    - [Admin Features](#admin-features)
  - [API Endpoints](#api-endpoints)
    - [User](#user)
    - [Questions](#questions)
    - [Answers](#answers)
    - [Admin](#admin)
  - [Customization](#customization)
  - [Troubleshooting](#troubleshooting)
  - [Demo Video](#demo-video)
  - [Credits](#credits)
  - [License](#license)

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

> ![Home Page](images/screenshots/home.png)
> ![Question Page](images/screenshots/question.png)
> ![Admin Dashboard](images/screenshots/admin.png)

_If you don't have screenshots yet, take them after running the app and place them in `images/screenshots/`._

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
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/stackit?retryWrites=true&w=majority
```

---

## Configuration

- **Environment Variables:**  
  - `MONGO_URI` — MongoDB connection string.
  - (Add more as needed, e.g., `SECRET_KEY` for Flask sessions.)

- **Static Files:**  
  - All static files (CSS, JS, images) are referenced with absolute paths (e.g., `/css/styles.css`, `/images/layers.png`).

---

## Running the Application

1. **Start MongoDB**  
   - If using local MongoDB, ensure the service is running.
   - If using Atlas, ensure your cluster is active and IP whitelisted.

2. **Start the Flask backend**

```sh
cd backend
python app.py
```

- By default, the app runs at [http://localhost:5000](http://localhost:5000).

3. **Access the application**

- **Main site:** [http://localhost:5000/](http://localhost:5000/)
- **Admin panel:** [http://localhost:5000/admin](http://localhost:5000/admin)

---

## How to Use

### User Features

1. **Register an Account**
   - Click on the "Sign Up" or "Register" button.
   - Fill in your username, email, and password.
   - Submit the form to create your account.

2. **Login**
   - Use your credentials to log in.
   - You will be redirected to the home page.

3. **Ask a Question**
   - Click "Ask Question".
   - Fill in the title, description (with rich text, images, or emojis), and select relevant tags.
   - Submit to post your question.

4. **Browse & Search**
   - Use the search bar to find questions.
   - Filter by newest, unanswered, or most voted.

5. **Answer Questions**
   - Click on a question to view details.
   - Use the answer editor to submit your answer.

6. **Upvote & Interact**
   - Upvote helpful questions and answers.
   - Get notifications for activity on your posts.

### Admin Features

1. **Access the Admin Panel**
   - Go to [http://localhost:5000/admin](http://localhost:5000/admin) or click the "Admin" button in the header.

2. **View Users**
   - See a list of all registered users, their emails, and registration dates.

3. **Monitor Content**
   - View all questions and answers posted by each user.

4. **Remove Inappropriate Content**
   - Use the "Remove" button next to any question or answer to delete it from the platform.

5. **User Management**
   - (Extend as needed: ban users, reset passwords, etc.)

---

## API Endpoints

> _Below are some of the main API endpoints. See `app.py` for full details._

### User

- `POST /register` — Register a new user
- `POST /login` — Login

### Questions

- `GET /questions` — List questions (with pagination)
- `POST /questions` — Ask a question
- `GET /questions/<id>` — Get question details
- `DELETE /questions/<id>` — Delete a question (admin)

### Answers

- `POST /questions/<id>/answers` — Post an answer
- `DELETE /answers/<id>` — Delete an answer (admin)

### Admin

- `GET /admin/users` — List all users with their questions/answers
- `DELETE /admin/questions/<id>` — Remove a question
- `DELETE /admin/answers/<id>` — Remove an answer

---

## Customization

- **UI:**  
  - Edit `css/styles.css` and use Tailwind classes in HTML.
  - Change logo in `images/layers.png`.
- **Backend:**  
  - Add more routes or features in `backend/app.py`.
- **Database:**  
  - Use MongoDB Compass or Atlas dashboard to view/edit data.

---

## Troubleshooting

- **Static files not loading:**  
  - Make sure you access the app via `http://localhost:5000/`, not by opening HTML files directly.
  - Check your Flask static file routes.

- **MongoDB connection errors:**  
  - Ensure MongoDB is running and your `MONGO_URI` is correct.

- **CORS or fetch errors:**  
  - Always run the app via Flask, not by double-clicking HTML files.

- **Port already in use:**  
  - Change the port in `app.py` or stop the other process.

- **Admin panel not working:**  
  - Ensure you are accessing via Flask (`http://localhost:5000/admin`), not by opening the HTML file directly.

---

## Demo Video

<!-- [![StackIt Demo]](https://youtu.be/FIN2hGQZobY) -->

> _Click the image or [watch on YouTube](https://youtu.be/FIN2hGQZobY) for a full walkthrough and demo of StackIt!_

---

## Credits

- **Made By:** [Ishan Surdi](https://github.com/ishansurdi)
- **UI Icons:** [Freepik - Flaticon](https://www.flaticon.com/free-icons/graphic-design)


---

## License

MIT License

---

**Enjoy using StackIt! Contributions and feedback are welcome.**