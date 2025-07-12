from flask import Flask, request, jsonify, render_template, send_from_directory, abort, g
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import datetime
from bson import ObjectId
import re
from bson.regex import Regex

app = Flask(__name__)
CORS(app)

load_dotenv()
db_password = os.getenv("DB_PASSWORD")
mongo_uri = f"mongodb+srv://ishansurdi:{db_password}@stackit.y9ftesn.mongodb.net/?retryWrites=true&w=majority&appName=StackIt"

def get_db():
    if 'mongo_client' not in g:
        g.mongo_client = MongoClient(mongo_uri)
        g.db = g.mongo_client["stackit"]
    return g.db

@app.teardown_appcontext
def close_db(exception):
    mongo_client = g.pop('mongo_client', None)
    if mongo_client:
        mongo_client.close()

@app.route('/')
def home():
    return render_template("index.html")

def create_notification(username, message, notif_type, question_id):
    db = get_db()
    db["notifications"].insert_one({
        "username": username,
        "message": message,
        "type": notif_type,
        "read": False,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "related_question_id": question_id
    })

def extract_mentions(text):
    if not text:
        return []
    return [match[1:] for match in re.findall(r'@\w+', text)]

def contains_offensive_content(text):
    if not text:
        return False
    offensive_words = ["fuck", "shit", "bitch", "asshole", "bastard", "nigger", "slut", "dick", "cunt", "pussy"]
    lower_text = text.lower()
    return any(word in lower_text for word in offensive_words)

@app.route("/signup", methods=["POST"])
def signup():
    db = get_db()
    users_col = db["users"]
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    if users_col.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409

    if users_col.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    user_data = {
        "username": username,
        "email": email,
        "password": password,
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }

    users_col.insert_one(user_data)
    return jsonify({"message": "Signup successful!", "username": username}), 201

@app.route("/login", methods=["POST"])
def login():
    db = get_db()
    users_col = db["users"]
    data = request.get_json()
    username = data["username"]
    password = data["password"]

    user = users_col.find_one({"username": username})

    if not user:
        return jsonify({"error": "User not found"}), 404

    if user["password"] != password:
        return jsonify({"error": "Incorrect password"}), 401

    return jsonify({"message": "Login successful", "username": user["username"]}), 200

@app.route('/ask-question', methods=['POST'])
def ask_question():
    db = get_db()
    questions_col = db["questions"]
    data = request.get_json()
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    if contains_offensive_content(title) or contains_offensive_content(description):
        return jsonify({"error": "Your content contains offensive or restricted words."}), 400

    question = {
        "title": data["title"],
        "description": data["description"],
        "tags": data["tags"],
        "author": data["author"],
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "votes": 0,
        "answers": [],
        "views": 0,
        "hasAcceptedAnswer": False
    }
    questions_col.insert_one(question)
    return jsonify({"message": "Question posted successfully"}), 201

@app.route('/questions', methods=['GET'])
def get_all_questions():
    db = get_db()
    questions_col = db["questions"]
    questions = []
    for q in questions_col.find():
        q["_id"] = str(q["_id"])
        q["upvotes"] = q.get("upvotes", 0)
        questions.append(q)
    return jsonify(questions), 200

@app.route('/question/<id>', methods=['GET'])
def get_single_question(id):
    db = get_db()
    questions_col = db["questions"]
    try:
        question = questions_col.find_one({
            '$or': [
                {'_id': ObjectId(id)},
                {'_id': id}
            ]
        })
        if question:
            question['_id'] = str(question['_id'])
            return jsonify(question), 200
        else:
            return jsonify({'error': 'Question not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Invalid ID: {e}'}), 400

