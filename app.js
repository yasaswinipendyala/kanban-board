// The four columns in order
const COLS = [
  { id: 'todo',       label: 'To Do' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'review',     label: 'Review' },
  { id: 'done',       label: 'Done' },
];

// Sample tasks to start with
let tasks = [
  { id: uid(), title: 'Design system setup',      desc: 'Define colors, typography, and spacing.',      col: 'todo',       priority: 'high', tag: 'purple:Design' },
  { id: uid(), title: 'Implement auth flow',       desc: 'JWT login, refresh tokens, protected routes.', col: 'todo',       priority: 'high', tag: 'blue:Feature' },
  { id: uid(), title: 'Responsive nav component',  desc: 'Mobile hamburger + desktop fixed nav.',        col: 'todo',       priority: 'med',  tag: 'purple:Design' },
  { id: uid(), title: 'API integration layer',     desc: 'Fetch wrapper with error handling.',           col: 'inprogress', priority: 'high', tag: 'blue:API' },
  { id: uid(), title: 'Dashboard widgets',         desc: 'KPI cards with animated counters.',            col: 'inprogress', priority: 'med',  tag: 'blue:Feature' },
  { id: uid(), title: 'Fix input focus ring',      desc: 'Accessible focus indicator on all inputs.',   col: 'inprogress', priority: 'low',  tag: 'amber:Bug' },
  { id: uid(), title: 'Animation polish',          desc: 'Review transitions for smooth 60fps.',         col: 'review',     priority: 'med',  tag: 'green:Perf' },
  { id: uid(), title: 'Component documentation',   desc: 'Storybook stories for shared components.',    col: 'review',     priority: 'low',  tag: 'gray:Docs' },
  { id: uid(), title: 'Onboarding flow',           desc: 'Multi-step wizard with progress save.',       col: 'done',       priority: 'high', tag: 'blue:Feature' },
  { id: uid(), title: 'Dark mode implementation',  desc: 'CSS variables toggle + system preference.',   col: 'done',       priority: 'med',  tag: 'purple:Design' },
];

// State variables
let dragId = null;       // id of card being dragged
let editId = null;       // id of task being edited in modal
let ctxId = null;        // id of task the context menu is open for
let searchQuery = '';    // current search text

// Generate a simple unique id for each task
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Escape HTML to prevent XSS
function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Render ----

function render() {
  const board = document.getElementById('board');
  const query = searchQuery.toLowerCase();

  // Filter tasks by search query
  const filtered = query
    ? tasks.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (t.desc || '').toLowerCase().includes(query)
      )
    : tasks;

  board.innerHTML = '';

  COLS.forEach(function(col) {
    const colTasks = filtered.filter(t => t.col === col.id);

    const column = document.createElement('div');
    column.className = 'column';
    column.dataset.col = col.id;

    column.innerHTML = `
      <div class="column-header">
        <div class="col-header-row">
          <span class="col-title">${col.label}</span>
          <span class="col-count">${colTasks.length}</span>
        </div>
      </div>
      <div class="cards-list" id="list-${col.id}">
        <div class="drop-placeholder" id="ph-${col.id}"></div>
        ${colTasks.map(buildCardHTML).join('')}
      </div>
      <button class="btn-add-card" onclick="openModal('${col.id}')">+ Add task</button>
    `;

    board.appendChild(column);

    // Attach drag-and-drop listeners to the column
    column.addEventListener('dragover', onDragOver);
    column.addEventListener('drop', onDrop);
    column.addEventListener('dragleave', onDragLeave);
  });

  // Attach listeners to each card
  document.querySelectorAll('.card').forEach(function(card) {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
  });

  // Attach listeners to each card's menu button
  document.querySelectorAll('.card-menu-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openContextMenu(e, btn.dataset.id);
    });
  });

  updateProgress();
  updateCount();
}

// Build the HTML string for a single card
function buildCardHTML(task) {
  const parts = (task.tag || 'gray:Task').split(':');
  const tagColor = parts[0];
  const tagLabel = parts[1];
  const priorityLabel = task.priority === 'high' ? 'High' : task.priority === 'med' ? 'Medium' : 'Low';

  return `
    <div class="card" draggable="true" data-id="${task.id}" id="card-${task.id}">
      ${task.col === 'done' ? '<div class="badge-done">Done</div>' : ''}
      <div class="card-title-row">
        <span class="card-title">${escHtml(task.title)}</span>
        <button class="card-menu-btn" data-id="${task.id}">&#8943;</button>
      </div>
      ${task.desc ? `<div class="card-desc">${escHtml(task.desc)}</div>` : ''}
      <div class="card-footer">
        <span class="tag tag-${tagColor}">${tagLabel}</span>
        <span class="priority priority-${task.priority}">
          <span class="priority-dot"></span>
          ${priorityLabel}
        </span>
      </div>
    </div>
  `;
}

// Update the progress bar at the bottom of the page
function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter(t => t.col === 'done').length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('boardProgress').style.width = percent + '%';
}

// Update the task count shown in the header
function updateCount() {
  const count = tasks.length;
  document.getElementById('taskCount').textContent = count + ' task' + (count !== 1 ? 's' : '');
}

