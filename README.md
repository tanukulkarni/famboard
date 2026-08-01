# Antique Family Planner

A lightweight household board built with Flask and SQLite. Track shared tasks, plan meals, and keep events (including Theo care) in one place. Designed to run on a laptop on your home Wi‑Fi.

---

## Features

### Tasks
- Per-person pages to mark daily/weekly tasks done (completion stored in the browser)
- Manage page to add, reassign, and deactivate tasks
- Tracking-focused (rewards optional; seeded at $0)

### Events & Theo Care
- Add dated events, appointments, and reminders (vet, heartworm meds, etc.)
- Shown on the shared dashboard

### Meal Planning
- Enter weekly meal plans from the Manage page
- Dashboard lists the current plan by day

---

## Tech Stack
- Python 3
- Flask
- SQLite3
- HTML/CSS (static front-end)

---

## Setup (laptop)

### 1. Install Python 3
Download from [python.org](https://www.python.org/downloads/) or use your OS package manager. Confirm with:

```bash
python3 --version
```

### 2. Clone the repository
```bash
git clone <your-repo-url>
cd family-dashboard
```

### 3. Create a virtual environment and install dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Initialize the database and seed household data
```bash
python3 init_db.py
python3 seed_family.py
```

`seed_family.py` clears users/tasks/meals/events and loads TK, AX, starter tasks, sample dinners, and Theo-related events. Re-run anytime to reset to the starter set.

### 5. Run the app
```bash
python3 app.py
```

Open **http://localhost:5000** on the same computer.

### 6. Use another device on home Wi‑Fi (optional)
1. Keep the laptop awake with `python3 app.py` running.
2. Find the laptop’s local IP (examples):
   - macOS/Linux: `ipconfig getifaddr en0` or `hostname -I`
   - Windows: `ipconfig` (look for IPv4 Address)
3. On the phone/tablet, open `http://<laptop-ip>:5000`.
4. If it does not load, allow Python / port **5000** through the laptop firewall.

You do not need a domain, HTTPS, or a Raspberry Pi for this setup.

---

## Pages

| Path | Description |
|------|-------------|
| `/` or `/dashboard` | Shared board: tasks, meals, events, quote |
| `/parent` | Manage tasks, meals, and events |
| `/setup` | Add people and open their task pages |
| `/user.html?id=<id>` | Personal task list (mark done / reset) |

---

## Database Schema

Tables (see `init_db.py`):
- `users`
- `chores` (household tasks)
- `meals`
- `events`

Starter data lives in `seed_family.py`.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for completed work and future ideas.

---

## License
MIT License. Built for home use — modify freely.
