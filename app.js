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
 { username: "LONG1@", password: "1112233", role: "user" },
  { username: "CHINH@", password: "1112233", role: "user" },
 { username: "HOANG1@", password: "1112233", role: "user" }
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

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  if (user.role !== "admin") {
    if (sessions[user.username] && sessions[user.username] !== deviceId) {
      alert("Tài khoản này đang được đăng nhập trên một thiết bị khác!");
      return;
    }
  }

  sessions[user.username] = deviceId;
  localStorage.setItem("loginSessions", JSON.stringify(sessions));
  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
}function login() {
  let u = document.getElementById("u").value;
  let p = document.getElementById("p").value;

  let user = users.find(x => x.username === u && x.password === p);
  if (!user) return alert("Sai tài khoản hoặc mật khẩu!");

  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  // 1. Kiểm tra xem tài khoản đã bị khóa trước đó chưa
  if (sessions[user.username] && sessions[user.username].isLocked) {
    return alert("TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN do đăng nhập trên thiết bị khác. Vui lòng liên hệ Admin!");
  }

  // 2. Kiểm tra nếu đăng nhập trên thiết bị lạ (khác thiết bị ban đầu)
  if (user.role !== "admin" && sessions[user.username] && sessions[user.username].deviceId !== deviceId) {
    // Đánh dấu khóa vĩnh viễn
    sessions[user.username] = { 
      deviceId: sessions[user.username].deviceId, 
      isLocked: true 
    };
    localStorage.setItem("loginSessions", JSON.stringify(sessions));
    return alert("CẢNH BÁO: Phát hiện đăng nhập trên thiết bị lạ. Tài khoản của bạn đã bị KHÓA VĨNH VIỄN!");
  }

  // 3. Nếu là lần đầu đăng nhập hoặc đúng thiết bị cũ
  sessions[user.username] = { 
    deviceId: deviceId, 
    isLocked: false 
  };
  localStorage.setItem("loginSessions", JSON.stringify(sessions));
  localStorage.setItem("user", JSON.stringify(user));

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
}

// ================= KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP =================
function checkLogin() {
  let user = JSON.parse(localStorage.getItem("user"));
  let deviceId = getDeviceId();
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");

  // 1. Nếu chưa đăng nhập thì hiện login
  if (!user) {
    showLogin();
    return;
  }

  // 2. Kiểm tra nếu là user thường
  if (user.role !== "admin") {
    let userSession = sessions[user.username];

    // Kiểm tra xem có tồn tại session và đã bị khóa chưa
    if (userSession && userSession.isLocked) {
      alert("TÀI KHOẢN ĐÃ BỊ KHÓA VĨNH VIỄN. Vui lòng liên hệ Admin!");
      localStorage.removeItem("user");
      showLogin();
      return;
    }

    // Kiểm tra đăng nhập chéo: Session tồn tại nhưng deviceId không khớp
    if (userSession && userSession.deviceId !== deviceId) {
      alert("Phiên đăng nhập không hợp lệ (Phát hiện đăng nhập trái phép)!");
      localStorage.removeItem("user");
      showLogin();
      return;
    }
  }

  // 3. Nếu mọi thứ hợp lệ, vào thi
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("app").style.display = "block";
  
  enableProtectionForSubAccounts();
  startExam();
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
     "./cau_hoi/p9.json",
    "./cau_hoi/p10.json",
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

// ================= KHỞI ĐỘNG HỆ THỐNG - BẢN FIX HOÀN CHỈNH =================
async function khoiDongUngDung() {
  // 1. Tải dữ liệu từ file JSON
  const fileData = await taiTatCaDuLieuCauHoi();
  
  if (fileData.length === 0) {
    alert("Không tìm thấy dữ liệu câu hỏi trong thư mục cau_hoi! Vui lòng kiểm tra lại đường dẫn.");
    return;
  }

  // 2. Lấy chỉ các thông tin trạng thái học tập đã lưu (weight, count...) từ localStorage
  // Lưu dưới dạng Map để truy xuất siêu nhanh theo nội dung câu hỏi
  const savedStats = JSON.parse(localStorage.getItem("userStats") || "{}");

  // 3. Gán lại trạng thái vào dữ liệu vừa tải
  fileData.forEach(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    if (savedStats[qText]) {
      const stats = savedStats[qText];
      q.weight = stats.weight || 1;
      q.correctCount = stats.correctCount || 0;
      q.wrongCount = stats.wrongCount || 0;
      q.fileSource = stats.fileSource || q.fileSource;
    } else {
      // Thiết lập mặc định nếu chưa có
      q.weight = q.weight || 1;
      q.correctCount = q.correctCount || 0;
      q.wrongCount = q.wrongCount || 0;
    }
  });

  // 4. Lưu dữ liệu vào RAM (biến global 'data'), KHÔNG LƯU VÀO LOCALSTORAGE
  data = fileData;
  
  checkLogin();
}

