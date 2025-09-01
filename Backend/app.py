from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from config import HUGGINGFACE_API_URL, HUGGINGFACE_API_KEY
import db

app = Flask(__name__)
CORS(app)  # allow frontend to call backend

# ---- Hugging Face API call ----
def analyze_sentiment(text):
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    response = requests.post(HUGGINGFACE_API_URL, headers=headers, json={"inputs": text})
    response.raise_for_status()
    result = response.json()[0]

    # HuggingFace returns a list of labels with scores
    best = max(result, key=lambda x: x["score"])
    return {"label": best["label"], "score": round(best["score"], 2)}

# ---- Routes ----
@app.route("/entry", methods=["POST"])
def add_entry():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    sentiment = analyze_sentiment(text)
    entry_id = db.insert_entry(text, sentiment["label"], sentiment["score"])

    return jsonify({
        "id": entry_id,
        "text": text,
        "emotion": sentiment["label"],
        "score": sentiment["score"]
    })

@app.route("/entries", methods=["GET"])
def get_entries():
    rows = db.fetch_entries()
    return jsonify(rows)

if __name__ == "__main__":
    app.run(debug=True)
