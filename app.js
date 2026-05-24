let data = [];
let questions = [];
let wrongPool = [];

let index = 0;
let answers = {};
let timer;
let time = 60 * 60; // 60 phút
let currentFilter = 'all'; 

const app = document.getElementById("app");

function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// ================= DANH SÁCH TÀI KHOẢN =================
const users = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "huyen@", password: "1112233", role: "user" },
   { username: "LONG@", password: "1112233", role: "user" },
   { username: "HOANG@", password: "1112233", role: "user" }
];
let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

// ================= GIAO DIỆN ĐĂNG NHẬP =================
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

// ================= XỬ LÝ ĐĂNG NHẬP =================
function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;

  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản hoặc mật khẩu!");

  // Kiểm tra khóa
  let lockedAccounts = JSON.parse(localStorage.getItem("lockedAccounts") || "[]");
  if (lockedAccounts.includes(user.username)) {
    return alert("Tài khoản của bạn đã bị khóa do vi phạm quy định!");
  }

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  // Kiểm tra trùng thiết bị
  if (user.role !== "admin") {
    if (sessions[user.username] && sessions[user.username] !== deviceId) {
      lockedAccounts.push(user.username);
      localStorage.setItem("lockedAccounts", JSON.stringify(lockedAccounts));
      return alert("CẢNH BÁO: Phát hiện đăng nhập trên thiết bị lạ. Tài khoản đã bị KHÓA!");
    }
  }

  sessions[user.username] = deviceId;
  localStorage.setItem("loginSessions", JSON.stringify(sessions));
  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  
  enableProtectionForSubAccounts();
  if (user.role === "admin") renderAdminPanel();
  startExam();
}
// ================= KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP =================
function checkLogin() {
  let user = JSON.parse(localStorage.getItem("user"));
  if (!user) return showLogin();

  let lockedAccounts = JSON.parse(localStorage.getItem("lockedAccounts") || "[]");
  if (lockedAccounts.includes(user.username)) {
    localStorage.removeItem("user");
    alert("Tài khoản đã bị khóa!");
    return showLogin();
  }

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  if (user.role !== "admin" && sessions[user.username] !== deviceId) {
    lockedAccounts.push(user.username);
    localStorage.setItem("lockedAccounts", JSON.stringify(lockedAccounts));
    localStorage.removeItem("user");
    alert("Phát hiện truy cập trái phép. Tài khoản đã bị khóa!");
    return showLogin();
  }

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  enableProtectionForSubAccounts();
  if (user.role === "admin") renderAdminPanel();
  startExam();
}

function renderAdminPanel() {
  let user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "admin") return;

  let lockedAccounts = JSON.parse(localStorage.getItem("lockedAccounts") || "[]");
  let adminBox = document.getElementById("admin-panel");
  
  if (!adminBox) {
    adminBox = document.createElement("div");
    adminBox.id = "admin-panel";
    adminBox.style.cssText = "margin: 20px auto; padding: 20px; border: 2px dashed #b30000; max-width: 800px; background: #fff;";
    document.getElementById("app").prepend(adminBox);
  }

  let html = `<h3 style="color:#b30000">Quản trị Admin - Danh sách tài khoản bị khóa:</h3>`;
  if (lockedAccounts.length === 0) {
    html += `<p>Không có tài khoản nào bị khóa.</p>`;
  } else {
    lockedAccounts.forEach(u => {
      html += `<div style="margin-bottom: 10px;"><b>${u}</b> 
        <button onclick="unlockAccount('${u}')" style="cursor:pointer; background:green; color:white; border:none; padding:5px 10px;">Mở khóa</button>
      </div>`;
    });
  }
  adminBox.innerHTML = html;
}

