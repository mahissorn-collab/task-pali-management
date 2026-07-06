import {
  initFirebase,
  isFirebaseEnabled,
  loadRemoteState,
  saveRemoteState,
  signInWithEmail,
  signOutUser
} from "./firebase-service.js";

const statuses = ["รอรับงาน", "กำลังดำเนินการ", "รอข้อมูลเพิ่มเติม", "ส่งงานแล้ว", "เสร็จสิ้น", "เกินกำหนด"];
const priorities = ["ปกติ", "สำคัญ", "เร่งด่วน"];
const storageKey = "pali-task-management-v1";
const authStorageKey = "pali-task-management-auth-v1";
const defaultPassword = "1234";
const defaultEmails = ["admin@pali.local", "leader@pali.local", "register@pali.local", "document@pali.local"];
const adminEmails = ["krichabhak@gmail.com", "mahissorn@gmail.com"];

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

let state = loadState();
let authSession = loadAuthSession();
let currentView = "admin";
let draggedTaskId = null;
let remoteReady = false;
let editingMemberId = "";

const elements = {
  loginScreen: document.getElementById("loginScreen"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginAccount: document.getElementById("loginAccount"),
  loginAccountLabel: document.getElementById("loginAccountLabel"),
  loginError: document.getElementById("loginError"),
  loginHint: document.getElementById("loginHint"),
  logoutButton: document.getElementById("logoutButton"),
  viewTitle: document.getElementById("viewTitle"),
  currentUser: document.getElementById("currentUser"),
  currentUserName: document.getElementById("currentUserName"),
  currentUserRole: document.getElementById("currentUserRole"),
  sidebarStatusDashboard: document.getElementById("sidebarStatusDashboard"),
  stats: document.getElementById("stats"),
  searchInput: document.getElementById("searchInput"),
  priorityFilter: document.getElementById("priorityFilter"),
  statusFilter: document.getElementById("statusFilter"),
  adminView: document.getElementById("adminView"),
  leaderView: document.getElementById("leaderView"),
  staffView: document.getElementById("staffView"),
  memberForm: document.getElementById("memberForm"),
  memberName: document.getElementById("memberName"),
  memberEmail: document.getElementById("memberEmail"),
  memberRole: document.getElementById("memberRole"),
  memberSubmitButton: document.getElementById("memberSubmitButton"),
  cancelMemberEdit: document.getElementById("cancelMemberEdit"),
  memberList: document.getElementById("memberList"),
  taskTable: document.getElementById("taskTable"),
  teamLoad: document.getElementById("teamLoad"),
  focusList: document.getElementById("focusList"),
  leaderKanban: document.getElementById("leaderKanban"),
  staffKanban: document.getElementById("staffKanban"),
  staffBoardTitle: document.getElementById("staffBoardTitle"),
  taskDialog: document.getElementById("taskDialog"),
  taskForm: document.getElementById("taskForm"),
  dialogTitle: document.getElementById("dialogTitle"),
  taskId: document.getElementById("taskId"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  assignedDate: document.getElementById("assignedDate"),
  dueDate: document.getElementById("dueDate"),
  assigner: document.getElementById("assigner"),
  assignee: document.getElementById("assignee"),
  priority: document.getElementById("priority"),
  status: document.getElementById("status"),
  evidenceLink: document.getElementById("evidenceLink"),
  deleteTask: document.getElementById("deleteTask")
};

function loadAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey)) || null;
  } catch {
    localStorage.removeItem(authStorageKey);
    return null;
  }
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const repaired = repairSavedThaiText(parsed);
      if (repaired.changed) localStorage.setItem(storageKey, JSON.stringify(repaired.state));
      return normalizeState(repaired.state);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  return createDefaultState();
}

