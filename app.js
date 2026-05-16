let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;
let mode = "exam";

const app = document.getElementById("app");

// ================= USER =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin", master: true },
  { username: "user1", password: "123", role: "user", master: false }
];

// ================= DEVICE ID =================
function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// ================= ANTI COPY =================
function antiCopy() {
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("copy", e => e.preventDefault());
  document.addEventListener("cut", e => e.preventDefault());
  document.addEventListener("selectstart", e => e.preventDefault());

  document.addEventListener("keydown", e => {
    if (e.ctrlKey && ["c","x","u","s","a"].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "F12") e.preventDefault();
    if (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key.toUpperCase())) e.preventDefault();
  });
}

// ================= LOGIN =================
function showLogin() {
  document.getElementById("loginBox").innerHTML = `
    <div class="box" style="max-width:400px;margin:120px auto;text-align:center">
      <h2>Đăng nhập</h2>
      <input id="u" placeholder="Tài khoản" style="width:100%;padding:10px;margin:5px 0">
      <input id="p" type="password" placeholder="Mật khẩu" style="width:100%;padding:10px;margin:5px 0">
      <button onclick="login()" class="btn">Đăng nhập</button>
    </div>
  `;
}

// ================= LOGIN LOGIC =================
function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;
  let deviceId = getDeviceId();

  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản");

  // user thường -> 1 thiết bị
  if (!user.master) {
    let session = JSON.parse(localStorage.getItem("session_" + user.username));

    if (session && session.deviceId !== deviceId) {
      return alert("Tài khoản đã đăng nhập thiết bị khác!");
    }

    localStorage.setItem("session_" + user.username, JSON.stringify({
      deviceId,
      time: Date.now()
    }));
  }

  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";

  startExam();
}

// ================= CHECK LOGIN =================
function checkLogin() {
  let user = localStorage.getItem("user");
  if (!user) return showLogin();

  user = JSON.parse(user);
  let deviceId = getDeviceId();

  if (!user.master) {
    let session = JSON.parse(localStorage.getItem("session_" + user.username));

    if (!session || session.deviceId !== deviceId) {
      localStorage.removeItem("user");
      alert("Phiên đăng nhập không hợp lệ!");
      return showLogin();
    }
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";

  startExam();
}

// ================= LOAD DATA =================
fetch("cauhoi.json")
  .then(r => r.json())
  .then(json => {
    data = json;
    checkLogin();
    antiCopy();
  });

// ================= SHUFFLE =================
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= START EXAM =================
function startExam() {
  mode = "exam";
  index = 0;
  answers = {};
  time = 60 * 60;

  let used = new Set();
  let list = [];

  for (let q of wrongPool) {
    let t = q.question || q.cauhoi;
    if (!used.has(t)) {
      used.add(t);
      list.push(q);
    }
  }

  for (let q of data) {
    let t = q.question || q.cauhoi;
    if (!used.has(t)) {
      used.add(t);
      list.push(q);
    }
    if (list.length >= 100) break;
  }

  questions = shuffle(list).slice(0, 100);

  render();
  startTimer();
}

// ================= RENDER =================
function render() {
  if (mode !== "exam") return;

  let q = questions[index];

  app.innerHTML = `
    <div class="box" style="user-select:none">
      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ <span id="time"></span></div>
      </div>

      <h2>${q.question || q.cauhoi}</h2>

      <button onclick="choose('A')">A. ${q.a || ""}</button>
      <button onclick="choose('B')">B. ${q.b || ""}</button>
      <button onclick="choose('C')">C. ${q.c || ""}</button>
      <button onclick="choose('D')">D. ${q.d || ""}</button>

      <div>
        <button onclick="prev()">←</button>
        <button onclick="next()">→</button>
      </div>

      <button onclick="submit()" style="background:red;color:#fff;padding:10px;width:100%">
        NỘP BÀI
      </button>
    </div>
  `;

  highlight();
}

// ================= CHOOSE =================
function choose(c) {
  answers[index] = c;
  highlight();
}

// ================= HIGHLIGHT =================
function highlight() {
  setTimeout(() => {
    let btns = document.querySelectorAll("button");
    let ans = answers[index];
    if (!ans) return;

    btns.forEach(b => b.style.outline = "");
  }, 0);
}

// ================= TIMER =================
function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    time--;

    let m = Math.floor(time / 60);
    let s = time % 60;

    let el = document.getElementById("time");
    if (el) el.innerText = `${m}:${s < 10 ? "0"+s : s}`;

    if (time <= 0) submit();
  }, 1000);
}

// ================= SUBMIT =================
function submit() {
  clearInterval(timer);
  mode = "result";

  let correct = 0;
  let wrong = 0;
  wrongPool = [];

  questions.forEach((q, i) => {
    let user = (answers[i] || "").toLowerCase();
    let ans = (q.answer || q.trảlời || "").toLowerCase();

    if (ans === "một") ans = "a";

    if (user === ans) correct++;
    else {
      wrong++;
      wrongPool.push(q);
    }
  });

  app.innerHTML = `
    <div style="text-align:center;padding:40px">
      <h2>KẾT QUẢ</h2>
      <p>Đúng: <b style="color:green">${correct}</b></p>
      <p>Sai: <b style="color:red">${wrong}</b></p>

      <button onclick="startExam()">Làm lại</button>
    </div>
  `;
}

// ================= NAV =================
function next() {
  if (index < questions.length - 1) {
    index++;
    render();
  }
}

function prev() {
  if (index > 0) {
    index--;
    render();
  }
}
