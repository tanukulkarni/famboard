"""
Seed household data for TK, AX, and Theo-related care events.

WARNING: This clears users, chores, meals, and events, then reloads starter data.
Run after init_db.py:

    python3 init_db.py
    python3 seed_family.py
"""
import sqlite3
from datetime import date, timedelta

DB_PATH = 'chores.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("Clearing existing users, chores, meals, and events...")
cursor.execute('DELETE FROM chores')
cursor.execute('DELETE FROM meals')
cursor.execute('DELETE FROM events')
cursor.execute('DELETE FROM users')

# Users: TK and AX (Theo care lives on Events)
cursor.execute("INSERT INTO users (name) VALUES (?)", ('TK',))
tk_id = cursor.lastrowid
cursor.execute("INSERT INTO users (name) VALUES (?)", ('AX',))
ax_id = cursor.lastrowid
print(f"Users created: TK (id={tk_id}), AX (id={ax_id})")

tk_chores = [
    ('Laundry', 'Weekly'),
    ('Dishes', 'Daily'),
    ('Cook dinner', 'Daily'),
    ('Pack lunch', 'Weekdays'),
    ('Brush dog', 'Daily'),
]

ax_chores = [
    ('Gym', 'Daily'),
    ('Take out trash', 'Weekly'),
    ('Clean bathroom', 'Weekly'),
    ('Drop off Theo to daycare', 'Weekdays'),
    ("Brush dog's teeth", 'Weekly'),
]

for title, days in tk_chores:
    cursor.execute('''
        INSERT INTO chores (title, reward, assigned_to, active, days_required, notes)
        VALUES (?, 0, ?, 1, ?, ?)
    ''', (title, tk_id, days, ''))

for title, days in ax_chores:
    cursor.execute('''
        INSERT INTO chores (title, reward, assigned_to, active, days_required, notes)
        VALUES (?, 0, ?, 1, ?, ?)
    ''', (title, ax_id, days, ''))

print(f"Seeded {len(tk_chores) + len(ax_chores)} tasks")

# Sample dinner week (replace via Manage page)
sample_meals = [
    ('Mon', 'Spaghetti & salad', 'dinner'),
    ('Tue', 'Stir fry', 'dinner'),
    ('Wed', 'Tacos', 'dinner'),
    ('Thu', 'Sheet-pan chicken', 'dinner'),
    ('Fri', 'Takeout / pizza night', 'dinner'),
    ('Sat', 'Grill night', 'dinner'),
    ('Sun', 'Soup & leftovers', 'dinner'),
]
for day, meal, meal_type in sample_meals:
    cursor.execute(
        'INSERT INTO meals (day, meal, type) VALUES (?, ?, ?)',
        (day, meal, meal_type)
    )
print(f"Seeded {len(sample_meals)} meals")

today = date.today()
# Next Monday-style placeholders relative to today for easy editing
events = [
    (today.isoformat(), 'Heartworm medication', 'Morning', 'Theo — monthly preventative'),
    ((today + timedelta(days=14)).isoformat(), 'Vet appointment', '10:00 AM', 'Theo — checkup (edit date as needed)'),
    ((today + timedelta(days=3)).isoformat(), 'Daycare reminder', None, 'Theo — confirm drop-off schedule'),
]
for event_date, title, time, details in events:
    cursor.execute(
        'INSERT INTO events (date, title, time, details) VALUES (?, ?, ?, ?)',
        (event_date, title, time, details)
    )
print(f"Seeded {len(events)} events (Theo care + reminders)")

conn.commit()
conn.close()
print("Family seed complete.")
