
// api/exam.js
import fs from 'fs';
import path from 'path';

// Danh sách tài khoản được giấu kín hoàn toàn trên Server
const USERS = [
  { username: "mainguyen", password: "1234", role: "admin" },
  { username: "ALONG", password: "1112233", role: "user" },
  { username: "CHINH1@", password: "1112233", role: "user" },
  { username: "AHOANG@", password: "1112233", role: "user" },
  { username: "HOANG2@", password: "1112233", role: "user" },
  { username: "HOANG3@", password: "1112233", role: "user" }
];

function getUserPoolRatio(user) {
  if (!user || user.role === "admin") return 1;
  const u = user.username || "";
  if (u.includes("1")) return 0.50;
  if (u.includes("2")) return 0.25;
  if (u.includes("3")) return 0.12;
  return 1;
}

function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hàm đọc toàn bộ file JSON từ thư mục bí mật api/cau_hoi
function loadAllQuestions() {
  const files = ["p1.json", "p2.json", "p3.json", "p4.json", "p5.json", "p6.json", "p7.json", "p8.json", "p9.json", "p10.json", "pcuathay.json"];
  let allQuestions = [];
  const baseDir = path.join(process.cwd(), 'api', 'cau_hoi');

  files.forEach(file => {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const fileTag = file.replace('.json', '');
      content.forEach((q, idx) => {
        q._id = `${fileTag}_${idx}`; // Tạo ID duy nhất cho từng câu
        q.fileSource = fileTag;
      });
      allQuestions = allQuestions.concat(content);
    }
  });
  return allQuestions;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, username, password, userStats = {}, correctPool = [], answers = {}, questionList = [] } = req.body;

  // 1. ACTION: ĐĂNG NHẬP
  if (action === 'login') {
    const user = USERS.find(x => x.username === username && x.password === password);
    if (!user) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });
    // Chỉ trả về username và role, không trả mật khẩu
    return res.status(200).json({ username: user.username, role: user.role });
  }

  // Kiểm tra quyền hợp lệ cho các thao tác sau
  const currentUser = USERS.find(x => x.username === username);
  if (!currentUser) return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ!" });

  const allData = loadAllQuestions();
  const poolRatio = getUserPoolRatio(currentUser);

  // Lọc kho đề theo tỷ lệ tài khoản
  let allowedData = [];
  const fileKeys = [...new Set(allData.map(q => q.fileSource))];
  fileKeys.forEach(fileKey => {
    let fileAll = allData.filter(q => q.fileSource === fileKey);
    if (poolRatio < 1) {
      let count = Math.max(1, Math.floor(fileAll.length * poolRatio));
      allowedData = allowedData.concat(fileAll.slice(0, count));
    } else {
      allowedData = allowedData.concat(fileAll);
    }
  });

  // 2. ACTION: BẮT ĐẦU THI (LẤY ĐỀ KHÔNG ĐÁP ÁN)
  if (action === 'start') {
    const baseLimit = (currentUser.role === "admin") ? 50 : 100;
    const targetLimit = Math.min(baseLimit, allowedData.length);

    let activeCorrectPool = [...correctPool];
    let poolCheck = allowedData.filter(q => !activeCorrectPool.includes((q.question || q.cauhoi || "").trim()));
    let resetPool = false;
    if (poolCheck.length === 0 && allowedData.length > 0) {
      activeCorrectPool = [];
      resetPool = true;
    }

    // Gắn thống kê cũ của user vào câu hỏi
    allowedData.forEach(q => {
      const qText = (q.question || q.cauhoi || "").trim();
      const st = userStats[qText] || {};
      q.weight = resetPool ? 1 : (st.weight || 1);
      q.wrongCount = resetPool ? 0 : (st.wrongCount || 0);
    });

    const totalInStore = allowedData.length || 1;
    let khoFile = {};
    let chiTieu = {};

    fileKeys.forEach(fileKey => {
      let tongKhoPhan = allowedData.filter(q => q.fileSource === fileKey).length;
      let quota = Math.round((tongKhoPhan / totalInStore) * targetLimit);
      if (quota === 0 && tongKhoPhan > 0) quota = 1;
      chiTieu[fileKey] = quota;

      let fQs = shuffle(allowedData.filter(q => q.fileSource === fileKey && !activeCorrectPool.includes((q.question || q.cauhoi || "").trim())));
      let wrongQs = fQs.filter(q => q.weight > 1 || q.wrongCount > 0);
      let normalQs = fQs.filter(q => !(q.weight > 1 || q.wrongCount > 0));
      khoFile[fileKey] = [...wrongQs, ...normalQs];
    });

    let selected = [];
    fileKeys.forEach((fileKey, i) => {
      let take = khoFile[fileKey].splice(0, chiTieu[fileKey]);
      selected = selected.concat(take);
      if (take.length < chiTieu[fileKey]) {
        let missing = chiTieu[fileKey] - take.length;
        let step = 1;
        while (missing > 0 && step < fileKeys.length) {
          let nextKey = fileKeys[(i + step) % fileKeys.length];
          if (khoFile[nextKey]?.length > 0) {
            selected = selected.concat(khoFile[nextKey].splice(0, Math.min(missing, khoFile[nextKey].length)));
            missing = chiTieu[fileKey] - take.length; // cập nhật lại
          }
          step++;
        }
      }
    });

    if (selected.length < targetLimit) {
      let extraPool = [];
      fileKeys.forEach(k => extraPool = extraPool.concat(khoFile[k]));
      selected = selected.concat(shuffle(extraPool).slice(0, targetLimit - selected.length));
    }

    selected = shuffle(selected).slice(0, targetLimit);

    // Trộn đáp án và XÓA SẠCH đáp án đúng + giải thích trước khi gửi về client
    const clientQuestions = selected.map(q => {
      let options = [
        { text: q.a || q.A || q.Một || "", key: 'a' },
        { text: q.b || q.B || "", key: 'b' },
        { text: q.c || q.C || "", key: 'c' },
        { text: q.d || q.D || "", key: 'd' }
      ];
      let shuffledOpts = shuffle(options);

      return {
        _id: q._id,
        question: q.question || q.cauhoi || "",
        // Chỉ gửi thứ tự key đã trộn (ví dụ ['c', 'a', 'd', 'b']) để lúc nộp bài server biết đường chấm
        optionOrder: shuffledOpts.map(o => o.key),
        optionsText: shuffledOpts.map(o => o.text),
        fileSource: currentUser.role === 'admin' ? q.fileSource : undefined
      };
    });

    // Tạo bảng thống kê cho Admin (nếu là admin)
    let adminReport = null;
    if (currentUser.role === "admin") {
      adminReport = {};
      let tongLay = 0, tongSai = 0;
      fileKeys.forEach(fk => {
        const khoPhan = allowedData.filter(q => q.fileSource === fk).length;
        const daLay = selected.filter(q => q.fileSource === fk);
        const soSai = daLay.filter(q => q.weight > 1 || q.wrongCount > 0).length;
        adminReport[fk] = {
          "Tổng kho (câu)": khoPhan,
          "Đã lấy (câu)": daLay.length,
          "Tỷ lệ trong đề": ((daLay.length / clientQuestions.length) * 100).toFixed(1) + "%",
          "Tỷ lệ / kho phần": ((daLay.length / khoPhan) * 100).toFixed(1) + "%",
          "Câu sai làm lại": soSai
        };
        tongLay += daLay.length;
        tongSai += soSai;
      });
      adminReport["TỔNG CỘNG"] = {
        "Tổng kho (câu)": allowedData.length,
        "Đã lấy (câu)": tongLay,
        "Tỷ lệ trong đề": "100%",
        "Tỷ lệ / kho phần": ((tongLay / allowedData.length) * 100).toFixed(1) + "%",
        "Câu sai làm lại": tongSai
      };
    }

    return res.status(200).json({
      questions: clientQuestions,
      totalAllowedCount: allowedData.length,
      resetPool,
      adminReport
    });
  }

  // 3. ACTION: NỘP BÀI VÀ CHẤM ĐIỂM TRÊN SERVER
  if (action === 'submit') {
    let correct = 0, wrong = 0, submittedCount = 0;
    const indexMap = { a: 0, b: 1, c: 2, d: 3 };

    const gradedResults = questionList.map((clientQ, idx) => {
      const originalQ = allData.find(x => x._id === clientQ._id);
      if (!originalQ) return null;

      let rawCorrectKey = (originalQ.answer || originalQ.trảlời || "").toString().trim().toLowerCase();
      if (rawCorrectKey === "một") rawCorrectKey = "a";

      // Tìm vị trí A/B/C/D mới sau khi đã trộn
      const newCorrectIdx = clientQ.optionOrder.indexOf(rawCorrectKey);
      const letters = ['a', 'b', 'c', 'd'];
      const correctLetter = letters[newCorrectIdx] || 'a';

      const userAns = (answers[idx] || "").toString().trim().toLowerCase();
      const isDone = userAns !== "";
      const isCorrect = isDone && (userAns === correctLetter);

      if (isDone) {
        submittedCount++;
        if (isCorrect) correct++;
        else wrong++;
      } else {
        wrong++;
      }

      return {
        _id: clientQ._id,
        question: clientQ.question,
        fileSource: currentUser.role === 'admin' ? originalQ.fileSource : undefined,
        userAns,
        userAnsText: isDone ? `${userAns.toUpperCase()}. ${clientQ.optionsText[indexMap[userAns]]}` : "Chưa chọn đáp án",
        correctLetter,
        correctText: `${correctLetter.toUpperCase()}. ${clientQ.optionsText[newCorrectIdx]}`,
        isDone,
        isCorrect,
        explanation: originalQ.explanation || originalQ.giảithích || "Chưa có giải thích."
      };
    }).filter(Boolean);

    return res.status(200).json({
      correct,
      wrong,
      submittedCount,
      totalAllowedCount: allowedData.length,
      results: gradedResults
    });
  }

  return res.status(400).json({ error: "Action không hợp lệ" });
}
