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
  { username: "mainguyen", password: "123", role: "admin" },
  { username: "user1", password: "123", role: "user" }
];

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
  } else {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    startExam();
  }
}

// ================= LOAD DATA =================
fetch("cauhoi.json")
  .then(res => res.json())
  .then(json => {
    data = json;
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

// ================= START EXAM =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let used = new Set();
  let list = [];

  for (let q of wrongPool) {
    if (!used.has(q.question)) {
      used.add(q.question);
      list.push(q);
    }
  }

  for (let q of data) {
    if (!used.has(q.question)) {
      used.add(q.question);
      list.push(q);
    }
    if (list.length >= 100) break;
  }

  let remain = shuffle(data.filter(q => !used.has(q.question)));

  for (let q of remain) {
    if (list.length >= 100) break;
    list.push(q);
  }

  questions = shuffle(list).slice(0, 100);

  render();
  startTimer();
}

// ================= RENDER =================
function render() {
  let q = questions[index];

  app.innerHTML = `
    <div class="box">
      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ <span id="time"></span></div>
      </div>

      <div class="bar">
        <div class="bar-fill" id="bar"></div>
      </div>

      <h2>${q.question}</h2>

      <button class="option" onclick="choose('A')">A. ${q.a}</button>
      <button class="option" onclick="choose('B')">B. ${q.b}</button>
      <button class="option" onclick="choose('C')">C. ${q.c}</button>
      <button class="option" onclick="choose('D')">D. ${q.d}</button>

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

    // Chấp nhận cả map chữ hoa lẫn chữ thường khi người dùng thao tác bấm nút
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
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = q.answer ? q.answer.toString().trim().toLowerCase() : "";
    
    // Nhận dạng an toàn không phân biệt Hoa - Thường (a === A)
    if (userAns === correctAns) {
      correct++;
    } else {
      wrong++;
      newWrong.push(q);
    }
  });

  wrongPool = newWrong;

  // Giữ nguyên giao diện cũ, thêm cụm nút chức năng lọc câu hỏi
  app.innerHTML = `
    <div class="box">
      <h1>KẾT QUẢ</h1>
      <h2>✔ Đúng: ${correct}</h2>
      <h2>❌ Sai: ${wrong}</h2>

      <button class="btn" onclick="startExam()">THI LẠI</button>

      <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
        <button class="nav-btn" style="background: #444; color: white; padding: 6px 12px;" onclick="filterResult('all')">Xem tất cả</button>
        <button class="nav-btn" style="background: green; color: white; padding: 6px 12px;" onclick="filterResult('correct')">Xem câu đúng</button>
        <button class="nav-btn" style="background: #b30000; color: white; padding: 6px 12px;" onclick="filterResult('wrong')">Xem câu sai</button>
      </div>

      <div id="result-list" style="margin-top:20px; text-align: left;">
        </div>
    </div>
  `;

  // Mặc định nộp bài xong sẽ load toàn bộ danh sách
  filterResult('all');
}

// ================= FILTER RESULT LIST =================
function filterResult(type) {
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  let html = "";

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = q.answer ? q.answer.toString().trim().toLowerCase() : "";
    let ok = userAns === correctAns;

    // Logic kiểm tra điều kiện lọc dữ liệu
    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    html += `
      <div style="
        padding:12px;
        border-bottom:1px solid #ddd;
        white-space:pre-wrap;
        line-height:1.6;
        font-family: Arial;
      ">
        <b>Câu ${i + 1}:</b> ${q.question}<br>

        Bạn chọn: ${answers[i] ? answers[i].toUpperCase() : "Không chọn"} | Đáp án đúng: ${q.answer ? q.answer.toUpperCase() : "Không hợp lệ"}<br>

        <div style="
          margin-top:8px;
          font-family: 'Times New Roman', serif;
          text-align: justify;
          font-size: 15px;
          color:#444;
          background:#f9f9f9;
          padding:8px;
          border-radius:6px;
        ">
          💡 <b>Giải thích:</b> ${q.explanation ? q.explanation : "Chưa có giải thích"}
        </div>

        <b style="color:${ok ? 'green' : 'red'}">
          ${ok ? "✔ ĐÚNG" : "❌ SAI"}
        </b>
      </div>
    `;
  });

  listContainer.innerHTML = html || "<p style='text-align:center; color:#777; padding: 20px;'>Không tìm thấy câu hỏi tương ứng trong mục này.</p>";
}
