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

let CACHED_QUESTIONS = null;

function loadAllQuestions() {
  if (CACHED_QUESTIONS) return CACHED_QUESTIONS;

  const sources = {
    p1: require('./cau_hoi/p1.json'),
    p2: require('./cau_hoi/p2.json'),
    p3: require('./cau_hoi/p3.json'),
    p4: require('./cau_hoi/p4.json'),
    p5: require('./cau_hoi/p5.json'),
    p6: require('./cau_hoi/p6.json'),
    p7: require('./cau_hoi/p7.json'),
    p8: require('./cau_hoi/p8.json'),
    p9: require('./cau_hoi/p9.json'),
    p10: require('./cau_hoi/p10.json'),
    pcuathay: require('./cau_hoi/pcuathay.json')
  };

  let allQuestions = [];
  for (const [fileTag, content] of Object.entries(sources)) {
    content.forEach((q, idx) => {
      q._id = `${fileTag}_${idx}`;
      q.fileSource = fileTag;
    });
    allQuestions = allQuestions.concat(content);
  }

  CACHED_QUESTIONS = allQuestions;
  return allQuestions;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, username, password, userStats = {}, correctPool = [], answers = {}, questionList = [] } = req.body;

    let currentUser = null;

    if (action === 'login') {
      currentUser = USERS.find(x => x.username === username && x.password === password);
      if (!currentUser) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });
    } else {
      currentUser = USERS.find(x => x.username === username);
      if (!currentUser) return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ!" });
    }

    const allData = loadAllQuestions();
    if (allData.length === 0) {
      return res.status(500).json({ error: "Server không đọc được dữ liệu câu hỏi!" });
    }

    const poolRatio = getUserPoolRatio(currentUser);
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

    // GỘP ĐĂNG NHẬP VÀ LẤY ĐỀ VÀO CÙNG 1 LẦN GỌI
    if (action === 'start' || action === 'login') {
      const baseLimit = (currentUser.role === "admin") ? 50 : 100;
      const targetLimit = Math.min(baseLimit, allowedData.length);

      let activeCorrectPool = [...correctPool];
      let poolCheck = allowedData.filter(q => !activeCorrectPool.includes((q.question || q.cauhoi || "").trim()));
      let resetPool = false;
      if (poolCheck.length === 0 && allowedData.length > 0) {
        activeCorrectPool = [];
        resetPool = true;
      }

      const workingData = allowedData.map(q => {
        const qText = (q.question || q.cauhoi || "").trim();
        const st = userStats[qText] || {};
        return {
          ...q,
          weight: resetPool ? 1 : (st.weight || 1),
          wrongCount: resetPool ? 0 : (st.wrongCount || 0)
        };
      });

      const totalInStore = workingData.length || 1;
      let khoFile = {};
      let chiTieu = {};

      fileKeys.forEach(fileKey => {
        let tongKhoPhan = workingData.filter(q => q.fileSource === fileKey).length;
        let quota = Math.round((tongKhoPhan / totalInStore) * targetLimit);
        if (quota === 0 && tongKhoPhan > 0) quota = 1;
        chiTieu[fileKey] = quota;

        let fQs = shuffle(workingData.filter(q => q.fileSource === fileKey && !activeCorrectPool.includes((q.question || q.cauhoi || "").trim())));
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
              let add = khoFile[nextKey].splice(0, Math.min(missing, khoFile[nextKey].length));
              selected = selected.concat(add);
              missing -= add.length;
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
          optionOrder: shuffledOpts.map(o => o.key),
          optionsText: shuffledOpts.map(o => o.text),
          fileSource: currentUser.role === 'admin' ? q.fileSource : undefined
        };
      });

      let adminReport = null;
      if (currentUser.role === "admin") {
        adminReport = {};
        let tongLay = 0, tongSai = 0;
        fileKeys.forEach(fk => {
          const khoPhan = workingData.filter(q => q.fileSource === fk).length;
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
          "Tổng kho (câu)": workingData.length,
          "Đã lấy (câu)": tongLay,
          "Tỷ lệ trong đề": "100%",
          "Tỷ lệ / kho phần": ((tongLay / workingData.length) * 100).toFixed(1) + "%",
          "Câu sai làm lại": tongSai
        };
      }

      return res.status(200).json({
        user: { username: currentUser.username, role: currentUser.role },
        questions: clientQuestions,
        totalAllowedCount: workingData.length,
        resetPool,
        adminReport
      });
    }

    if (action === 'submit') {
      let correct = 0, wrong = 0, submittedCount = 0;
      const indexMap = { a: 0, b: 1, c: 2, d: 3 };

      const gradedResults = questionList.map((clientQ, idx) => {
        const originalQ = allData.find(x => x._id === clientQ._id);
        if (!originalQ) return null;

        let rawCorrectKey = (originalQ.answer || originalQ.trảlời || "").toString().trim().toLowerCase();
        if (rawCorrectKey === "một") rawCorrectKey = "a";

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
  } catch (err) {
    return res.status(500).json({ error: "Lỗi xử lý server: " + err.message });
  }
};