function unlockAccount(username) {
  let lockedAccounts = JSON.parse(localStorage.getItem("lockedAccounts") || "[]");
  let index = lockedAccounts.indexOf(username);
  if (index > -1) {
    lockedAccounts.splice(index, 1);
    localStorage.setItem("lockedAccounts", JSON.stringify(lockedAccounts));
    alert("Đã mở khóa tài khoản: " + username);
    renderAdminPanel(); // Cập nhật lại giao diện
  }
}
// ================= TỰ ĐỘNG NẠP TẤT CẢ FILE JSON CÓ TRONG THƯ MỤC =================
async function taiTatCaDuLieuCauHoi() {
  const danhSachFiles = [
    "./cau_hoi/p1.json",
    "./cau_hoi/p2.json",
    "./cau_hoi/p3.json",
    "./cau_hoi/p4.json",
    "./cau_hoi/p5.json",
    "./cau_hoi/p6.json",
    "./cau_hoi/p7.json",
    "./cau_hoi/p8.json",
    "./cau_hoi/pcuathay.json"
  ];
  
  let beCauHoiTong = [];

  console.log("=== BẮT ĐẦU KIỂM TRA VÀ TẢI DỮ LIỆU FILE ===");
  for (const duongDan of danhSachFiles) {
    try {
      const res = await fetch(duongDan);
      if (!res.ok) throw new Error();
      const json = await res.json();
      
      const fileTag = duongDan.split('/').pop().replace('.json', '');
      json.forEach(q => { q.fileSource = fileTag; });

      console.log(`✓ Tải thành công: ${duongDan} | Quy mô: ${json.length} câu.`);
      beCauHoiTong = beCauHoiTong.concat(json);
    } catch (err) {
      console.error(`❌ Không tìm thấy hoặc sai cấu trúc định dạng tại file: ${duongDan}`);
    }
  }

  console.log(`➡️ TỔNG SỐ CÂU HỎI THỰC TẾ LOAD ĐƯỢC: ${beCauHoiTong.length} câu.`);
  console.log("=================================================");

  if (beCauHoiTong.length === 0) return [];

  beCauHoiTong.forEach(q => {
    q.weight = q.weight || 1;
    q.correctCount = q.correctCount || 0;
    q.wrongCount = q.wrongCount || 0;
  });

  return beCauHoiTong;
}

// ================= KHỞI ĐỘNG HỆ THỐNG =================
async function khoiDongUngDung() {
  const fileData = await taiTatCaDuLieuCauHoi();
  
  if (fileData.length === 0) {
    // Nếu không tải được file mới, ta thử đọc trạng thái cũ (stats)
    // Nhưng không còn lưu questionData đầy đủ nữa
    alert("Không thể tải dữ liệu từ server. Vui lòng kiểm tra lại kết nối hoặc thư mục cau_hoi.");
    return;
  }

  // 1. Chỉ lấy các con số trạng thái từ bộ nhớ (Rất nhẹ)
  const stats = JSON.parse(localStorage.getItem("questionStats") || "{}");

  // 2. Map trạng thái vào fileData vừa tải về (RAM)
  fileData.forEach(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    if (stats[qText]) {
      const s = stats[qText];
      q.weight = s.w || 1;
      q.correctCount = s.c || 0;
      q.wrongCount = s.wr || 0;
    } else {
      // Khởi tạo nếu chưa có
      q.weight = 1;
      q.correctCount = 0;
      q.wrongCount = 0;
    }
  });

  data = fileData;
  
  // 3. KHÔNG DÙNG localStorage.setItem("questionData", ...) NỮA
  // Chỉ lưu các con số trạng thái để đồng bộ
  updateStatsAndSave(); 
  
  checkLogin();
}

// Hàm hỗ trợ lưu trạng thái gọn nhẹ
function updateStatsAndSave() {
  let stats = {};
  data.forEach(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    stats[qText] = { 
      w: q.weight || 1, 
      c: q.correctCount || 0, 
      wr: q.wrongCount || 0 
    };
  });
  try {
    localStorage.setItem("questionStats", JSON.stringify(stats));
  } catch (e) {
    console.error("Lỗi lưu stats, bộ nhớ đầy:", e);
  }
}