function createDefaultState() {
  return {
    members: [
      { id: crypto.randomUUID(), name: "พระมหาสมชาย", role: "ผู้ดูแลระบบ" },
      { id: crypto.randomUUID(), name: "แม่ชีวราภรณ์", role: "หัวหน้า" },
      { id: crypto.randomUUID(), name: "เจ้าหน้าที่ทะเบียน", role: "ทีมงาน" },
      { id: crypto.randomUUID(), name: "เจ้าหน้าที่เอกสาร", role: "ทีมงาน" }
    ],
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "ตรวจรายชื่อผู้เข้าสอบบาลี",
        description: "ตรวจสอบความถูกต้องของรายชื่อ เลขประจำตัวสอบ และสนามสอบก่อนส่งประกาศ",
        assignedDate: todayIso(),
        dueDate: addDays(5),
        assigner: "แม่ชีวราภรณ์",
        assignee: "เจ้าหน้าที่ทะเบียน",
        priority: "เร่งด่วน",
        status: "กำลังดำเนินการ",
        evidenceLink: "https://drive.google.com/"
      },
      {
        id: crypto.randomUUID(),
        title: "รวบรวมเอกสารรับรองสนามสอบ",
        description: "ติดตามหนังสือรับรองและจัดเก็บหลักฐานลงแฟ้มกลาง",
        assignedDate: todayIso(),
        dueDate: addDays(9),
        assigner: "แม่ชีวราภรณ์",
        assignee: "เจ้าหน้าที่เอกสาร",
        priority: "สำคัญ",
        status: "รอข้อมูลเพิ่มเติม",
        evidenceLink: ""
      },
      {
        id: crypto.randomUUID(),
        title: "จัดทำรายงานสรุปงานประจำสัปดาห์",
        description: "สรุปจำนวนงานค้าง งานเสร็จ และประเด็นที่ต้องเสนอหัวหน้า",
        assignedDate: todayIso(),
        dueDate: addDays(2),
        assigner: "พระมหาสมชาย",
        assignee: "แม่ชีวราภรณ์",
        priority: "ปกติ",
        status: "รอรับงาน",
        evidenceLink: ""
      }
    ]
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (remoteReady) saveRemoteState(state).catch(console.error);
}

function authAccounts() {
  return state.members.map((member, index) => ({
    name: member.name,
    role: member.role,
    email: member.email || defaultEmails[index] || `user${index + 1}@pali.local`,
    password: member.password || defaultPassword
  }));
}

function memberByAuthEmail() {
  if (!authSession?.email) return null;
  return state.members.find((member, index) => {
    const email = (member.email || defaultEmails[index] || "").toLowerCase();
    return email === authSession.email.toLowerCase();
  }) || null;
}

function isAdminEmail(email = authSession?.email) {
  if (!email) return false;
  return adminEmails.some((adminEmail) => adminEmail.toLowerCase() === email.toLowerCase());
}

function normalizedRole(role) {
  return repairMojibakeThai(String(role || ""));
}

function isAdminRole(role) {
  return normalizedRole(role).includes("ผู้ดูแลระบบ");
}

function adminRoleLabel() {
  return state.members.find((member) => isAdminRole(member.role))?.role || "ผู้ดูแลระบบ";
}

function activeAccount() {
  if (!authSession?.email) return null;
  const member = memberByAuthEmail();
  if (isAdminEmail()) {
    const adminMember = member || state.members.find((item) => isAdminRole(item.role));
    return {
      name: member?.name || adminMember?.name || authSession.email,
      role: adminRoleLabel(),
      email: authSession.email,
      password: ""
    };
  }

  if (member) {
    return {
      name: member.name,
      role: member.role,
      email: member.email || authSession.email,
      password: member.password || ""
    };
  }

  return {
    name: authSession.name || authSession.email,
    role: "ผู้ใช้งาน",
    email: authSession.email,
    password: ""
  };
}

function currentMember() {
  return memberByAuthEmail() || state.members.find((item) => item.name === elements.currentUser.value) || null;
}

function currentUserRole() {
  if (isAdminEmail()) return adminRoleLabel();
  return memberByAuthEmail()?.role || activeAccount()?.role || authSession?.role || "";
}

