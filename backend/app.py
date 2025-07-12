from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import datetime
from bson import ObjectId

load_dotenv()
db_password = os.getenv("DB_PASSWORD")

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

# MongoDB Atlas connection
client = MongoClient(f"mongodb+srv://ishansurdi:{db_password}@stackit.y9ftesn.mongodb.net/?retryWrites=true&w=majority&appName=StackIt")  # Replace with your full MongoDB URI
db = client["stackit"]
users_col = db["users"]
users_col = db["users"]
questions_col = db["questions"]  # ✅ FIX: define questions_col here

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
        answer_data = request.get_json()
        answer = {
            "author": answer_data["author"],
            "content": answer_data["content"],  # HTML or text
            "timestamp": datetime.datetime.now(datetime.timezone.utc),
            "votes": 0
        }

        result = questions_col.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"answers": answer}}
        )

        if result.modified_count == 1:
            return jsonify({"message": "Answer added successfully"}), 201
        else:
            return jsonify({"error": "Failed to add answer"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)