// ---- Drag and drop ----

function onDragStart(e) {
  dragId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.column').forEach(function(col) {
    col.classList.remove('drag-over');
  });
}

function onDragOver(e) {
  e.preventDefault();
  const targetCol = e.currentTarget.dataset.col;
  const task = tasks.find(t => t.id === dragId);
  // Only highlight if we're dragging to a different column
  if (!task || task.col === targetCol) return;
  e.currentTarget.classList.add('drag-over');
}

function onDragLeave(e) {
  // Only remove highlight if we've left the column entirely
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('drag-over');
  }
}

function onDrop(e) {
  e.preventDefault();
  const targetCol = e.currentTarget.dataset.col;
  const task = tasks.find(t => t.id === dragId);

  if (task && task.col !== targetCol) {
    task.col = targetCol;
    const col = COLS.find(c => c.id === targetCol);
    showToast('Moved to ' + col.label);
    render();
  }

  e.currentTarget.classList.remove('drag-over');
}

// ---- Modal (add / edit task) ----

function openModal(col, id) {
  col = col || 'todo';
  editId = id || null;

  if (id) {
    // Fill in existing task data for editing
    const task = tasks.find(t => t.id === id);
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.desc || '';
    document.getElementById('taskCol').value = task.col;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskTag').value = task.tag || 'blue:Feature';
  } else {
    // Clear the form for a new task
    document.getElementById('modalTitle').textContent = 'New Task';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskCol').value = col;
    document.getElementById('taskPriority').value = 'med';
    document.getElementById('taskTag').value = 'blue:Feature';
  }

  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(function() {
    document.getElementById('taskTitle').focus();
    document.getElementById('taskTitle').select();
  }, 150);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editId = null;
}

function saveTask() {
  const titleInput = document.getElementById('taskTitle');
  const title = titleInput.value.trim();

  // Highlight the title field if it's empty
  if (!title) {
    titleInput.style.borderColor = 'var(--red)';
    setTimeout(function() {
      titleInput.style.borderColor = '';
    }, 1500);
    return;
  }

  const taskData = {
    title: title,
    desc: document.getElementById('taskDesc').value.trim(),
    col: document.getElementById('taskCol').value,
    priority: document.getElementById('taskPriority').value,
    tag: document.getElementById('taskTag').value,
  };

  if (editId) {
    // Update existing task
    const index = tasks.findIndex(t => t.id === editId);
    tasks[index] = Object.assign({}, tasks[index], taskData);
    showToast('Task updated');
  } else {
    // Create new task
    taskData.id = uid();
    tasks.push(taskData);
    showToast('Task created');
  }

  closeModal();
  render();
}

// ---- Context menu ----

function openContextMenu(e, id) {
  ctxId = id;

  const menu = document.getElementById('contextMenu');
  menu.classList.add('open');

  const task = tasks.find(t => t.id === id);
  const colIndex = COLS.findIndex(c => c.id === task.col);

  // Dim move buttons if already at the start or end
  document.getElementById('ctxMoveNext').style.opacity = colIndex < COLS.length - 1 ? '1' : '0.4';
  document.getElementById('ctxMovePrev').style.opacity = colIndex > 0 ? '1' : '0.4';

  // Position the menu near the cursor
  let x = e.clientX;
  let y = e.clientY;
  if (x + 160 > window.innerWidth) x -= 160;
  if (y + 140 > window.innerHeight) y -= 140;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

function closeContextMenu() {
  document.getElementById('contextMenu').classList.remove('open');
  ctxId = null;
}

document.getElementById('ctxEdit').onclick = function() {
  const id = ctxId;
  closeContextMenu();
  openModal(null, id);
};

document.getElementById('ctxDelete').onclick = function() {
  tasks = tasks.filter(t => t.id !== ctxId);
  closeContextMenu();
  showToast('Task deleted');
  render();
};

document.getElementById('ctxMoveNext').onclick = function() {
  const task = tasks.find(t => t.id === ctxId);
  const idx = COLS.findIndex(c => c.id === task.col);
  if (idx < COLS.length - 1) {
    task.col = COLS[idx + 1].id;
    render();
    showToast('Moved forward');
  }
  closeContextMenu();
};

document.getElementById('ctxMovePrev').onclick = function() {
  const task = tasks.find(t => t.id === ctxId);
  const idx = COLS.findIndex(c => c.id === task.col);
  if (idx > 0) {
    task.col = COLS[idx - 1].id;
    render();
    showToast('Moved back');
  }
  closeContextMenu();
};

// Close context menu when clicking anywhere else
document.addEventListener('click', function(e) {
  if (!e.target.closest('.context-menu')) {
    closeContextMenu();
  }
});

// Close modal or context menu on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeModal();
    closeContextMenu();
  }
});

// Close modal when clicking on the dark overlay behind it
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === document.getElementById('modalOverlay')) {
    closeModal();
  }
});

// Live filter cards as user types in the search box
document.getElementById('searchInput').addEventListener('input', function(e) {
  searchQuery = e.target.value;
  render();
});

// ---- Toast notification ----

let toastTimer;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() {
    toast.classList.remove('show');
  }, 2500);
}

// Start the app
render();