function canManageMembers() {
  return isAdminEmail() || isAdminRole(currentUserRole()) || isAdminRole(authSession?.role);
}

function claimInitialAdminEmail() {
  if (!authSession?.email) return false;
  if (!isAdminEmail()) return false;
  const adminMember = state.members.find((member) => isAdminRole(member.role));
  if (!adminMember) return false;
  adminMember.email = authSession.email;
  authSession.name = adminMember.name;
  authSession.role = adminMember.role;
  localStorage.setItem(authStorageKey, JSON.stringify(authSession));
  saveState();
  return true;
}

function renderLoginOptions() {
  const accounts = authAccounts();
  if (!elements.loginAccount) return;
  if (remoteReady) {
    elements.loginAccountLabel.hidden = true;
    elements.loginHint.textContent = "เข้าใช้งานได้เฉพาะอีเมล์ที่ผู้ดูแลระบบกำหนดสิทธิ์ไว้";
    if (elements.loginEmail.value.endsWith("@pali.local")) elements.loginEmail.value = "";
    if (elements.loginPassword.value === defaultPassword) elements.loginPassword.value = "";
    return;
  }

  elements.loginAccountLabel.hidden = false;
  elements.loginHint.textContent = "บัญชีเริ่มต้น: admin@pali.local / 1234";
  elements.loginAccount.innerHTML = accounts.map((account) => `
    <option value="${escapeAttribute(account.email)}">${escapeHtml(account.name)} - ${escapeHtml(account.role)}</option>
  `).join("");

  const selectedEmail = elements.loginEmail.value || accounts[0]?.email || "";
  elements.loginAccount.value = accounts.some((account) => account.email === selectedEmail) ? selectedEmail : accounts[0]?.email || "";
}

function firebaseLoginMessage(error) {
  const code = error?.code || "";
  if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
    return "ไม่พบบัญชีนี้ใน Firebase Authentication หรือรหัสผ่านไม่ถูกต้อง";
  }
  if (code === "auth/wrong-password") return "รหัสผ่านไม่ถูกต้อง";
  if (code === "auth/invalid-email") return "รูปแบบอีเมล์ไม่ถูกต้อง";
  if (code === "auth/too-many-requests") return "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (code === "auth/unauthorized-domain") {
    return "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Auth ให้เพิ่ม 127.0.0.1 และโดเมนเว็บจริงใน Authorized domains";
  }
  if (code === "permission-denied") return "เข้าสู่ระบบได้แล้ว แต่ Firestore Rules ยังไม่อนุญาตให้อ่าน/เขียนข้อมูล";
  return `เข้าสู่ระบบไม่สำเร็จ (${code || "ไม่ทราบสาเหตุ"})`;
}