// ================= THUẬT TOÁN ĐẢO KHOÁ TRỘN ĐỀ TỐI ĐA =================
function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= START EXAM (TỶ LỆ % THEO TỔNG CÂU FILE & BỐC BÙ LIỀN KỀ) =================
function startExam() {
  answers = {};
  index = 0;
  time = 60 * 60;

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  let poolCheck = data.filter(q => !correctPool.includes((q.question || q.cauhoi || "").trim()));
  if (poolCheck.length === 0 && data.length > 0) {
    console.log("🚨 HỌC VIÊN ĐÃ LÀM ĐÚNG HẾT KHO ĐỀ! TIẾN HÀNH RESET VÒNG MỚI");
    localStorage.removeItem("correctPool");
    correctPool = [];
    data.forEach(q => { q.weight = 1; q.correctCount = 0; q.wrongCount = 0; });
  }

  const danhSachFileThucTe = [...new Set(data.map(q => q.fileSource).filter(Boolean))];
  const tongSoCauTrongKho = data.length || 1;
  const soLuongFile = danhSachFileThucTe.length || 1;

  let khoCauHoiCacFile = {};
  let chiTieuMoiFile = {}; 

  console.log(`=== THUẬT TOÁN ĐỀ PHÂN BỔ TRẢI ĐỀU % (TỔNG KHO KHO: ${tongSoCauTrongKho} CÂU) ===`);

  danhSachFileThucTe.forEach(fileKey => {
    let tongCauGocCuaFile = data.filter(q => q.fileSource === fileKey).length;
    
    let quota = Math.round((tongCauGocCuaFile / tongSoCauTrongKho) * 100);
    if (quota === 0 && tongCauGocCuaFile > 0) quota = 1; 
    chiTieuMoiFile[fileKey] = quota;

    let fileQuestions = data.filter(q => q.fileSource === fileKey && !correctPool.includes((q.question || q.cauhoi || "").trim()));
    fileQuestions = shuffle(fileQuestions);

    let wrongInFile = fileQuestions.filter(q => (q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0));
    let normalInFile = fileQuestions.filter(q => !((q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0)));
    
    khoCauHoiCacFile[fileKey] = [...wrongInFile, ...normalInFile];

    console.log(`• Phần [${fileKey}.json]: Có ${tongCauGocCuaFile} câu (Tỷ lệ: ${((tongCauGocCuaFile/tongSoCauTrongKho)*100).toFixed(1)}%) -> Phải bốc: ${quota} câu. (Kho chưa làm đúng còn: ${khoCauHoiCacFile[fileKey].length} câu)`);
  });

  let finalSelectedList = [];

  danhSachFileThucTe.forEach((fileKey, i) => {
    let poolHienTai = khoCauHoiCacFile[fileKey];
    let quotaCanLay = chiTieuMoiFile[fileKey];
    
    let thucTeLay = poolHienTai.splice(0, quotaCanLay);
    finalSelectedList = finalSelectedList.concat(thucTeLay);

    if (thucTeLay.length < quotaCanLay) {
      let soCauThieu = quotaCanLay - thucTeLay.length;
      console.log(`    ⚠️ Phần [${fileKey}.json] không đủ câu chưa làm (thiếu ${soCauThieu} câu). Đang lấy từ phần liền kề...`);

      let buocNhay = 1;
      while (soCauThieu > 0 && buocNhay < soLuongFile) {
        let indexFileLienKe = (i + buocNhay) % soLuongFile;
        let fileLienKeKey = danhSachFileThucTe[indexFileLienKe];
        let poolLienKe = khoCauHoiCacFile[fileLienKeKey];

        if (poolLienKe && poolLienKe.length > 0) {
          let soCauLayBu = Math.min(soCauThieu, poolLienKe.length);
          let cauBu = poolLienKe.splice(0, soCauLayBu);
          finalSelectedList = finalSelectedList.concat(cauBu);
          soCauThieu -= soCauLayBu;
          console.log(`    ➡️ Đã bù đắp thành công ${soCauLayBu} câu chưa làm từ phần liền kề: [${fileLienKeKey}.json]`);
        }
        buocNhay++;
      }
    }
  });

  if (finalSelectedList.length < 100) {
    let thieuTong = 100 - finalSelectedList.length;
    let khoVetCacFile = [];
    danhSachFileThucTe.forEach(fileKey => {
      khoVetCacFile = khoVetCacFile.concat(khoCauHoiCacFile[fileKey]);
    });
    
    if (khoVetCacFile.length > 0) {
      khoVetCacFile = shuffle(khoVetCacFile);
      let extra = khoVetCacFile.slice(0, thieuTong);
      finalSelectedList = finalSelectedList.concat(extra);
      console.log(`💡 Đã quét nốt ${extra.length} câu còn dư trên toàn hệ thống cho tròn đề 100 câu.`);
    }
  }

  let selected100 = shuffle(finalSelectedList).slice(0, 100);

  // ================= ĐOẠN ĐÃ ĐƯỢC SỬA ĐỂ XÁO TRỘN ĐÁP ÁN CHÍNH XÁC =================
  questions = selected100.map(q => {
    let clonedQ = JSON.parse(JSON.stringify(q)); // Deep clone để tránh lỗi xung đột tham chiếu thuộc tính
    
    // Lấy đáp án gốc từ file JSON và đưa về chữ thường sạch sẽ
    let rawCorrectKey = (clonedQ.answer || clonedQ.trảlời || "").toString().trim().toLowerCase();
    if (rawCorrectKey === "một") rawCorrectKey = "a";

    // Quét động toàn bộ phương án (chấp nhận cả thuộc tính chữ hoa 'A' hoặc chữ thường 'a')
    let optA = clonedQ.a || clonedQ.A || clonedQ.Một || "";
    let optB = clonedQ.b || clonedQ.B || "";
    let optC = clonedQ.c || clonedQ.C || "";
    let optD = clonedQ.d || clonedQ.D || "";

    let originalOptions = [
      { text: optA, key: 'a' },
      { text: optB, key: 'b' },
      { text: optC, key: 'c' },
      { text: optD, key: 'd' }
    ];

    // Tiến hành xáo trộn vị trí mảng đáp án
    let shuffled = shuffle(originalOptions);

    // Tìm vị trí mới chính xác tuyệt đối sau khi trộn
    let newCorrectIndex = shuffled.findIndex(opt => opt.key === rawCorrectKey);
    let indexToLetter = ['a', 'b', 'c', 'd'];
    
    clonedQ.shuffledOptions = shuffled; 
    clonedQ.newCorrectAnswer = indexToLetter[newCorrectIndex] || 'a'; 

    return clonedQ;
  });
  
  console.log(`=> ĐỀ THI ĐÃ CHỐT HOÀN CHỈNH: 100 câu hỏi ngẫu nhiên và XÁO TRỘN ĐÁP ÁN thành công.`);
  console.log("======================================================");

  render();
  startTimer();
}