// Gọi hàm khởi động
khoiDongUngDung();


// Đặt hàm này ở đầu file, sau các khai báo biến let
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

  // 1. Xác định giới hạn câu hỏi dựa trên quyền của user
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const targetLimit = (user.role === "admin") ? 50 : 100;

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

  console.log(`=== THUẬT TOÁN ĐỀ PHÂN BỔ TRẢI ĐỀU (TARGET: ${targetLimit} CÂU) ===`);

  danhSachFileThucTe.forEach(fileKey => {
    let tongCauGocCuaFile = data.filter(q => q.fileSource === fileKey).length;
    
    // Tính quota dựa trên targetLimit thay vì 100
    let quota = Math.round((tongCauGocCuaFile / tongSoCauTrongKho) * targetLimit);
    if (quota === 0 && tongCauGocCuaFile > 0) quota = 1; 
    chiTieuMoiFile[fileKey] = quota;

    let fileQuestions = data.filter(q => q.fileSource === fileKey && !correctPool.includes((q.question || q.cauhoi || "").trim()));
    fileQuestions = shuffle(fileQuestions);

    let wrongInFile = fileQuestions.filter(q => (q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0));
    let normalInFile = fileQuestions.filter(q => !((q.weight && q.weight > 1) || (q.wrongCount && q.wrongCount > 0)));
    
    khoCauHoiCacFile[fileKey] = [...wrongInFile, ...normalInFile];
    console.log(`• Phần [${fileKey}]: Phải bốc: ${quota} câu.`);
  });

  let finalSelectedList = [];

  danhSachFileThucTe.forEach((fileKey, i) => {
    let poolHienTai = khoCauHoiCacFile[fileKey];
    let quotaCanLay = chiTieuMoiFile[fileKey];
    
    let thucTeLay = poolHienTai.splice(0, quotaCanLay);
    finalSelectedList = finalSelectedList.concat(thucTeLay);

    if (thucTeLay.length < quotaCanLay) {
      let soCauThieu = quotaCanLay - thucTeLay.length;
      let buocNhay = 1;
      while (soCauThieu > 0 && buocNhay < soLuongFile) {
        let indexFileLienKe = (i + buocNhay) % soLuongFile;
        let fileLienKeKey = danhSachFileThucTe[indexFileLienKe];
        let poolLienKe = khoCauHoiCacFile[fileLienKeKey];
        if (poolLienKe && poolLienKe.length > 0) {
          let soCauLayBu = Math.min(soCauThieu, poolLienKe.length);
          finalSelectedList = finalSelectedList.concat(poolLienKe.splice(0, soCauLayBu));
          soCauThieu -= soCauLayBu;
        }
        buocNhay++;
      }
    }
  });

  // Quét nốt cho đủ targetLimit
  if (finalSelectedList.length < targetLimit) {
    let thieuTong = targetLimit - finalSelectedList.length;
    let khoVetCacFile = [];
    danhSachFileThucTe.forEach(fileKey => khoVetCacFile = khoVetCacFile.concat(khoCauHoiCacFile[fileKey]));
    
    if (khoVetCacFile.length > 0) {
      let extra = shuffle(khoVetCacFile).slice(0, thieuTong);
      finalSelectedList = finalSelectedList.concat(extra);
    }
  }

  let selectedQuestions = shuffle(finalSelectedList).slice(0, targetLimit);

  // Xử lý xáo trộn đáp án
  questions = selectedQuestions.map(q => {
    let clonedQ = JSON.parse(JSON.stringify(q));
    let rawCorrectKey = (clonedQ.answer || clonedQ.trảlời || "").toString().trim().toLowerCase();
    if (rawCorrectKey === "một") rawCorrectKey = "a";

    let optA = clonedQ.a || clonedQ.A || clonedQ.Một || "";
    let optB = clonedQ.b || clonedQ.B || "";
    let optC = clonedQ.c || clonedQ.C || "";
    let optD = clonedQ.d || clonedQ.D || "";

    let originalOptions = [
      { text: optA, key: 'a' }, { text: optB, key: 'b' }, { text: optC, key: 'c' }, { text: optD, key: 'd' }
    ];

    let shuffled = shuffle(originalOptions);
    let newCorrectIndex = shuffled.findIndex(opt => opt.key === rawCorrectKey);
    let indexToLetter = ['a', 'b', 'c', 'd'];
    
    clonedQ.shuffledOptions = shuffled; 
    clonedQ.newCorrectAnswer = indexToLetter[newCorrectIndex] || 'a'; 

    return clonedQ;
  });
  
  console.log(`=> ĐỀ THI ĐÃ CHỐT: ${questions.length} CÂU.`);
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