function applyAuthState() {
  const account = activeAccount();
  const isLoggedIn = Boolean(account);
  document.body.classList.toggle("logged-in", isLoggedIn);
  document.body.classList.toggle("logged-out", !isLoggedIn);

  if (account && elements.currentUser) {
    elements.currentUser.value = account.name;
    renderLoginSummary();
  }

  if (!account) {
    renderLoginOptions();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = elements.loginEmail.value.trim().toLowerCase();
  const password = elements.loginPassword.value;
  elements.loginError.textContent = "";

  if (remoteReady) {
    try {
      const credential = await signInWithEmail(email, password);
      const user = credential.user;
      const account = authAccounts().find((item) => item.email.toLowerCase() === user.email.toLowerCase());
      authSession = {
        email: user.email,
        name: account?.name || user.email,
        role: account?.role || "ผู้ใช้งาน",
        signedInAt: new Date().toISOString()
      };
      localStorage.setItem(authStorageKey, JSON.stringify(authSession));
      const remoteState = await loadRemoteState();
      if (remoteState) {
        state = normalizeState(remoteState);
        localStorage.setItem(storageKey, JSON.stringify(state));
      } else {
        await saveRemoteState(state);
      }
      claimInitialAdminEmail();
      if (account) elements.currentUser.value = account.name;
      applyAuthState();
      render();
    } catch (error) {
      elements.loginError.textContent = firebaseLoginMessage(error);
    }
    return;
  }

  const account = authAccounts().find((item) => item.email.toLowerCase() === email && item.password === password);

  if (!account) {
    elements.loginError.textContent = "อีเมล์หรือรหัสผ่านไม่ถูกต้อง";
    return;
  }

  authSession = { email: account.email, name: account.name, signedInAt: new Date().toISOString() };
  localStorage.setItem(authStorageKey, JSON.stringify(authSession));
  elements.loginError.textContent = "";
  elements.currentUser.value = account.name;
  applyAuthState();
  render();
}

async function logout() {
  authSession = null;
  localStorage.removeItem(authStorageKey);
  if (remoteReady) await signOutUser();
  if (elements.loginPassword) elements.loginPassword.value = defaultPassword;
  applyAuthState();
}

function normalizeState(value) {
  if (!value || !Array.isArray(value.members) || !Array.isArray(value.tasks)) {
    return createDefaultState();
  }

  return {
    members: value.members,
    tasks: value.tasks
  };
}

function repairSavedThaiText(value) {
  let changed = false;

  const repairValue = (item) => {
    if (typeof item === "string") {
      const repaired = repairMojibakeThai(item);
      if (repaired !== item) changed = true;
      return repaired;
    }

    if (Array.isArray(item)) return item.map(repairValue);

    if (item && typeof item === "object") {
      return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, repairValue(entry)]));
    }

    return item;
  };

  return { state: repairValue(value), changed };
}

function repairMojibakeThai(text) {
  if (!/[เธเน]/.test(text)) return text;

  const bytes = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code >= 0x0e01 && code <= 0x0e5b) {
      bytes.push(code - 0x0d60);
    } else if (code >= 0x80 && code <= 0x9f) {
      bytes.push(code);
    } else {
      return text;
    }
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    return /[\u0e01-\u0e5b]/.test(decoded) ? decoded : text;
  } catch {
    return text;
  }
}

function filteredTasks(scope = "all", options = {}) {
  const query = elements.searchInput.value.trim().toLowerCase();
  const priority = elements.priorityFilter.value;
  const status = elements.statusFilter.value;
  const user = elements.currentUser.value;
  const ignoreStatus = options.ignoreStatus === true;

  return state.tasks.filter((task) => {
    const searchText = [task.title, task.description, task.assigner, task.assignee, task.evidenceLink].join(" ").toLowerCase();
    const inScope = scope === "staff" ? task.assignee === user : true;
    return inScope &&
      (priority === "all" || task.priority === priority) &&
      (ignoreStatus || status === "all" || effectiveStatus(task) === status) &&
      (!query || searchText.includes(query));
  });
}

function isOverdue(task) {
  return task.dueDate < todayIso() && task.status !== "เสร็จสิ้น";
}

function effectiveStatus(task) {
  return isOverdue(task) ? "เกินกำหนด" : task.status;
}

function render() {
  normalizeOverdueTasks();
  renderLoginOptions();
  renderSelects();
  applyAuthState();
  renderSidebarStatusDashboard();
  renderStats();
  renderMembers();
  renderTaskTable();
  renderLeader();
  renderStaff();
}

function renderSidebarStatusDashboard() {
  if (!elements.sidebarStatusDashboard) return;
  const total = state.tasks.length || 1;
  const rows = statuses.map((status) => {
    const count = state.tasks.filter((task) => effectiveStatus(task) === status).length;
    return [status, count, Math.round((count / total) * 100)];
  });

  elements.sidebarStatusDashboard.innerHTML = rows.map(([status, count, percent]) => `
    <div class="sidebar-status-row" data-status="${escapeAttribute(status)}">
      <div>
        <span>${escapeHtml(status)}</span>
        <strong>${count}</strong>
      </div>
      <div class="sidebar-status-track">
        <div class="sidebar-status-bar" data-status="${escapeAttribute(status)}" style="width:${percent}%"></div>
      </div>
      <small>${percent}%</small>
    </div>
  `).join("");
}