// ================= HIỂN THỊ CÂU HỎI VÀ ĐÁP ÁN =================
function render() {
  if (questions.length === 0 || !questions[index]) {
    app.innerHTML = `<div class="box"><h2>Dữ liệu câu hỏi bị lỗi hoặc bộ nhớ tạm rỗng! Vui lòng làm mới trang.</h2></div>`;
    return;
  }

  let q = questions[index];
  let qText = q.question || q.cauhoi || "Nội dung câu hỏi rỗng";
  
  let optA = q.shuffledOptions ? q.shuffledOptions[0].text : (q.a || q.A || q.Một || "");
  let optB = q.shuffledOptions ? q.shuffledOptions[1].text : (q.b || q.B || "");
  let optC = q.shuffledOptions ? q.shuffledOptions[2].text : (q.c || q.C || "");
  let optD = q.shuffledOptions ? q.shuffledOptions[3].text : (q.d || q.D || "");

  app.innerHTML = `
    <div class="box">
      <div class="top">
        <div>Câu: ${index + 1}/${questions.length}</div>
        <div>⏱ Thời gian: <span id="time"></span></div>
      </div>

      <div class="bar">
        <div class="bar-fill" id="bar"></div>
      </div>

      <h2 style="white-space: pre-wrap; text-align: justify;">${qText}</h2>

      <button class="option" onclick="choose('A')">A. ${optA}</button>
      <button class="option" onclick="choose('B')">B. ${optB}</button>
      <button class="option" onclick="choose('C')">C. ${optC}</button>
      <button class="option" onclick="choose('D')">D. ${optD}</button>

      <div class="nav-control">
        <button class="nav-btn" onclick="prev()">← Câu trước</button>
        <button class="nav-btn" onclick="next()">Câu sau →</button>
      </div>

      <button class="btn" style="margin-top:15px; background:#b30000; color:#fff;" onclick="submit()">NỘP BÀI THI</button>

      <div id="nav"></div>
    </div>
  `;

  highlight();
  updateBar();
  renderNav();
}

