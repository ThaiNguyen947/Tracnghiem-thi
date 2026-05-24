// ================= BIẾN TOÀN CỤC =================
let data = [];
let questions = [];
let index = 0;
let answers = {};
let timer;
let time = 60 * 60;
let currentFilter = 'all';

// ================= HỆ THỐNG ĐĂNG NHẬP & BẢO MẬT =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "huyen@", password: "1112233", role: "user" },
  { username: "LONG@", password: "1112233", role: "user" },
  { username: "HOANG@", password: "1112233", role: "user" }
];

function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("deviceId", id); }
  return id;
}

function showLogin() {
  document.getElementById("loginBox").innerHTML = `
    <div class="box" style="max-width:400px;text-align:center;margin-top:120px">
      <h2>Đăng nhập hệ thống</h2>
      <input id="u" placeholder="Tài khoản" style="width:100%;padding:10px;margin:5px 0">
      <input id="p" type="password" placeholder="Mật khẩu" style="width:100%;padding:10px;margin:5px 0">
      <button onclick="login()" class="btn">Đăng nhập</button>
    </div>
  `;
}

function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;
  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản hoặc mật khẩu!");
  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");
  if (user.role !== "admin" && sessions[user.username] && sessions[user.username] !== deviceId) {
    return alert("Tài khoản đang đăng nhập ở thiết bị khác!");
  }
  sessions[user.username] = deviceId;
  localStorage.setItem("loginSessions", JSON.stringify(sessions));
  localStorage.setItem("user", JSON.stringify(user));
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  enableProtectionForSubAccounts();
  startExam();
}

function checkLogin() {
  let user = JSON.parse(localStorage.getItem("user"));
  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");
  if (!user || (user.role !== "admin" && sessions[user.username] !== deviceId)) {
    showLogin();
  } else {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    enableProtectionForSubAccounts();
    startExam();
  }
}

// ================= LOAD DỮ LIỆU TỐI ƯU CHO IOS (LAZY LOADING) =================
async function fetchAllData() {
    const danhSachFiles = ["p1.json", "p2.json", "p3.json", "p4.json", "p5.json", "p6.json", "p7.json", "p8.json", "pcuathay.json"];
    let beCauHoiTong = [];
    for (const file of danhSachFiles) {
        try {
            const res = await fetch(`./cau_hoi/${file}`);
            if (!res.ok) continue;
            const json = await res.json();
            const tag = file.replace('.json', '');
            json.forEach(q => { q.fileSource = tag; q.weight = q.weight || 1; q.correctCount = q.correctCount || 0; q.wrongCount = q.wrongCount || 0; });
            beCauHoiTong = beCauHoiTong.concat(json);
            await new Promise(r => setTimeout(r, 50)); 
        } catch (e) { console.error("Lỗi file: " + file); }
    }
    return beCauHoiTong;
}

// ================= XỬ LÝ THI =================
async function startExam() {
    if (data.length === 0) {
        document.getElementById("app").innerHTML = "<h2>Đang nạp đề... Vui lòng chờ!</h2>";
        data = await fetchAllData();
    }
    answers = {}; index = 0; time = 60 * 60;
    let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");
    let poolCheck = data.filter(q => !correctPool.includes((q.question || q.cauhoi || "").trim()));
    if (poolCheck.length === 0 && data.length > 0) { localStorage.removeItem("correctPool"); correctPool = []; }

    const danhSachFileThucTe = [...new Set(data.map(q => q.fileSource).filter(Boolean))];
    const tongSoCauTrongKho = data.length || 1;
    let khoCauHoiCacFile = {}, chiTieuMoiFile = {};

    danhSachFileThucTe.forEach(fileKey => {
        let tongCauGocCuaFile = data.filter(q => q.fileSource === fileKey).length;
        let quota = Math.max(1, Math.round((tongCauGocCuaFile / tongSoCauTrongKho) * 100));
        chiTieuMoiFile[fileKey] = quota;
        let fileQuestions = shuffle(data.filter(q => q.fileSource === fileKey && !correctPool.includes((q.question || q.cauhoi || "").trim())));
        khoCauHoiCacFile[fileKey] = [...fileQuestions.filter(q => (q.weight > 1 || q.wrongCount > 0)), ...fileQuestions.filter(q => !(q.weight > 1 || q.wrongCount > 0))];
    });

    let finalSelectedList = [];
    danhSachFileThucTe.forEach((fileKey) => {
        let thucTeLay = khoCauHoiCacFile[fileKey].splice(0, chiTieuMoiFile[fileKey]);
        finalSelectedList = finalSelectedList.concat(thucTeLay);
    });

    questions = shuffle(finalSelectedList).slice(0, 100).map(q => {
        let clonedQ = JSON.parse(JSON.stringify(q));
        let raw = (clonedQ.answer || clonedQ.trảlời || "").toString().trim().toLowerCase().replace("một", "a");
        let opts = shuffle([{text:clonedQ.a||clonedQ.A||clonedQ.Một||"",key:'a'}, {text:clonedQ.b||clonedQ.B||"",key:'b'}, {text:clonedQ.c||clonedQ.C||"",key:'c'}, {text:clonedQ.d||clonedQ.D||"",key:'d'}]);
        clonedQ.shuffledOptions = opts;
        clonedQ.newCorrectAnswer = ['a','b','c','d'][opts.findIndex(o => o.key === raw)] || 'a';
        return clonedQ;
    });

    render();
    startTimer();
}

function shuffle(arr) {
    let a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

function render() {
    if (!questions[index]) return;
    let q = questions[index];
    app.innerHTML = `
        <div class="box">
            <div class="top"><div>Câu: ${index + 1}/${questions.length}</div><div>⏱ <span id="time"></span></div></div>
            <div class="bar"><div class="bar-fill" id="bar" style="width:${((index + 1) / questions.length) * 100}%"></div></div>
            <h2>${q.question || q.cauhoi || ""}</h2>
            ${q.shuffledOptions.map((o, i) => `<button class="option" onclick="choose('${['a','b','c','d'][i]}')">${['A','B','C','D'][i]}. ${o.text}</button>`).join('')}
            <div class="nav-control"><button onclick="prev()">Trước</button><button onclick="next()">Sau</button></div>
            <button class="btn" style="background:#b30000; color:#fff" onclick="submit()">NỘP BÀI</button>
            <div id="nav">${questions.map((_, i) => `<button onclick="index=${i};render()">${i+1}</button>`).join('')}</div>
        </div>
    `;
    highlight();
}

function choose(c) { answers[index] = c; highlight(); }
function highlight() { document.querySelectorAll(".option").forEach((b,i) => b.className = (['a','b','c','d'][i] === answers[index] ? "option selected" : "option")); }
function next() { if (index < questions.length - 1) { index++; render(); } }
function prev() { if (index > 0) { index--; render(); } }
function startTimer() { clearInterval(timer); timer = setInterval(() => { time--; let m=Math.floor(time/60), s=time%60; document.getElementById("time").innerText=`${m}:${s<10?'0'+s:s}`; if(time<=0) submit(); }, 1000); }

function submit() {
    clearInterval(timer);
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.newCorrectAnswer) correct++; });
    app.innerHTML = `<div class="box"><h2>Kết quả: ${correct}/${questions.length} câu đúng</h2><button class="btn" onclick="location.reload()">Thi vòng mới</button></div>`;
}

function enableProtectionForSubAccounts() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.body.style.userSelect = "none";
}

// KHỞI ĐỘNG
checkLogin();