function normalizeOverdueTasks() {
  let changed = false;
  state.tasks = state.tasks.map((task) => {
    if (isOverdue(task) && task.status !== "เกินกำหนด") {
      changed = true;
      return { ...task, status: "เกินกำหนด" };
    }
    return task;
  });
  if (changed) saveState();
}

function renderSelects() {
  const account = activeAccount();
  const currentUser = account?.name || elements.currentUser.value || state.members[0]?.name || "";
  const currentStatusFilter = elements.statusFilter.value || "all";
  const currentAssigner = elements.assigner.value;
  const currentAssignee = elements.assignee.value;
  const memberOptions = state.members.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)}</option>`).join("");
  elements.currentUser.innerHTML = memberOptions;
  elements.assigner.innerHTML = memberOptions;
  elements.assignee.innerHTML = memberOptions;
  elements.currentUser.value = state.members.some((member) => member.name === currentUser) ? currentUser : "";
  elements.assigner.value = state.members.some((member) => member.name === currentAssigner) ? currentAssigner : elements.currentUser.value;
  elements.assignee.value = state.members.some((member) => member.name === currentAssignee) ? currentAssignee : elements.currentUser.value;

  elements.status.innerHTML = statuses.map((status) => `<option>${status}</option>`).join("");
  elements.statusFilter.innerHTML = `<option value="all">ทุกสถานะ</option>${statuses.map((status) => `<option>${status}</option>`).join("")}`;
  elements.statusFilter.value = statuses.includes(currentStatusFilter) ? currentStatusFilter : "all";
  renderLoginSummary();
}

function renderLoginSummary() {
  const account = activeAccount();
  if (!account) return;
  if (elements.currentUserName) elements.currentUserName.textContent = account.name;
  if (elements.currentUserRole) elements.currentUserRole.textContent = account.role;
}

function renderStats() {
  const scope = currentView === "staff" ? "staff" : "all";
  const tasks = filteredTasks(scope, { ignoreStatus: true });
  const activeStatus = elements.statusFilter.value || "all";
  const stats = [
    ["งานทั้งหมด", tasks.length, "all"],
    ["กำลังดำเนินการ", tasks.filter((task) => effectiveStatus(task) === "กำลังดำเนินการ").length, "กำลังดำเนินการ"],
    ["รอข้อมูล", tasks.filter((task) => effectiveStatus(task) === "รอข้อมูลเพิ่มเติม").length, "รอข้อมูลเพิ่มเติม"],
    ["เกินกำหนด", tasks.filter((task) => effectiveStatus(task) === "เกินกำหนด").length, "เกินกำหนด"],
    ["เสร็จสิ้น", tasks.filter((task) => effectiveStatus(task) === "เสร็จสิ้น").length, "เสร็จสิ้น"]
  ];

  elements.stats.innerHTML = stats.map(([label, value, filter]) => `
    <button type="button" class="stat-card ${activeStatus === filter ? "active" : ""}" data-status-tab="${escapeAttribute(filter)}" aria-pressed="${activeStatus === filter}">
      <span>${label}</span>
      <strong>${value}</strong>
    </button>
  `).join("");
}

function renderMembers() {
  const canManage = canManageMembers();
  elements.memberForm.hidden = !canManage;
  elements.memberList.innerHTML = `
    <div class="member-list-head">
      <span>รายชื่อทีม</span>
      <span>ตำแหน่งหน้าที่</span>
      <span>${canManage ? "" : "สิทธิ์"}</span>
    </div>
    ${state.members.map((member) => `
      <div class="member-row">
        <strong>${escapeHtml(member.name)}${member.email ? `<small>${escapeHtml(member.email)}</small>` : ""}</strong>
        <span class="role role-pill">${escapeHtml(member.role)}</span>
        ${canManage ? `
          <div class="member-actions">
            <button type="button" class="edit-member-button" data-edit-member="${member.id}">แก้ไข</button>
            <button type="button" data-remove-member="${member.id}">ลบ</button>
          </div>
        ` : `<span class="readonly-pill">ดูเท่านั้น</span>`}
      </div>
    `).join("")}
  `;
}

function renderTaskTable() {
  const tasks = filteredTasks();
  elements.taskTable.innerHTML = tasks.length ? tasks.map((task) => `
    <tr>
      <td><strong>${escapeHtml(task.title)}</strong><br><span class="role">${escapeHtml(task.description)}</span></td>
      <td>${escapeHtml(task.assignee)}</td>
      <td>${formatDate(task.dueDate)}</td>
      <td>${statusPill(effectiveStatus(task))}</td>
      <td>${priorityPill(task.priority)}</td>
      <td class="task-actions"><button type="button" data-edit-task="${task.id}">แก้ไข</button></td>
    </tr>
  `).join("") : `<tr><td colspan="6"><div class="empty">ยังไม่มีงานตามเงื่อนไขที่เลือก</div></td></tr>`;
}

function renderLeader() {
  const tasks = filteredTasks();
  elements.teamLoad.innerHTML = state.members.map((member) => {
    const memberTasks = state.tasks.filter((task) => task.assignee === member.name);
    const done = memberTasks.filter((task) => task.status === "เสร็จสิ้น").length;
    const percent = memberTasks.length ? Math.round((done / memberTasks.length) * 100) : 0;
    return `
      <div class="load-row">
        <strong>${escapeHtml(member.name)}</strong>
        <span class="role">${member.role} · งาน ${memberTasks.length} รายการ · เสร็จ ${done} รายการ</span>
        <div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div>
      </div>
    `;
  }).join("");

  const focusTasks = [...tasks]
    .filter((task) => task.priority === "เร่งด่วน" || task.status === "เกินกำหนด" || daysUntil(task.dueDate) <= 3)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);

  elements.focusList.innerHTML = focusTasks.length ? focusTasks.map((task) => `
    <article class="focus-item">
      <strong>${escapeHtml(task.title)}</strong>
      <span class="role">${escapeHtml(task.assignee)} · กำหนด ${formatDate(task.dueDate)}</span>
      <div class="task-meta">${statusPill(effectiveStatus(task))}${priorityPill(task.priority)}</div>
    </article>
  `).join("") : `<div class="empty">ยังไม่มีงานที่ต้องเร่งติดตาม</div>`;

  renderKanban(elements.leaderKanban, tasks, false);
}

function renderStaff() {
  const user = elements.currentUser.value;
  elements.staffBoardTitle.textContent = `งานของ ${user || "ทีมงาน"}`;
  renderKanban(elements.staffKanban, filteredTasks("staff"), true);
}

function renderKanban(container, tasks, canDrag) {
  container.innerHTML = statuses.map((status) => {
    const columnTasks = tasks.filter((task) => effectiveStatus(task) === status);
    return `
      <div class="kanban-column" data-drop-status="${status}">
        <div class="column-title">
          <span>${status}</span>
          <span class="pill">${columnTasks.length}</span>
        </div>
        ${columnTasks.length ? columnTasks.map((task) => taskCard(task, canDrag)).join("") : `<div class="empty">ไม่มีงาน</div>`}
      </div>
    `;
  }).join("");
}

function taskCard(task, canDrag) {
  const link = task.evidenceLink ? `<a href="${escapeAttribute(task.evidenceLink)}" target="_blank" rel="noreferrer">เปิดหลักฐาน</a>` : "";
  return `
    <article class="task-card" ${canDrag ? `draggable="true"` : ""} data-task-card="${task.id}">
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description)}</p>
      <div class="task-meta">
        ${priorityPill(task.priority)}
        <span class="pill">กำหนด ${formatDate(task.dueDate)}</span>
      </div>
      <p class="role">ผู้มอบหมาย: ${escapeHtml(task.assigner)}<br>ผู้รับผิดชอบ: ${escapeHtml(task.assignee)}</p>
      <div class="task-actions">
        <button type="button" data-edit-task="${task.id}">แก้ไข</button>
        ${link}
      </div>
    </article>
  `;
}

function priorityPill(priority) {
  return `<span class="pill priority-${priority}" data-priority="${escapeAttribute(priority)}">${priority}</span>`;
}

function statusPill(status) {
  return `<span class="pill status-${status}" data-status="${escapeAttribute(status)}">${status}</span>`;
}

function setView(view) {
  currentView = view;
  const labels = { admin: "ผู้ดูแลระบบ", leader: "หัวหน้าทีม", staff: "ทีมงาน" };
  elements.viewTitle.textContent = labels[view];
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${view}View`).classList.add("active");
  render();
}