// ================= NỘP BÀI VÀ CHẤM ĐIỂM (ĐÃ TỐI ƯU) =================
function submit() {
  // 1. Kiểm tra điều kiện nộp bài
  let user = JSON.parse(localStorage.getItem("user") || "{}");
  let answeredCount = Object.keys(answers).length;

  if (user.role !== "admin" && answeredCount < questions.length) {
    alert(`⚠️ Bạn chưa hoàn thành bài thi! \n\nVui lòng trả lời đủ ${questions.length} câu. \nHiện tại bạn mới làm: ${answeredCount} câu.`);
    
    // Tự động tìm câu đầu tiên chưa làm để người dùng hoàn thiện
    for (let i = 0; i < questions.length; i++) {
      if (!answers[i]) {
        index = i;
        render(); // Quay lại câu chưa làm
        return;
      }
    }
    return;
  }

  // Xác nhận nộp bài (áp dụng cho cả Admin và User đã làm đủ)
  if (!confirm("Bạn có chắc chắn muốn nộp bài thi không?")) return;

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

  // 1. LƯU CORRECT POOL
  localStorage.setItem("correctPool", JSON.stringify(correctPool));

  // 2. TỐI ƯU: LƯU TRẠNG THÁI CÂU HỎI
  let statsToSave = {};
  data.forEach(q => {
    let qText = (q.question || q.cauhoi || "").trim();
    statsToSave[qText] = {
      weight: q.weight,
      correctCount: q.correctCount,
      wrongCount: q.wrongCount,
      fileSource: q.fileSource
    };
  });
  localStorage.setItem("userStats", JSON.stringify(statsToSave)); 

  wrongPool = newWrong;

  // 3. HIỂN THỊ GIAO DIỆN KẾT QUẢ
  document.body.style.backgroundColor = "#f4f5f7";
  document.body.style.margin = "0";
  document.body.style.padding = "20px 0";

  app.innerHTML = `
    <div style="max-width: 820px; margin: 0 auto; background: #ffffff; padding: 40px 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-radius: 8px; font-family: 'Times New Roman', Times, serif;">
      <h1 style="font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 10px 0; color: #111;">BÁO CÁO KẾT QUẢ KIỂM TRA</h1>
      <p style="text-align: center; font-size: 15px; color: #555; margin: 0 0 20px 0;">
        Số câu đã hoàn thành: <b>${submittedCount}/${questions.length}</b><br>
        Số câu đúng: <b style="color: #2e7d32;">${correct}</b> | Sai: <b style="color: #c62828;">${wrong}</b>
      </p>
      <div style="text-align: center; margin-bottom: 25px;">
        <button class="btn" style="background: #00796b; color: white; padding: 10px 28px; border-radius: 20px; cursor: pointer; border: none;" onclick="location.reload()">THI VÒNG ĐỀ MỚI</button>
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

  // 1. Kiểm tra quyền Admin
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = (user.role === 'admin');

  // 2. Tạo hoặc lấy lại thanh bộ lọc
  let filterBar = document.getElementById("filter-bar");
  if (!filterBar) {
    let div = document.createElement("div");
    div.id = "filter-bar";
    div.style.cssText = "text-align: center; margin-bottom: 20px;";
    div.innerHTML = `
      <button id="btn-filter-all" onclick="filterResult('all')">Tất cả</button>
      <button id="btn-filter-correct" onclick="filterResult('correct')">Câu đúng</button>
      <button id="btn-filter-wrong" onclick="filterResult('wrong')">Câu sai</button>
    `;
    listContainer.parentNode.insertBefore(div, listContainer);
  }

  // 3. Cập nhật Style cho các nút
  const btnAll = document.getElementById("btn-filter-all");
  const btnCorrect = document.getElementById("btn-filter-correct");
  const btnWrong = document.getElementById("btn-filter-wrong");

  const baseBtnStyle = "padding: 6px 16px; margin: 5px; cursor: pointer; border: 1px solid #dee2e6; border-radius: 4px; transition: 0.3s;";
  btnAll.style.cssText = baseBtnStyle + (type === 'all' ? 'background: #00796b; color: #fff; font-weight: bold;' : 'background: #f1f3f5;');
  btnCorrect.style.cssText = baseBtnStyle + (type === 'correct' ? 'background: #2e7d32; color: #fff; font-weight: bold;' : 'background: #e8f5e9;');
  btnWrong.style.cssText = baseBtnStyle + (type === 'wrong' ? 'background: #c62828; color: #fff; font-weight: bold;' : 'background: #ffebee;');

  // 4. Xử lý danh sách hiển thị
  let html = "";
  questions.forEach((q, i) => {
    if (!q) return;

    let userAns = answers[i] ? answers[i].toString().trim().toLowerCase() : "";
    let correctAns = (q.newCorrectAnswer || q.answer || q.trảlời || "").toString().trim().toLowerCase();
    if (correctAns === "một") correctAns = "a";

    let isDone = (userAns !== "");
    let isCorrect = (isDone && userAns === correctAns);
    let isWrong = (isDone && userAns !== correctAns);

    if (type === 'correct' && !isCorrect) return;
    if (type === 'wrong' && !isWrong) return;

    // Ký hiệu file nguồn (Chỉ hiển thị với Admin)
    let fileTag = (isAdmin && q.fileSource) ? ` <span style="font-size: 11px; color: #888; font-style: italic; background: #eee; padding: 1px 4px; border-radius: 3px;">(${q.fileSource.replace('.json', '')})</span>` : "";

    let qText = q.question || q.cauhoi || "Dữ liệu lỗi";
    let mapAns = {
      a: q.shuffledOptions ? q.shuffledOptions[0].text : (q.a || q.A || q.Một || ""),
      b: q.shuffledOptions ? q.shuffledOptions[1].text : (q.b || q.B || ""),
      c: q.shuffledOptions ? q.shuffledOptions[2].text : (q.c || q.C || ""),
      d: q.shuffledOptions ? q.shuffledOptions[3].text : (q.d || q.D || "")
    };

    let fullCorrectText = mapAns[correctAns] ? `${correctAns.toUpperCase()}. ${mapAns[correctAns]}` : correctAns.toUpperCase();
    let fullUserText = mapAns[userAns] ? `${userAns.toUpperCase()}. ${mapAns[userAns]}` : "Chưa chọn đáp án";

    html += `
      <div style="margin-bottom: 24px; padding-bottom: 10px; border-bottom: 1px solid #eee; text-align: justify; line-height: 1.5; font-size: 15px;">
        <p style="margin: 0 0 6px 0;"><b>Câu ${i + 1}.</b> ${qText}${fileTag}</p>
        <div style="margin: 0 0 6px 0; padding-left: 15px;">
          <div><span style="color: #666;">- Đã chọn:</span> ${fullUserText}
            <span style="padding: 1px 6px; font-size: 11px; font-weight: bold; border-radius: 3px; margin-left: 8px; background-color: ${!isDone ? '#f1f3f5' : (isCorrect ? '#e8f5e9' : '#ffebee')}; color: ${!isDone ? '#555' : (isCorrect ? '#2e7d32' : '#c62828')};">
              ${!isDone ? "CHƯA LÀM" : (isCorrect ? "CHÍNH XÁC" : "SAI")}
            </span>
          </div>
          ${isWrong ? `<div><span style="color: #666;">- Đáp án đúng:</span> <b style="color: #2e7d32;">${fullCorrectText}</b></div>` : ""}
        </div>
        <div style="margin: 6px 0 0 15px; padding: 4px 10px; font-style: italic; font-size: 14px; color: #555; border-left: 2px solid #e0e0e0;">
          <b>Giải thích:</b> ${q.explanation || q.giảithích || "Chưa có giải thích."}
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html || `<p style='text-align:center; color:#777; font-style: italic; padding: 20px;'>Không tìm thấy câu hỏi nào phù hợp.</p>`;
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
// ================= XỬ LÝ LƯỚT MÀN HÌNH (SWIPE) - CHỈ ADMIN & CHỈ KHI LÀM BÀI =================
(function() {
    let touchstartX = 0;
    let touchendX = 0;
    const threshold = 50; // Khoảng cách tối thiểu để tính là một lượt lướt

    document.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleGesture();
    }, { passive: true });

    function handleGesture() {
        // 1. Kiểm tra quyền Admin
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.role !== "admin") return;

        // 2. Kiểm tra xem có đang trong chế độ làm bài không 
        // Bằng cách kiểm tra sự tồn tại của các nút điều hướng hoặc timer
        const isExamining = document.getElementById("time") !== null && document.getElementById("nav") !== null;
        if (!isExamining) return;

        // 3. Xử lý logic chuyển câu hỏi
        const diff = touchstartX - touchendX;
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                // Lướt sang trái (trục X giảm) -> Câu sau
                next();
            } else {
                // Lướt sang phải (trục X tăng) -> Câu trước
                prev();
            }
        }
    }
})();

function resetUserStatus(username) {
  let sessions = JSON.parse(localStorage.getItem("loginSessions") || "{}");
  if(sessions[username]) {
     delete sessions[username];
     localStorage.setItem("loginSessions", JSON.stringify(sessions));
     console.log("Đã reset hoàn toàn tài khoản: " + username);
     alert("Đã reset hoàn toàn tài khoản: " + username);
  } else {
     alert("Không tìm thấy tài khoản này trong hệ thống!");
  }
}
