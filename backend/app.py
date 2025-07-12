from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import datetime
from bson import ObjectId
import re

load_dotenv()
db_password = os.getenv("DB_PASSWORD")

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

# MongoDB Atlas connection
client = MongoClient(f"mongodb+srv://ishansurdi:{db_password}@stackit.y9ftesn.mongodb.net/?retryWrites=true&w=majority&appName=StackIt",
                    )  # Replace with your full MongoDB URI
db = client["stackit"]
users_col = db["users"]
users_col = db["users"]
questions_col = db["questions"]  # ✅ FIX: define questions_col here
def create_notification(username, message, notif_type, question_id):
    db["notifications"].insert_one({
        "username": username,
        "message": message,
        "type": notif_type,
        "read": False,
        "timestamp": datetime.datetime.now(datetime.timezone.utc),
        "related_question_id": question_id
    })

def extract_mentions(text):
    """Extracts all @mentions from a given string."""
    if not text:
        return []
    return [match[1:] for match in re.findall(r'@\w+', text)]

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "Missing fields"}), 400

    # Check if user already exists
    if users_col.find_one({"$or": [{"username": username}, {"email": email}]}):
        return jsonify({"error": "User already exists"}), 409

    # Insert user
    users_col.insert_one({
        "username": username,
        "email": email,
        "password": password  # NOTE: hash in real app!
    })

    return jsonify({"message": "Signup successful"}), 201

@app.route("/login", methods=["POST"])
def login():
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
    data = request.get_json()
    question = {
        "title": data["title"],
        "description": data["description"],
        "tags": data["tags"],
        "author": data["author"],
        "timestamp": datetime.datetime.now(datetime.timezone.utc),  # ✅ FIX: timezone-aware UTC
        "votes": 0,
        "answers": [],
        "views": 0,
        "hasAcceptedAnswer": False
    }
    questions_col.insert_one(question)
    return jsonify({"message": "Question posted successfully"}), 201

@app.route('/questions', methods=['GET'])
def get_all_questions():
    questions = []
    for q in questions_col.find():
        q["_id"] = str(q["_id"])  # Convert ObjectId to string
        q["upvotes"] = q.get("upvotes", 0) 
        questions.append(q)
    return jsonify(questions), 200

@app.route('/question/<id>', methods=['GET'])
def get_single_question(id):
    try:
        question = questions_col.find_one({
            '$or': [
                {'_id': ObjectId(id)},
                {'_id': id}  # Support legacy string-based _id
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
    try:
        question = questions_col.find_one({"_id": ObjectId(id)})

        if question.get("hasAcceptedAnswer"):
            return jsonify({"error": "This question already has an accepted answer. Cannot add more answers."}), 403

        answer_data = request.get_json()
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

         # 🔔 Create notification for question author if someone else answers
        if result.modified_count == 1 and question["author"] != answer_data["author"]:
            create_notification(
                username=question["author"],
                message=f"{answer_data['author']} answered your question: {question['title']}",
                notif_type="answer",
                question_id=id
            )
        mentioned_users = mentioned_users = extract_mentions(answer_data["content"])

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
    try:
        data = request.get_json()
        vote_type = data.get('type')  # 'up' or 'down'
        username = data.get('username')  # Must send from frontend

        if vote_type not in ['up', 'down']:
            return jsonify({'error': 'Invalid vote type'}), 400

        question = questions_col.find_one({"_id": ObjectId(question_id)})
        if not question:
            return jsonify({'error': 'Question not found'}), 404

        answers = question.get("answers", [])
        if answer_index >= len(answers):
            return jsonify({'error': 'Answer not found'}), 404

        answer = answers[answer_index]

        # Initialize vote tracking if missing
        answer.setdefault("voted_users", {})

        previous_vote = answer["voted_users"].get(username)

        # Remove previous vote
        if previous_vote == vote_type:
            if vote_type == 'up':
                answer['upvotes'] = max(answer.get('upvotes', 1) - 1, 0)
            else:
                answer['downvotes'] = max(answer.get('downvotes', 1) - 1, 0)
            del answer['voted_users'][username]
        else:
            # Remove opposite vote if it exists
            if previous_vote == 'up':
                answer['upvotes'] = max(answer.get('upvotes', 1) - 1, 0)
            elif previous_vote == 'down':
                answer['downvotes'] = max(answer.get('downvotes', 1) - 1, 0)

            # Apply new vote
            if vote_type == 'up':
                answer['upvotes'] = answer.get('upvotes', 0) + 1
            else:
                answer['downvotes'] = answer.get('downvotes', 0) + 1

            answer['voted_users'][username] = vote_type

        # Update in DB
        questions_col.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": {f"answers.{answer_index}": answer}}
        )

        return jsonify({"message": "Vote updated successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 

@app.route('/question/<question_id>/answer/<int:index>/accept', methods=['POST'])
def accept_answer(question_id, index):
    data = request.json
    username = data.get('username')

    question = questions_col.find_one({'_id': ObjectId(question_id)})
    if not question:
        return jsonify({'error': 'Question not found'}), 404

    if question['author'] != username:
        return jsonify({'error': 'Only the question owner can accept an answer'}), 403

    answers = question.get('answers', [])

    for i, ans in enumerate(answers):
        answers[i]['accepted'] = False  # Clear previous accepted answer

    answers[index]['accepted'] = True

    questions_col.update_one(
        {'_id': ObjectId(question_id)},
        {
            '$set': {
                'answers': answers,
                'hasAcceptedAnswer': True  # ✅ Ensure this is set
            }
        }
    )

    return jsonify({'message': 'Answer marked as accepted'}), 200

@app.route('/notifications/<username>', methods=['GET'])
def get_notifications(username):
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
    per_page = 5
    skip = (page - 1) * per_page
    total = questions_col.count_documents({})

    sort_by = request.args.get('sort')
    sort_condition = None
    if sort_by == 'newest':
        sort_condition = [("timestamp", -1)]
    elif sort_by == 'upvotes':
        sort_condition = [("upvotes", -1)]

    if sort_condition:
        cursor = questions_col.find().sort(sort_condition).skip(skip).limit(per_page)
    else:
        cursor = questions_col.find().skip(skip).limit(per_page)

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
    }), 200


if __name__ == "__main__":
    app.run(debug=True)