function openTaskDialog(taskId = "") {
  const task = state.tasks.find((item) => item.id === taskId);
  elements.dialogTitle.textContent = task ? "แก้ไขงาน" : "เพิ่มงานใหม่";
  elements.deleteTask.style.display = task ? "inline-flex" : "none";
  elements.taskId.value = task?.id || "";
  elements.taskTitle.value = task?.title || "";
  elements.taskDescription.value = task?.description || "";
  elements.assignedDate.value = task?.assignedDate || todayIso();
  elements.dueDate.value = task?.dueDate || addDays(7);
  elements.assigner.value = task?.assigner || elements.currentUser.value;
  elements.assignee.value = task?.assignee || elements.currentUser.value;
  elements.priority.value = task?.priority || priorities[0];
  elements.status.value = task?.status || statuses[0];
  elements.evidenceLink.value = task?.evidenceLink || "";
  elements.taskDialog.showModal();
}

function saveTask(event) {
  event.preventDefault();
  const payload = {
    title: elements.taskTitle.value.trim(),
    description: elements.taskDescription.value.trim(),
    assignedDate: elements.assignedDate.value,
    dueDate: elements.dueDate.value,
    assigner: elements.assigner.value,
    assignee: elements.assignee.value,
    priority: elements.priority.value,
    status: elements.status.value,
    evidenceLink: elements.evidenceLink.value.trim()
  };

  if (elements.taskId.value) {
    state.tasks = state.tasks.map((task) => task.id === elements.taskId.value ? { ...task, ...payload } : task);
  } else {
    state.tasks.unshift({ id: crypto.randomUUID(), ...payload });
  }

  saveState();
  elements.taskDialog.close();
  render();
}

