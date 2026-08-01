/**
 * Shared weekly task completion helpers (browser localStorage).
 * - Repeating tasks (Daily / Weekdays / Mon,Wed…): one checkbox per day
 * - One-off / weekly tasks: a single "done this week" checkbox
 * - Reset week clears everything for the current ISO week
 */
(function (global) {
  const STORAGE_KEY = 'homeBoardWeekTasks_v2';
  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function getWeekId(d = new Date()) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${pad(weekNo)}`;
  }

  function dayKeysForChore(chore) {
    const raw = (chore.days_required || '').trim();
    const lower = raw.toLowerCase();
    if (!raw) return null;
    if (lower.includes('daily') || lower.includes('every day')) return ALL_DAYS.slice();
    if (lower.includes('weekday')) return WEEKDAYS.slice();

    const found = ALL_DAYS.filter((day) => {
      const re = new RegExp(`\\b${day.toLowerCase()}\\b`, 'i');
      return re.test(lower) || lower.includes(day.toLowerCase());
    });
    // Prefer explicit day lists only when at least one day token matched cleanly
    if (found.length >= 2 || (found.length === 1 && /mon|tue|wed|thu|fri|sat|sun/i.test(lower))) {
      return found;
    }
    return null;
  }

  function isMultiDay(chore) {
    return Boolean(dayKeysForChore(chore));
  }

  function loadState() {
    const weekId = getWeekId();
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (e) {
      raw = null;
    }

    if (!raw || raw.weekId !== weekId) {
      return { weekId, completed: {} };
    }
    return {
      weekId: raw.weekId,
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

  function isWeekDone(chore, state) {
    const entry = state.completed[String(chore.id)];
    return entry === true;
  }

  function isDayDone(chore, day, state) {
    const entry = state.completed[String(chore.id)];
    if (!entry || typeof entry !== 'object') return false;
    return Boolean(entry[day]);
  }

  function setWeekDone(chore, done, state) {
    const key = String(chore.id);
    if (done) state.completed[key] = true;
    else delete state.completed[key];
    saveState(state);
  }

  function setDayDone(chore, day, done, state) {
    const key = String(chore.id);
    let entry = state.completed[key];
    if (!entry || typeof entry !== 'object') entry = {};
    if (done) entry[day] = true;
    else delete entry[day];
    if (Object.keys(entry).length === 0) delete state.completed[key];
    else state.completed[key] = entry;
    saveState(state);
  }

  function progressForChore(chore, state) {
    const days = dayKeysForChore(chore);
    if (!days) {
      return { done: isWeekDone(chore, state) ? 1 : 0, total: 1 };
    }
    const done = days.filter((d) => isDayDone(chore, d, state)).length;
    return { done, total: days.length };
  }

  function progressForChores(chores, state) {
    return chores.reduce(
      (acc, chore) => {
        const p = progressForChore(chore, state);
        acc.done += p.done;
        acc.total += p.total;
        return acc;
      },
      { done: 0, total: 0 }
    );
  }

  function isFullyDone(chore, state) {
    const p = progressForChore(chore, state);
    return p.total > 0 && p.done === p.total;
  }

  function resetWeek() {
    const weekId = getWeekId();
    saveState({ weekId, completed: {} });
  }

  function clearLegacyKeys(userIds) {
    localStorage.removeItem('homeBoardWeekTasks');
    (userIds || []).forEach((id) => {
      localStorage.removeItem(`userChores_${id}`);
    });
  }

  function shortDay(day) {
    return day.slice(0, 1);
  }

  /** Compact board: one shared Mon–Sun header, aligned checkboxes per task. */
  function renderTaskBoard(chores, state, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'task-board-compact';

    const multi = chores.filter((c) => dayKeysForChore(c));
    const once = chores.filter((c) => !dayKeysForChore(c));

    if (multi.length) {
      const grid = document.createElement('div');
      grid.className = 'week-grid';

      const head = document.createElement('div');
      head.className = 'week-grid-row week-grid-head';
      head.innerHTML = `<span class="week-grid-task">Task</span>${ALL_DAYS.map(
        (d) => `<span class="week-grid-day">${shortDay(d)}</span>`
      ).join('')}`;
      grid.appendChild(head);

      multi.forEach((chore) => {
        const allowed = new Set(dayKeysForChore(chore));
        const p = progressForChore(chore, state);
        const row = document.createElement('div');
        row.className =
          'week-grid-row' + (isFullyDone(chore, state) ? ' done' : '');

        const name = document.createElement('div');
        name.className = 'week-grid-task';
        name.innerHTML = `<span class="week-grid-title">${chore.title}</span>
          <span class="week-grid-meta">${chore.days_required || ''} · ${p.done}/${p.total}</span>`;
        row.appendChild(name);

        ALL_DAYS.forEach((day) => {
          const cell = document.createElement('div');
          cell.className = 'week-grid-cell';
          if (!allowed.has(day)) {
            cell.innerHTML = '<span class="week-grid-skip">·</span>';
          } else {
            const label = document.createElement('label');
            label.className = 'week-grid-check';
            const checked = isDayDone(chore, day, state);
            label.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} aria-label="${chore.title} ${day}" />`;
            label.querySelector('input').addEventListener('change', (e) => {
              const latest = loadState();
              setDayDone(chore, day, e.target.checked, latest);
              if (onChange) onChange();
            });
            cell.appendChild(label);
          }
          row.appendChild(cell);
        });

        grid.appendChild(row);
      });

      wrap.appendChild(grid);
    }

    if (once.length) {
      const list = document.createElement('div');
      list.className = 'once-list';
      if (multi.length) {
        const label = document.createElement('p');
        label.className = 'once-list-label';
        label.textContent = 'Once this week';
        list.appendChild(label);
      }
      once.forEach((chore) => {
        const row = document.createElement('label');
        row.className =
          'once-row' + (isWeekDone(chore, state) ? ' done' : '');
        const checked = isWeekDone(chore, state);
        row.innerHTML = `
          <input type="checkbox" ${checked ? 'checked' : ''} />
          <span class="once-row-text">
            <span class="once-row-title">${chore.title}</span>
            <span class="once-row-meta">${chore.days_required || 'This week'}</span>
          </span>
        `;
        row.querySelector('input').addEventListener('change', (e) => {
          const latest = loadState();
          setWeekDone(chore, e.target.checked, latest);
          if (onChange) onChange();
        });
        list.appendChild(row);
      });
      wrap.appendChild(list);
    }

    if (!chores.length) {
      wrap.innerHTML = '<p class="empty-note">No active tasks</p>';
    }

    return wrap;
  }

  /** @deprecated use renderTaskBoard for groups; kept for single-chore callers */
  function renderTaskRow(chore, state, onChange) {
    return renderTaskBoard([chore], state, onChange);
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
    ALL_DAYS,
    WEEKDAYS,
    getWeekId,
    dayKeysForChore,
    isMultiDay,
    loadState,
    saveState,
    isWeekDone,
    isDayDone,
    setWeekDone,
    setDayDone,
    progressForChore,
    progressForChores,
    isFullyDone,
    resetWeek,
    clearLegacyKeys,
    renderTaskRow,
    renderTaskBoard,
    fetchUsers,
    fillPeopleNav,
    fillPersonButtons,
    STORAGE_KEY,
  };
})(window);
