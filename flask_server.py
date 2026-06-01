import os, requests
from flask import Flask, send_from_directory, request, Response

app = Flask(__name__)
API_KEY = "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"

@app.route("/")
def index():
    return send_from_directory("public", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)

@app.route("/api/messages", methods=["POST"])
def proxy_claude():
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": API_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
        data=request.get_data(), timeout=60
    )
    return Response(r.content, status=r.status_code, content_type="application/json")

@app.route("/api/arxiv")
def proxy_arxiv():
    q = request.args.get("q", "")
    r = requests.get(f"https://export.arxiv.org/api/query?search_query=all:{q}&start=0&max_results=5&sortBy=relevance", timeout=10)
    return Response(r.content, status=r.status_code, content_type="application/xml")

if __name__ == "__main__":
    print("\n  ARIA running at http://localhost:3000\n")
    app.run(port=3000, debug=False)