function deleteCurrentTask() {
  const id = elements.taskId.value;
  if (!id) return;
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveState();
  elements.taskDialog.close();
  render();
}

function addMember(event) {
  event.preventDefault();
  if (!canManageMembers()) return;
  const name = elements.memberName.value.trim();
  const email = elements.memberEmail.value.trim().toLowerCase();
  if (!name || !email) return;

  const duplicate = state.members.some((member) =>
    member.id !== editingMemberId && (member.name === name || member.email?.toLowerCase() === email)
  );
  if (duplicate) return;

  if (editingMemberId) {
    const currentMember = state.members.find((member) => member.id === editingMemberId);
    if (!currentMember) return resetMemberForm();
    const oldName = currentMember.name;
    state.members = state.members.map((member) => member.id === editingMemberId
      ? { ...member, name, email, role: elements.memberRole.value }
      : member
    );
    state.tasks = state.tasks.map((task) => ({
      ...task,
      assigner: task.assigner === oldName ? name : task.assigner,
      assignee: task.assignee === oldName ? name : task.assignee
    }));
    if (elements.currentUser.value === oldName) elements.currentUser.value = name;
  } else {
    state.members.push({ id: crypto.randomUUID(), name, email, role: elements.memberRole.value });
  }

  resetMemberForm();
  saveState();
  render();
}

