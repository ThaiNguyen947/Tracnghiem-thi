let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;

const app = document.getElementById("app");

// ================= USER LIST =================
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

  document.addEventListener("keydown", function (e) {
    if (
      e.ctrlKey &&
      ["c", "x", "u", "s", "a"].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
    }

    if (e.key === "F12") e.preventDefault();

    if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
      e.preventDefault();
    }
  });
}

// ================= LOGIN UI =================
function showLogin() {
  document.getElementById("loginBox").innerHTML = `
    <div class="box" style="max-width:400px;text-align:center;margin-top:120px">
      <h2>Đăng nhập</h2>
      <input id="u" placeholder="Tài khoản" style="width:100%;padding:10px;margin:5px 0">
      <input id="p" type="password" placeholder="Mật khẩu" style="width:100%;padding:10px;margin:5px 0">
      <button onclick="login()" class="btn">Đăng nhập</button>
    </div>
  `;
}

// ================= LOGIN (MASTER + SINGLE DEVICE) =================
function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;
  let deviceId = getDeviceId();

  let user = users.find(x => x.username === u && x.password === p);

  if (!user) return alert("Sai tài khoản");

  // ================= USER THƯỜNG: 1 THIẾT BỊ =================
  if (!user.master) {
    let session = JSON.parse(localStorage.getItem("session_" + user.username));

    if (session && session.deviceId !== deviceId) {
      return alert("Tài khoản đã đăng nhập trên thiết bị khác!");
    }

    localStorage.setItem("session_" + user.username, JSON.stringify({
      deviceId: deviceId,
      loginTime: Date.now()
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

  if (!user) {
    showLogin();
    return;
  }

  user = JSON.parse(user);
  let deviceId = getDeviceId();

  if (!user.master) {
    let session = JSON.parse(localStorage.getItem("session_" + user.username));

    if (!session || session.deviceId !== deviceId) {
      localStorage.removeItem("user");
      alert("Phiên đăng nhập không hợp lệ!");
      showLogin();
      return;
    }
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";

  startExam();
}

// ================= LOAD DATA =================
fetch("cauhoi.json")
  .then(res => res.json())
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

// ================= SMART SHUFFLE =================
function smartShuffleNoRepeat(arr) {
  let a = shuffle(arr);
  let result = [];
  let lastGroup = null;

  while (a.length > 0) {
    let indexToPick = -1;

    for (let i = 0; i < a.length; i++) {
      let g = a[i].group || a[i].topic || "default";

      if (g !== lastGroup) {
        indexToPick = i;
        break;
      }
    }

    if (indexToPick === -1) indexToPick = 0;

    let picked = a.splice(indexToPick, 1)[0];
    lastGroup = picked.group || picked.topic || "default";

    result.push(picked);
  }

  return result;
}

// ================= START EXAM =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let used = new Set();
  let list = [];

  for (let q of wrongPool) {
    let qText = q.question || q.cauhoi;
    if (!used.has(qText)) {
      used.add(qText);
      list.push(q);
    }
  }

  for (let q of data) {
    let qText = q.question || q.cauhoi;
    if (!used.has(qText)) {
      used.add(qText);
      list.push(q);
    }
    if (list.length >= 100) break;
  }

  let remain = shuffle(data.filter(q => !used.has(q.question || q.cauhoi)));

  for (let q of remain) {
    if (list.length >= 100) break;
    list.push(q);
  }

  questions = smartShuffleNoRepeat(list).slice(0, 100);

  render();
  startTimer();
}

// ================= RENDER =================
function render() {
  let q = questions[index];

  let qText = q.question || q.cauhoi;
  let optA = q.a || q.Một || "";
  let optB = q.b || "";
  let optC = q.c || "";
  let optD = q.d || "";

  app.innerHTML = `
    <div class="box" style="user-select:none">
      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ <span id="time"></span></div>
      </div>

      <div class="bar">
        <div class="bar-fill" id="bar"></div>
      </div>

      <h2>${qText}</h2>

      <button class="option" onclick="choose('A')">A. ${optA}</button>
      <button class="option" onclick="choose('B')">B. ${optB}</button>
      <button class="option" onclick="choose('C')">C. ${optC}</button>
      <button class="option" onclick="choose('D')">D. ${optD}</button>

      <div class="nav-control">
        <button onclick="prev()">← Trước</button>
        <button onclick="next()">Sau →</button>
      </div>

      <button class="btn" onclick="submit()">NỘP BÀI</button>
    </div>
  `;

  highlight();
  updateBar();
}

// ================= CHỌN =================
function choose(c) {
  answers[index] = c;
  highlight();
}

// ================= TIMER =================
function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    time--;

    let m = Math.floor(time / 60);
    let s = time % 60;

    document.getElementById("time").innerText =
      `${m}:${s < 10 ? "0" + s : s}`;

    if (time <= 0) submit();
  }, 1000);
}

// ================= SUBMIT =================
function submit() {
  clearInterval(timer);

  let correct = 0;
  let wrong = 0;

  questions.forEach((q, i) => {
    let userAns = (answers[i] || "").toLowerCase();
    let correctAns = (q.answer || q.trảlời || "").toLowerCase();

    if (correctAns === "một") correctAns = "a";

    if (userAns === correctAns) correct++;
    else wrong++;
  });

  app.innerHTML = `
    <div style="text-align:center;padding:40px">
      <h2>KẾT QUẢ</h2>
      <p>Đúng: <b style="color:green">${correct}</b></p>
      <p>Sai: <b style="color:red">${wrong}</b></p>
      <button onclick="location.reload()">Thi lại</button>
    </div>
  `;
}
