from flask import Flask, render_template

app = Flask(__name__)

MAX_RETIRO = 500

@app.get("/")
def home():
    return render_template("index.jinja2", max_retiro=MAX_RETIRO)

if __name__ == "__main__":
    app.run(debug=True)