@app.route('/question/<id>/answer', methods=['POST'])
def add_answer(id):
    db = get_db()
    questions_col = db["questions"]
    try:
        question = questions_col.find_one({"_id": ObjectId(id)})
        if question.get("hasAcceptedAnswer"):
            return jsonify({"error": "This question already has an accepted answer. Cannot add more answers."}), 403

        answer_data = request.get_json()
        content = answer_data.get("content", "").strip()
        if contains_offensive_content(content):
            return jsonify({"error": "Your answer contains offensive or restricted words."}), 400

        answer = {
            "author": answer_data["author"],
            "content": answer_data["content"],
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "upvotes": 0,
            "downvotes": 0,
            "accepted": False
        }

        result = questions_col.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"answers": answer}}
        )

        if result.modified_count == 1 and question["author"] != answer_data["author"]:
            create_notification(
                username=question["author"],
                message=f"{answer_data['author']} answered your question: {question['title']}",
                notif_type="answer",
                question_id=id
            )

        mentioned_users = extract_mentions(answer_data["content"])
        for username in mentioned_users:
            create_notification(username, f"You were mentioned in an answer by {answer_data['author']}", "mention", id)

        if result.modified_count == 1:
            return jsonify({"message": "Answer added successfully"}), 201
        else:
            return jsonify({"error": "Failed to add answer"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/question/<question_id>/answer/<int:answer_index>/vote', methods=['POST'])
def vote_answer(question_id, answer_index):
    db = get_db()
    questions_col = db["questions"]
    try:
        data = request.get_json()
        vote_type = data.get('type')
        username = data.get('username')

        if vote_type not in ['up', 'down']:
            return jsonify({'error': 'Invalid vote type'}), 400

        question = questions_col.find_one({"_id": ObjectId(question_id)})
        if not question:
            return jsonify({'error': 'Question not found'}), 404

        answers = question.get("answers", [])
        if answer_index >= len(answers):
            return jsonify({'error': 'Answer not found'}), 404

        answer = answers[answer_index]
        answer.setdefault("voted_users", {})
        previous_vote = answer["voted_users"].get(username)

        if previous_vote == vote_type:
            if vote_type == 'up':
                answer['upvotes'] = max(answer.get('upvotes', 1) - 1, 0)
            else:
                answer['downvotes'] = max(answer.get('downvotes', 1) - 1, 0)
            del answer['voted_users'][username]
        else:
            if previous_vote == 'up':
                answer['upvotes'] = max(answer.get('upvotes', 1) - 1, 0)
            elif previous_vote == 'down':
                answer['downvotes'] = max(answer.get('downvotes', 1) - 1, 0)

            if vote_type == 'up':
                answer['upvotes'] = answer.get('upvotes', 0) + 1
            else:
                answer['downvotes'] = answer.get('downvotes', 0) + 1

            answer['voted_users'][username] = vote_type

        questions_col.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": {f"answers.{answer_index}": answer}}
        )

        return jsonify({"message": "Vote updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/question/<question_id>/answer/<int:index>/accept', methods=['POST'])
def accept_answer(question_id, index):
    db = get_db()
    questions_col = db["questions"]
    data = request.json
    username = data.get('username')

    question = questions_col.find_one({'_id': ObjectId(question_id)})
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    if question['author'] != username:
        return jsonify({'error': 'Only the question owner can accept an answer'}), 403

    answers = question.get('answers', [])
    for i, ans in enumerate(answers):
        answers[i]['accepted'] = False
    answers[index]['accepted'] = True

    questions_col.update_one(
        {'_id': ObjectId(question_id)},
        {'$set': {'answers': answers, 'hasAcceptedAnswer': True}}
    )

    return jsonify({'message': 'Answer marked as accepted'}), 200

@app.route('/notifications/<username>', methods=['GET'])
def get_notifications(username):
    db = get_db()
    try:
        notifications = list(db["notifications"].find({"username": username}).sort("timestamp", -1))
        for n in notifications:
            n["_id"] = str(n["_id"])
            n["timestamp"] = n["timestamp"].isoformat()
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/questions/page/<int:page>', methods=['GET'])
def get_questions_paginated(page):
    db = get_db()
    questions_col = db["questions"]
    per_page = 5
    skip = (page - 1) * per_page
    total = questions_col.count_documents({})

    sort_by = request.args.get('sort')
    sort_condition = [("timestamp", -1)] if sort_by == 'newest' else [("upvotes", -1)] if sort_by == 'upvotes' else None

    cursor = questions_col.find().sort(sort_condition).skip(skip).limit(per_page) if sort_condition else questions_col.find().skip(skip).limit(per_page)
    questions = []
    for q in cursor:
        q["_id"] = str(q["_id"])
        q["upvotes"] = q.get("votes", 0)
        questions.append(q)

    return jsonify({
        "questions": questions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    }), 200

@app.route('/questions/search', methods=['GET'])
def search_questions():
    db = get_db()
    questions_col = db["questions"]
    query = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    per_page = 5
    skip = (page - 1) * per_page

    if not query:
        return jsonify({
            "questions": [], "total": 0, "page": page, "per_page": per_page, "total_pages": 0
        })

    regex = Regex(f".*{query}.*", "i")
    search_filter = {"$or": [{"title": regex}, {"description": regex}]}
    total = questions_col.count_documents(search_filter)
    cursor = questions_col.find(search_filter).sort("timestamp", -1).skip(skip).limit(per_page)

    questions = []
    for q in cursor:
        q["_id"] = str(q["_id"])
        q["upvotes"] = q.get("upvotes", 0)
        questions.append(q)

    return jsonify({
        "questions": questions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    })

@app.route('/questions/unanswered', methods=['GET'])
def get_unanswered_questions():
    db = get_db()
    questions_col = db["questions"]
    page = int(request.args.get('page', 1))
    per_page = 5
    skip = (page - 1) * per_page

    filter_query = {"$or": [{"answers": {"$exists": False}}, {"answers": {"$size": 0}}]}
    total = questions_col.count_documents(filter_query)

    cursor = questions_col.find(filter_query).sort("timestamp", -1).skip(skip).limit(per_page)
    questions = []
    for q in cursor:
        q["_id"] = str(q["_id"])
        q["upvotes"] = q.get("upvotes", 0)
        questions.append(q)

    return jsonify({
        "questions": questions,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page
    })

@app.route("/users", methods=["GET"])
def get_usernames():
    db = get_db()
    users_col = db["users"]
    try:
        users = list(users_col.find({}, {"_id": 0, "username": 1}))
        usernames = [user["username"] for user in users]
        return jsonify(usernames), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin")
def admin_panel():
    return render_template("admin.html")

@app.route('/images/<path:filename>')
def images(filename):
    return send_from_directory('../images', filename)

@app.route('/admin/users', methods=['GET'])
def admin_users():
    db = get_db()
    users_col = db["users"]
    questions_col = db["questions"]
    try:
        users_data = []
        for user in users_col.find():
            user_questions = list(questions_col.find({"author": user["username"]}))
            user_answers = []
            for q in user_questions:
                for a in q.get("answers", []):
                    if a["author"] == user["username"]:
                        user_answers.append({
                            "_id": str(q["_id"]),
                            "content": a["content"]
                        })

            users_data.append({
                "_id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "questions": [{"_id": str(q["_id"]), "title": q["title"]} for q in user_questions],
                "answers": user_answers
            })
        return jsonify(users_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/questions/<question_id>', methods=['DELETE'])
def admin_delete_question(question_id):
    db = get_db()
    questions_col = db["questions"]
    try:
        result = questions_col.delete_one({"_id": ObjectId(question_id)})
        if result.deleted_count == 1:
            return jsonify({"message": "Question deleted"}), 200
        return jsonify({"error": "Question not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/admin/answers/<question_id>', methods=['DELETE'])
def admin_delete_answer(question_id):
    db = get_db()
    questions_col = db["questions"]
    try:
        data = request.get_json()
        content = data.get("content", "").strip()
        if not content:
            return jsonify({"error": "Content required"}), 400

        question = questions_col.find_one({"_id": ObjectId(question_id)})
        if not question:
            return jsonify({"error": "Question not found"}), 404

        old_answers = question.get("answers", [])
        new_answers = [a for a in old_answers if a["content"].strip() != content]

        if len(old_answers) == len(new_answers):
            return jsonify({"error": "Answer not found"}), 404

        questions_col.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": {"answers": new_answers}}
        )

        return jsonify({"message": "Answer deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run()