function choose(c) {
  answers[index] = c;
  highlight();
}

function highlight() {
  setTimeout(() => {
    document.querySelectorAll(".option").forEach(b => b.classList.remove("selected"));

    let ans = answers[index];
    if (!ans) return;

    const map = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3 };
    let btns = document.querySelectorAll(".option");

    if (btns[map[ans]]) {
      btns[map[ans]].classList.add("selected");
    }
  }, 0);
}

function renderNav() {
  let nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = "";

  questions.forEach((_, i) => {
    let btn = document.createElement("button");
    btn.innerText = i + 1;

    if (answers[i]) {
      btn.style.background = "#b30000";
      btn.style.color = "white";
    }

    if (i === index) {
      btn.style.border = "2px solid #000";
      btn.style.fontWeight = "bold";
    }

    btn.onclick = () => {
      index = i;
      render();
    };

    nav.appendChild(btn);
  });
}

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

function updateBar() {
  let bar = document.getElementById("bar");
  if (bar && questions.length > 0) {
    bar.style.width = ((index + 1) / questions.length) * 100 + "%";
  }
}

// ================= ĐỒNG HỒ ĐẾM NGƯỢC =================
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

// ================= NỘP BÀI VÀ CHẤM ĐIỂM SỬA WEIGHT LỖI =================
function submit() {
  clearInterval(timer);

  let correct = 0;
  let wrong = 0;
  let submittedCount = 0; 
  let newWrong = [];

  let correctPool = JSON.parse(localStorage.getItem("correctPool") || "[]");

  questions.forEach((q, i) => {
    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    
    let correctAns = q.newCorrectAnswer ? q.newCorrectAnswer.toString().trim().toLowerCase() : (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";

    let qTextId = (q.question || q.cauhoi || "").trim();
    let originalQ = data.find(x => (x.question || x.cauhoi || "").trim() === qTextId);
    
    if (!originalQ) originalQ = q; 

    originalQ.weight = originalQ.weight || 1;
    originalQ.correctCount = originalQ.correctCount || 0;
    originalQ.wrongCount = originalQ.wrongCount || 0;

    if (userAns !== "") {
      submittedCount++; 
      if (userAns === correctAns) {
        correct++;
        originalQ.correctCount++;
        originalQ.weight = Math.max(1, originalQ.weight - 0.3);
        
        if (!correctPool.includes(qTextId)) {
          correctPool.push(qTextId);
        }
      } else {
        wrong++;
        newWrong.push(originalQ);
        originalQ.wrongCount++;
        originalQ.weight = Math.min(10, originalQ.weight + 1.2); 
        
        let cIndex = correctPool.indexOf(qTextId);
        if (cIndex > -1) {
          correctPool.splice(cIndex, 1);
        }
      }
    } else {
      wrong++; 
    }
  });

  localStorage.setItem("correctPool", JSON.stringify(correctPool));
  localStorage.setItem("questionData", JSON.stringify(data)); 
  wrongPool = newWrong;

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
      border-radius: 8px;
      font-family: 'Times New Roman', Times, serif;
    ">
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111; letter-spacing: 0.5px;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
      
      <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0; line-height: 1.6;">
        Số câu đã hoàn thành: <b style="color: #00796b; font-size: 16px;">${submittedCount}/${questions.length}</b><br>
        Số câu đúng: <b style="color: #2e7d32; font-size: 16px;">${correct}</b> | Số câu sai/Chưa chọn: <b style="color: #c62828; font-size: 16px;">${wrong}</b>
      </p>

      <div style="text-align: center; margin-bottom: 25px;">
        <button class="btn" style="background: #00796b; color: white; border: none; padding: 10px 28px; font-size: 14px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 20px; font-weight: bold; transition: 0.2s;" onclick="location.reload()">THI VÒNG ĐỀ MỚI</button>
      </div>

      <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 25px; border-bottom: 1px solid #eef0f2; padding-bottom: 15px;">
        <button id="btn-filter-all" style="padding: 6px 16px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('all')">Tất cả câu hỏi</button>
        <button id="btn-filter-correct" style="padding: 6px 16px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('correct')">Các câu đúng</button>
        <button id="btn-filter-wrong" style="padding: 6px 16px; font-size: 13px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 4px;" onclick="filterResult('wrong')">Các câu chưa làm / sai</button>
      </div>

      <div id="result-list"></div>
    </div>
  `;

  filterResult('all');
}

// ================= BỘ LỌC ĐÁP ÁN KHẢO SÁT KẾT QUẢ THI =================
function filterResult(type) {
  currentFilter = type;
  let listContainer = document.getElementById("result-list");
  if (!listContainer) return;

  const btnAll = document.getElementById("btn-filter-all");
  const btnCorrect = document.getElementById("btn-filter-correct");
  const btnWrong = document.getElementById("btn-filter-wrong");

  if(btnAll && btnCorrect && btnWrong) {
    btnAll.style.cssText = "background: #f1f3f5; color: #555; border: 1px solid #dee2e6;";
    btnCorrect.style.cssText = "background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9;";
    btnWrong.style.cssText = "background: #ffebee; color: #c62828; border: 1px solid #ffcdd2;";

    if (type === 'all') btnAll.style.cssText = "background: #00796b; color: #fff; border: 1px solid #00796b; font-weight: bold;";
    if (type === 'correct') btnCorrect.style.cssText = "background: #2e7d32; color: #fff; border: 1px solid #2e7d32; font-weight: bold;";
    if (type === 'wrong') btnWrong.style.cssText = "background: #c62828; color: #fff; border: 1px solid #c62828; font-weight: bold;";
  }

  let html = "";

  questions.forEach((q, i) => {
    if (!q) return; 

    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = q.newCorrectAnswer ? q.newCorrectAnswer.toString().trim().toLowerCase() : (q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";
    
    let ok = userAns !== "" && userAns === correctAns;

    if (type === 'correct' && !ok) return;
    if (type === 'wrong' && ok) return;

    let qText = q.question || q.cauhoi || "Dữ liệu lỗi";
    
    let optA = q.shuffledOptions ? q.shuffledOptions[0].text : (q.a || q.A || q.Một || "");
    let optB = q.shuffledOptions ? q.shuffledOptions[1].text : (q.b || q.B || "");
    let optC = q.shuffledOptions ? q.shuffledOptions[2].text : (q.c || q.C || "");
    let optD = q.shuffledOptions ? q.shuffledOptions[3].text : (q.d || q.D || "");

    let fullCorrectText = "";
    if (correctAns === "a") fullCorrectText = `A. ${optA}`;
    else if (correctAns === "b") fullCorrectText = `B. ${optB}`;
    else if (correctAns === "c") fullCorrectText = `C. ${optC}`;
    else if (correctAns === "d") fullCorrectText = `D. ${optD}`;
    else fullCorrectText = correctAns.toUpperCase();

    let fullUserText = "Không lựa chọn đáp án (Bỏ trống câu này)";
    if (userAns === "a") fullUserText = `A. ${optA}`;
    else if (userAns === "b") fullUserText = `B. ${optB}`;
    else if (userAns === "c") fullUserText = `C. ${optC}`;
    else if (userAns === "d") fullUserText = `D. ${optD}`;

    html += `
      <div style="margin-bottom: 24px; text-align: justify; line-height: 1.5; font-size: 15px; color: #111;">
        <p style="margin: 0 0 6px 0; padding: 0; white-space: pre-wrap;"><b>Câu ${i + 1}.</b> ${qText}</p>
        
        <div style="margin: 0 0 6px 0; padding-left: 15px; font-size: 14.5px; color: #333;">
          <div style="margin-bottom: 3px;">
            <span style="color: #666;">- Phương án đã chọn:</span> ${fullUserText} 
            <span style="
              display: inline-block; padding: 1px 6px; font-size: 11px; font-family: 'Times New Roman'; font-weight: bold; border-radius: 3px; margin-left: 8px;
              background-color: ${userAns === "" ? '#f1f3f5' : (ok ? '#e8f5e9' : '#ffebee')};
              color: ${userAns === "" ? '#555' : (ok ? '#2e7d32' : '#c62828')};
            ">${userAns === "" ? "CHƯA LÀM" : (ok ? "CHÍNH XÁC" : "KHÔNG ĐÚNG")}</span>
          </div>
          ${!ok ? `<div style="margin-bottom: 3px;"><span style="color: #666;">- Đáp án đúng:</span> <b style="color: #2e7d32;">${fullCorrectText}</b></div>` : ""}
        </div>

        <div style="margin: 6px 0 0 15px; padding: 4px 0 4px 10px; font-style: italic; font-size: 14px; color: #555; border-left: 2px solid #e0e0e0; white-space: pre-wrap;">
          <b>Cơ sở lý luận (Giải thích):</b> ${q.explanation ? q.explanation : (q.giảithích ? q.giảithích : "Chưa có nội dung giải thích.")}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || `<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy dữ liệu.</p>`;
}

// ================= HÀM KHÓA AN TOÀN CHỐT SAO CHÉP ĐỀ THI DÀNH CHO TÀI KHOẢN CON =================
function enableProtectionForSubAccounts() {
  let user = JSON.parse(localStorage.getItem("user"));
  
  if (!user || user.role === "admin") {
    return; 
  }

  document.addEventListener('contextmenu', function(e) { e.preventDefault(); alert("Hệ thống kiểm tra đã khóa chuột phải học viên!"); });
  document.addEventListener('selectstart', function(e) { e.preventDefault(); });
  document.addEventListener('mousedown', function(e) { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') e.preventDefault(); });
  document.addEventListener('dragstart', function(e) { e.preventDefault(); });

  document.body.style.userSelect = "none";
  document.body.style.webkitUserSelect = "none";
  document.body.style.msUserSelect = "none";
  document.body.style.mozUserSelect = "none";

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && ['c', 'x', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      alert("Hành vi sao chép/tải đề đã bị ngăn chặn!");
      return false;
    }
    if (e.key === 'F12') { e.preventDefault(); alert("F12 Console đã bị khóa!"); return false; }
    if (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) { e.preventDefault(); return false; }
  });

  window.addEventListener('blur', function() {
    let appEl = document.getElementById("app");
    if (appEl) appEl.style.filter = "blur(15px)";
  });
  window.addEventListener('focus', function() {
    let appEl = document.getElementById("app");
    if (appEl) appEl.style.filter = "none";
  });
}
