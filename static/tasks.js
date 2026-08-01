/**
 * Shared weekly task completion helpers (browser localStorage).
 * - Daily tasks: stay checked only for today; reopen tomorrow.
 * - Other tasks: stay checked until the week is reset.
 */
(function (global) {
  const STORAGE_KEY = 'homeBoardWeekTasks';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toDateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function getWeekId(d = new Date()) {
    // ISO week id: YYYY-Www
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(weekNo)}`;
  }

  function isDaily(chore) {
    const days = (chore.days_required || '').toLowerCase();
    return days.includes('daily') || days === 'every day';
  }

  function loadState() {
    const weekId = getWeekId();
    const today = toDateStr(new Date());
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      raw = null;
    }

    if (!raw || raw.weekId !== weekId) {
      return { weekId, today, completed: {} };
    }
    return {
      weekId: raw.weekId,
      today,
      completed: raw.completed || {},
    };
  }

  function saveState(state) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        weekId: state.weekId,
        completed: state.completed,
      })
    );
  }

  function isDone(chore, state) {
    const entry = state.completed[String(chore.id)];
    if (!entry) return false;
    if (isDaily(chore)) {
      return entry === state.today;
    }
    return Boolean(entry);
  }

  function setDone(chore, done, state) {
    const key = String(chore.id);
    if (!done) {
      delete state.completed[key];
    } else if (isDaily(chore)) {
      state.completed[key] = state.today;
    } else {
      state.completed[key] = true;
    }
    saveState(state);
  }

  function toggleDone(chore, state) {
    const next = !isDone(chore, state);
    setDone(chore, next, state);
    return next;
  }

  function resetWeek() {
    const weekId = getWeekId();
    saveState({ weekId, completed: {} });
  }

  function storageKeyForUser(userId) {
    // legacy key cleanup helper
    return `userChores_${userId}`;
  }

  function clearLegacyKeys(userIds) {
    (userIds || []).forEach((id) => {
      localStorage.removeItem(storageKeyForUser(id));
    });
  }

  async function fetchUsers() {
    const res = await fetch('/api/users');
    return await res.json();
  }

  async function fillPeopleNav(activeUserId) {
    const slot = document.getElementById('peopleNav');
    if (!slot) return;
    try {
      const users = await fetchUsers();
      if (!users.length) {
        slot.innerHTML = '';
        return;
      }
      slot.innerHTML = users
        .map((u) => {
          const active =
            activeUserId != null && String(u.id) === String(activeUserId)
              ? ' active'
              : '';
          return `<a class="nav-person${active}" href="/user.html?id=${u.id}">${u.name}</a>`;
        })
        .join('');
    } catch (e) {
      slot.innerHTML = '';
    }
  }

  async function fillPersonButtons(containerId) {
    const el = document.getElementById(containerId || 'personButtons');
    if (!el) return;
    try {
      const users = await fetchUsers();
      if (!users.length) {
        el.innerHTML =
          '<p class="empty-note">No people yet — add them on Setup.</p>';
        return;
      }
      el.innerHTML = users
        .map(
          (u) =>
            `<a class="person-btn" href="/user.html?id=${u.id}">${u.name}'s tasks</a>`
        )
        .join('');
    } catch (e) {
      el.innerHTML = '<p class="empty-note">Could not load people.</p>';
    }
  }

  global.HomeTasks = {
    getWeekId,
    isDaily,
    loadState,
    saveState,
    isDone,
    setDone,
    toggleDone,
    resetWeek,
    clearLegacyKeys,
    fetchUsers,
    fillPeopleNav,
    fillPersonButtons,
    STORAGE_KEY,
  };
})(window);
