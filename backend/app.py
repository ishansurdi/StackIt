from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
load_dotenv()
db_password = os.getenv("DB_PASSWORD")

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

# MongoDB Atlas connection
client = MongoClient(f"mongodb+srv://ishansurdi:{db_password}@stackit.y9ftesn.mongodb.net/?retryWrites=true&w=majority&appName=StackIt")  # Replace with your full MongoDB URI
db = client["stackit"]
users_col = db["users"]

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


if __name__ == "__main__":
    app.run(debug=True)



