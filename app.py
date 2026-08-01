from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import os
import requests

app = Flask(__name__, static_folder='static')
DB_PATH = os.path.join(os.path.dirname(__file__), 'chores.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# Static page routes
@app.route('/')
def home():
    return send_from_directory('static', 'dashboard.html')


@app.route('/dashboard')
def dashboard():
    return send_from_directory('static', 'dashboard.html')


@app.route('/parent')
def parent():
    return send_from_directory('static', 'parent.html')


@app.route('/setup')
def setup():
    return send_from_directory('static', 'setup.html')


@app.route('/user.html')
def user_page():
    return send_from_directory('static', 'user.html')


# API: Users
@app.route('/api/users', methods=['GET', 'POST'])
def manage_users():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json()
        cursor.execute("INSERT INTO users (name) VALUES (?)", (data['name'],))
        conn.commit()
        conn.close()
        return {"success": True}, 201

    cursor.execute("SELECT id, name FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users)


@app.route('/api/users/<int:user_id>')
def get_user(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return jsonify(dict(user)) if user else (jsonify({"error": "Not found"}), 404)


# API: Chores
@app.route('/api/chores/<int:user_id>')
def get_chores(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, title, reward, assigned_to, expires_by, days_required, notes
        FROM chores
        WHERE assigned_to = ? AND active = 1
        ORDER BY priority ASC, id ASC
    ''', (user_id,))
    chores = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(chores)


@app.route('/api/chores', methods=['POST'])
def add_chore():
    data = request.get_json()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO chores (
            title, reward, assigned_to, active, expires_by,
            days_required, notes
        ) VALUES (?, ?, ?, 1, ?, ?, ?)
    ''', (
        data['title'],
        data.get('reward', 0) or 0,
        data['assigned_to'],
        data.get('expires_by'),
        data.get('days_required'),
        data.get('notes')
    ))
    conn.commit()
    conn.close()
    return {"success": True}, 201


@app.route('/api/chores/<int:chore_id>/deactivate', methods=['POST'])
def deactivate_chore(chore_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE chores SET active = 0 WHERE id = ?', (chore_id,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.route('/api/chores/<int:chore_id>/assign', methods=['POST'])
def reassign_chore(chore_id):
    data = request.get_json()
    new_assigned_to = data.get('assigned_to')
    if not new_assigned_to:
        return {"error": "Missing assigned_to"}, 400
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE chores SET assigned_to = ? WHERE id = ?',
        (new_assigned_to, chore_id)
    )
    conn.commit()
    conn.close()
    return {"success": True}


# API: Meals
@app.route('/api/meals', methods=['GET', 'POST'])
def manage_meals():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json()
        cursor.execute(
            'INSERT INTO meals (day, meal, type) VALUES (?, ?, ?)',
            (data.get('day'), data.get('meal'), data.get('type', 'dinner'))
        )
        conn.commit()
        conn.close()
        return {"success": True}, 201

    day_order = {
        'Mon': 1, 'Monday': 1,
        'Tue': 2, 'Tuesday': 2,
        'Wed': 3, 'Wednesday': 3,
        'Thu': 4, 'Thursday': 4,
        'Fri': 5, 'Friday': 5,
        'Sat': 6, 'Saturday': 6,
        'Sun': 7, 'Sunday': 7,
    }
    cursor.execute('SELECT id, day, meal, type FROM meals')
    meals = [dict(row) for row in cursor.fetchall()]
    conn.close()
    meals.sort(key=lambda m: (day_order.get(m['day'] or '', 99), m['id']))
    return jsonify(meals)


@app.route('/api/meals/<int:meal_id>', methods=['DELETE'])
def delete_meal(meal_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM meals WHERE id = ?', (meal_id,))
    conn.commit()
    conn.close()
    return {"success": True}


# API: Events
@app.route('/api/events', methods=['GET', 'POST'])
def manage_events():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json()
        cursor.execute(
            'INSERT INTO events (date, title, time, details) VALUES (?, ?, ?, ?)',
            (
                data.get('date'),
                data.get('title'),
                data.get('time'),
                data.get('details'),
            )
        )
        conn.commit()
        conn.close()
        return {"success": True}, 201

    cursor.execute('''
        SELECT id, date, title, time, details
        FROM events
        ORDER BY date ASC, time ASC, id ASC
    ''')
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(events)


@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM events WHERE id = ?', (event_id,))
    conn.commit()
    conn.close()
    return {"success": True}


@app.route('/api/quote')
def proxy_quote():
    try:
        res = requests.get("https://zenquotes.io/api/today", timeout=5)
        return jsonify(res.json())
    except Exception as e:
        return jsonify({"error": "Failed to fetch quote", "details": str(e)}), 502


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
