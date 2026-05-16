let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60;

const app = document.getElementById("app");
function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// ================= USER LIST =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "user1", password: "123", role: "user" }
];
let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");
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

// ================= LOGIN =================
function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;

  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản");

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  // ================= CHỐNG 1 THIẾT BỊ =================
  if (user.role !== "admin") {
    if (sessions[user.username] && sessions[user.username] !== deviceId) {
      alert("Tài khoản đã đăng nhập trên thiết bị khác!");
      return;
    }
  }

  // lưu session mới
  sessions[user.username] = deviceId;
  localStorage.setItem("loginSessions", JSON.stringify(sessions));

  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";

  startExam();
}

// ================= CHECK LOGIN =================
function checkLogin() {
  let user = JSON.parse(localStorage.getItem("user"));
  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  if (!user) {
    showLogin();
    return;
  }

  // ===== ADMIN KHÔNG BỊ GIỚI HẠN =====
  if (user.role !== "admin") {
    if (sessions[user.username] !== deviceId) {
      alert("Phiên đăng nhập không hợp lệ (thiết bị khác đã đăng nhập)");

      localStorage.removeItem("user");
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

  // 🔥 thêm trọng số mặc định
  data.forEach(q => {
    q.weight = q.weight || 1;
    q.correctCount = q.correctCount || 0;
    q.wrongCount = q.wrongCount || 0;
  });

  checkLogin();
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
function smartShuffle(arr, groupSize = 3) {
  let groups = [];
  let result = [];

  // chia nhóm nhỏ
  for (let i = 0; i < arr.length; i += groupSize) {
    groups.push(arr.slice(i, i + groupSize));
  }

  // trộn từng nhóm nhỏ
  groups = groups.map(g => shuffle(g));

  // rải kiểu chia bài
  let maxLen = Math.max(...groups.map(g => g.length));

  for (let i = 0; i < maxLen; i++) {
    for (let g of groups) {
      if (g[i]) result.push(g[i]);
    }
  }

  return result;
}
function weightedPick(arr, count) {
  let pool = [...arr];
  let result = [];

  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break;

    // tổng điểm
    let total = pool.reduce((sum, q) => sum + (q.weight || 1), 0);

    // random 1 số từ 0 → tổng điểm
    let r = Math.random() * total;

    let sum = 0;

    for (let j = 0; j < pool.length; j++) {
      sum += (pool[j].weight || 1);

      if (r <= sum) {
        result.push(pool[j]);
        pool.splice(j, 1); // bỏ câu đó ra
        break;
      }
    }
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
    if (!used.has(q.question || q.cauhoi)) {
      used.add(q.question || q.cauhoi);
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

  questions = weightedPick(data, 100);

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
    <div class="box">
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
        <button class="nav-btn" onclick="prev()">← Trước</button>
        <button class="nav-btn" onclick="next()">Sau →</button>
      </div>

      <button class="btn" onclick="submit()">NỘP BÀI</button>

      <div id="nav"></div>
    </div>
  `;

  highlight();
  updateBar();
  renderNav();
}

// ================= CHỌN =================
function choose(c) {
  answers[index] = c;
  highlight();
}

// ================= HIGHLIGHT =================
function highlight() {
  setTimeout(() => {
    document.querySelectorAll(".option")
      .forEach(b => b.classList.remove("selected"));

    let ans = answers[index];
    if (!ans) return;

    const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    let btns = document.querySelectorAll(".option");

    if (btns[map[ans]]) {
      btns[map[ans]].classList.add("selected");
    }
  }, 0);
}

// ================= NAV =================
function renderNav() {
  let nav = document.getElementById("nav");
  nav.innerHTML = "";

  questions.forEach((_, i) => {
    let btn = document.createElement("button");
    btn.innerText = i + 1;

    if (answers[i]) {
      btn.style.background = "#b30000";
      btn.style.color = "white";
    }

    btn.onclick = () => {
      index = i;
      render();
    };

    nav.appendChild(btn);
  });
}

// ================= NEXT / PREV =================
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

// ================= BAR =================
function updateBar() {
  let bar = document.getElementById("bar");
  if (bar) {
    bar.style.width = ((index + 1) / questions.length) * 100 + "%";
  }
}

// ================= TIMER =================
function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    time--;

    let m = Math.floor(time / 60);
    let s = time % 60;

    let el = document.getElementById("time");
    if (el) el.innerText = `${m}:${s < 10 ? "0" + s : s}`;

    if (time <= 0) submit();

  }, 1000);
}

// ================= SUBMIT =================
function submit() {
  clearInterval(timer);

  let correct = 0;
  let wrong = 0;
  let newWrong = [];

  questions.forEach((q, i) => {
  let userAns = answers[i]
    ? answers[i].toString().trim().toLowerCase()
    : "";

  let correctAns = (q.answer || q.trảlời || "")
    .toString()
    .trim()
    .toLowerCase();

  if (correctAns === "một") correctAns = "a";

  // 🔥 đảm bảo có weight
  q.weight = q.weight || 1;
  q.correctCount = q.correctCount || 0;
  q.wrongCount = q.wrongCount || 0;

  if (userAns === correctAns) {
    correct++;
    q.correctCount++;

    // ✔ ĐÚNG → giảm xuất hiện
    q.weight = Math.max(1, q.weight - 0.3);

  } else {
    wrong++;
    newWrong.push(q);
    q.wrongCount++;

    // ❌ SAI → tăng xuất hiện
    q.weight = Math.min(10, q.weight + 1.2);
  }
});
localStorage.setItem("questionData", JSON.stringify(data));
  wrongPool = newWrong;

  // Bao bọc toàn bộ bằng background xám nhạt để làm nổi bật trang giấy A4 màu trắng bên trong
  document.body.style.backgroundColor = "#f4f5f7";
  document.body.style.margin = "0";
  document.body.style.padding = "20px 0";

  app.innerHTML = `
    <div style="
      max-width: 820px; 
      margin: 0 auto; 
      background: #ffffff; 
      padding: 40px 50px; 
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
      border-radius: 4px;
      font-family: 'Times New Roman', Times, serif;
    ">
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111; letter-spacing: 0.5px;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
      <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0;">
        Số câu đúng: <b style="color: green; font-size: 16px;">${correct}</b> | Số câu sai: <b style="color: #b30000; font-size: 16px;">${wrong}</b>
      </p>

      <div style="text-align: center; margin-bottom: 25px;">
        <button class="btn" style="background: #222; color: white; border: none; padding: 8px 24px; font-size: 14px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="location.reload()">THI LẠI TRANG CHỦ</button>
      </div>

      <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 25px; border-bottom: 1px solid #eef0f2; padding-bottom: 15px;">
        <button style="background: #f1f3f5; color: #333; border: 1px solid #dee2e6; padding: 5px 14px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('all')">Tất cả câu hỏi</button>
        <button style="background: #e8f5e9; color: green; border: 1px solid #c8e6c9; padding: 5px 14px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('correct')">Các câu đúng</button>
        <button style="background: #ffebee; color: #c62828; border: 1px solid #ffcdd2; padding: 5px 14px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('wrong')">Các câu sai</button>
      </div>

      <div id="result-list">
        </div>
    </div>
  `;

  filterResult('all');
}

// ================= FILTER RESULT LIST =================
function filterResult(type) {
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  let html = "";

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";
    
    let ok = userAns === correctAns;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    let qText = q.question || q.cauhoi;
    let optA = q.a || q.Một || "";
    let optB = q.b || "";
    let optC = q.c || "";
    let optD = q.d || "";

    // Lấy text đáp án đúng
    let fullCorrectText = "";
    if (correctAns === "a") fullCorrectText = `A. ${optA}`;
    else if (correctAns === "b") fullCorrectText = `B. ${optB}`;
    else if (correctAns === "c") fullCorrectText = `C. ${optC}`;
    else if (correctAns === "d") fullCorrectText = `D. ${optD}`;
    else fullCorrectText = (q.answer || q.trảlời || "Chưa rõ").toUpperCase();

    // Lấy text đáp án người dùng chọn
    let fullUserText = "Không lựa chọn đáp án";
    if (userAns === "a") fullUserText = `A. ${optA}`;
    else if (userAns === "b") fullUserText = `B. ${optB}`;
    else if (userAns === "c") fullUserText = `C. ${optC}`;
    else if (userAns === "d") fullUserText = `D. ${optD}`;

    html += `
      <div style="
        margin-bottom: 24px;
        text-align: justify;
        line-height: 1.5;
        font-size: 15px;
        color: #111;
      ">
        <p style="margin: 0 0 6px 0; padding: 0;"><b>Câu ${i + 1}.</b> ${qText}</p>
        
        <div style="margin: 0 0 6px 0; padding-left: 15px; font-size: 14.5px; color: #333;">
          <div style="margin-bottom: 3px;">
            <span style="color: #666;">- Phương án đã chọn:</span> ${fullUserText} 
            <span style="
              display: inline-block;
              padding: 1px 6px;
              font-size: 11px;
              font-family: 'Times New Roman', Times, serif;
              font-weight: bold;
              border-radius: 3px;
              margin-left: 8px;
              background-color: ${ok ? '#e8f5e9' : '#ffebee'};
              color: ${ok ? 'green' : '#c62828'};
            ">${ok ? "CHÍNH XÁC" : "KHÔNG ĐÚNG"}</span>
          </div>
          ${!ok ? `<div style="margin-bottom: 3px;"><span style="color: #666;">- Đáp án đúng:</span> <b style="color: green;">${fullCorrectText}</b></div>` : ""}
        </div>

        <div style="
          margin: 6px 0 0 15px;
          padding: 4px 0 4px 10px;
          font-style: italic;
          font-size: 14px;
          color: #555;
          border-left: 2px solid #e0e0e0;
        ">
          <b>Cơ sở lý luận (Giải thích):</b> ${q.explanation ? q.explanation : (q.giảithích ? q.giảithích : "Chưa có nội dung giải thích.")}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || "<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy dữ liệu phù hợp với bộ lọc.</p>";
}