function editMember(id) {
  if (!canManageMembers()) return;
  const member = state.members.find((item) => item.id === id);
  if (!member) return;
  editingMemberId = id;
  elements.memberName.value = member.name;
  elements.memberEmail.value = member.email || "";
  elements.memberRole.value = member.role;
  elements.memberSubmitButton.textContent = "บันทึก";
  elements.cancelMemberEdit.hidden = false;
  elements.memberName.focus();
}

function resetMemberForm() {
  editingMemberId = "";
  elements.memberForm.reset();
  elements.memberSubmitButton.textContent = "เพิ่ม";
  elements.cancelMemberEdit.hidden = true;
}

function removeMember(id) {
  if (!canManageMembers()) return;
  if (editingMemberId === id) resetMemberForm();
  const member = state.members.find((item) => item.id === id);
  if (!member) return;
  state.members = state.members.filter((item) => item.id !== id);
  state.tasks = state.tasks.filter((task) => task.assignee !== member.name && task.assigner !== member.name);
  saveState();
  render();
}

function updateTaskStatus(taskId, status) {
  state.tasks = state.tasks.map((task) => task.id === taskId ? { ...task, status } : task);
  saveState();
  render();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function daysUntil(value) {
  const target = new Date(`${value}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.getElementById("openTaskDialog").addEventListener("click", () => openTaskDialog());
document.getElementById("closeDialog").addEventListener("click", () => elements.taskDialog.close());
document.getElementById("cancelTask").addEventListener("click", () => elements.taskDialog.close());
elements.taskForm.addEventListener("submit", saveTask);
elements.deleteTask.addEventListener("click", deleteCurrentTask);
elements.memberForm.addEventListener("submit", addMember);
elements.cancelMemberEdit.addEventListener("click", resetMemberForm);
elements.loginForm.addEventListener("submit", handleLogin);
elements.loginAccount.addEventListener("change", () => {
  elements.loginEmail.value = elements.loginAccount.value;
  elements.loginError.textContent = "";
});
elements.loginEmail.addEventListener("input", () => {
  const accounts = authAccounts();
  const email = elements.loginEmail.value.trim();
  if (accounts.some((account) => account.email === email)) {
    elements.loginAccount.value = email;
  }
  elements.loginError.textContent = "";
});
elements.logoutButton.addEventListener("click", logout);

[elements.searchInput, elements.priorityFilter, elements.statusFilter, elements.currentUser].forEach((input) => {
  input.addEventListener("input", render);
  input.addEventListener("change", render);
});

document.addEventListener("click", (event) => {
  const statusTab = event.target.closest("[data-status-tab]");
  if (statusTab) {
    elements.statusFilter.value = statusTab.dataset.statusTab;
    render();
  }

  const editButton = event.target.closest("[data-edit-task]");
  if (editButton) openTaskDialog(editButton.dataset.editTask);

  const editMemberButton = event.target.closest("[data-edit-member]");
  if (editMemberButton) editMember(editMemberButton.dataset.editMember);

  const removeButton = event.target.closest("[data-remove-member]");
  if (removeButton) removeMember(removeButton.dataset.removeMember);
});

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-task-card]");
  if (!card) return;
  draggedTaskId = card.dataset.taskCard;
  card.classList.add("dragging");
});

document.addEventListener("dragend", (event) => {
  const card = event.target.closest("[data-task-card]");
  if (card) card.classList.remove("dragging");
  draggedTaskId = null;
});

document.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-drop-status]")) event.preventDefault();
});

document.addEventListener("drop", (event) => {
  const column = event.target.closest("[data-drop-status]");
  if (!column || !draggedTaskId) return;
  event.preventDefault();
  updateTaskStatus(draggedTaskId, column.dataset.dropStatus);
});

async function bootstrap() {
  try {
    remoteReady = await initFirebase();
  } catch (error) {
    console.warn("Firebase is not ready. The app will use local storage.", error);
    remoteReady = false;
  }

  claimInitialAdminEmail();
  renderLoginOptions();
  applyAuthState();
  render();
}

bootstrap();
