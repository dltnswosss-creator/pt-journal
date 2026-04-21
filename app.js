import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBmnmT2Lf3WZbdT-BW4H3mu6_q3GGeJaTk',
  authDomain: 'bodytutorial-9a0f2.firebaseapp.com',
  projectId: 'bodytutorial-9a0f2',
  storageBucket: 'bodytutorial-9a0f2.firebasestorage.app',
  messagingSenderId: '194773962037',
  appId: '1:194773962037:web:252f8ccf5b9e30293c907c',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const TUTORS = ['이순재', '박재우', '이승일', '이종민'];
const DEFAULT_PW = '1234';

let exerciseDB = [], lastCache = {};
let members = {}, loggedInTutor = '', currentMember = '', currentDateStr = '', lastResult = '';
let recognition = null, isListening = false, currentTab = 'warmup';
let feedbackRec = null, isFeedbackListening = false;
let memoRec = null, isMemoListening = false, activeMemoBtn = null;
let selDate = new Date(), calYear = new Date().getFullYear(), calMonth = new Date().getMonth();
let gwChart = null, grChart = null, lessonChart = null;
let reportPeriod = 'month', loginTutor = '', dbEditName = null;
let importParsed = [];
let dbModalMediaList = [];

// ── 이벤트 바인딩 ─────────────────────────────
document.querySelectorAll('.login-tutor-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    loginTutor = this.dataset.name;
    document.querySelectorAll('.login-tutor-btn').forEach((b) => b.classList.remove('selected'));
    this.classList.add('selected');
    document.getElementById('login-pw').focus();
  });
});
document.getElementById('login-submit-btn').addEventListener('click', doLogin);
document.getElementById('login-pw').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('logout-btn').addEventListener('click', doLogout);
document.getElementById('add-member-btn').addEventListener('click', addMember);
document.getElementById('back-to-member-btn').addEventListener('click', () => showScreen('member'));
document.getElementById('back-to-exercise-btn').addEventListener('click', () => showScreen('exercise'));
document.getElementById('back-to-member-btn2').addEventListener('click', () => showScreen('member'));
document.getElementById('date-change-btn').addEventListener('click', toggleCalendar);
document.getElementById('cal-prev-btn').addEventListener('click', () => moveMonth(-1));
document.getElementById('cal-next-btn').addEventListener('click', () => moveMonth(1));
document.getElementById('mic-btn').addEventListener('click', toggleVoice);
document.getElementById('feedback-mic-btn').addEventListener('click', toggleFeedbackVoice);
document.getElementById('tab-warmup').addEventListener('click', () => switchTab('warmup'));
document.getElementById('tab-main').addEventListener('click', () => switchTab('main'));
document.getElementById('tab-cooldown').addEventListener('click', () => switchTab('cooldown'));
document.querySelectorAll('.add-exercise-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    addRow(this.dataset.section);
  });
});
document.getElementById('template-save-btn').addEventListener('click', openSaveTplModal);
document.getElementById('tpl-cancel-btn').addEventListener('click', closeSaveTplModal);
document.getElementById('tpl-save-confirm-btn').addEventListener('click', saveTemplate);
document.getElementById('tpl-name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveTemplate();
});
document.getElementById('save-record-btn').addEventListener('click', saveRecord);
document.getElementById('copy-btn').addEventListener('click', copyResult);
document.getElementById('band-btn').addEventListener('click', openBand);
document.getElementById('db-add-btn').addEventListener('click', () => openDbModal());
document.getElementById('db-modal-cancel-btn').addEventListener('click', closeDbModal);
document.getElementById('db-modal-save-btn').addEventListener('click', saveDbModal);
document.getElementById('db-search').addEventListener('input', renderDB);
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', function () {
    navTo(this.dataset.page);
  });
});
document.querySelectorAll('.period-tab').forEach((btn) => {
  btn.addEventListener('click', function () {
    setPeriod(this.dataset.period, this);
  });
});
document.getElementById('growth-member').addEventListener('change', onGrowthMemberChange);
document.getElementById('growth-exercise').addEventListener('change', loadGrowthData);
document.getElementById('growth-period').addEventListener('change', loadGrowthData);
document.getElementById('history-member').addEventListener('change', loadHistory);
document.getElementById('history-period').addEventListener('change', loadHistory);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.name-wrap')) hideAllAC();
});
document.getElementById('import-parse-btn').addEventListener('click', doImportParse);
document.getElementById('import-save-btn').addEventListener('click', doImportSave);
document.getElementById('import-reset-btn').addEventListener('click', () => {
  document.getElementById('import-preview-card').style.display = 'none';
  document.getElementById('import-parse-status').style.display = 'none';
  importParsed = [];
});

// DB 모달 미디어 이벤트
document.getElementById('db-modal-file-input').addEventListener('change', function () {
  Array.from(this.files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      dbModalMediaList.push({ type: 'file', src: e.target.result, file });
      renderDbModalMedia();
    };
    reader.readAsDataURL(file);
  });
  this.value = '';
});
document.getElementById('db-modal-add-url-btn').addEventListener('click', () => {
  const url = document.getElementById('db-modal-url-input').value.trim();
  if (!url) return;
  dbModalMediaList.push({ type: 'url', src: url });
  document.getElementById('db-modal-url-input').value = '';
  renderDbModalMedia();
});

function renderDbModalMedia() {
  const preview = document.getElementById('db-modal-media-preview');
  preview.innerHTML = '';
  dbModalMediaList.forEach((m, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'db-media-thumb';
    thumb.innerHTML = `<img src="${m.src}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect fill=%22%23eee%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2245%22 text-anchor=%22middle%22 fill=%22%23aaa%22 font-size=%2212%22>오류</text></svg>'" />
                       <button class="db-media-thumb-del" data-idx="${i}">✕</button>`;
    thumb.querySelector('.db-media-thumb-del').addEventListener('click', function () {
      dbModalMediaList.splice(parseInt(this.dataset.idx), 1);
      renderDbModalMedia();
    });
    preview.appendChild(thumb);
  });
}

// ══════════════════════════════════════════════
// ✅ 밴드 가져오기 파서
// ══════════════════════════════════════════════
function parseBandText(raw) {
  const blocks = raw.split(/(?=#운동일지)/g).filter((b) => b.trim());
  if (blocks.length === 0) return [parseSingleBlock(raw.trim())].filter(Boolean);
  return blocks.map((b) => parseSingleBlock(b.trim())).filter(Boolean);
}

function parseSingleBlock(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
  if (!lines.length) return null;

  let dateStr = '', dateObj = '', routineLabel = '';
  for (const line of lines) {
    const m1 = line.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})\s*[\(（]?([^)）\n]*)[\)）]?/);
    if (m1) {
      const [, y, mo, d, lbl] = m1;
      dateStr = y + '년 ' + parseInt(mo) + '월 ' + parseInt(d) + '일';
      dateObj = y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0') + 'T00:00:00.000Z';
      routineLabel = (lbl || '').trim().replace(/[()（）]/g, '');
      break;
    }
    const m2 = line.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (m2) {
      const [, y, mo, d] = m2;
      dateStr = y + '년 ' + parseInt(mo) + '월 ' + parseInt(d) + '일';
      dateObj = y + '-' + mo.padStart(2, '0') + '-' + d.padStart(2, '0') + 'T00:00:00.000Z';
      break;
    }
  }
  if (!dateStr) return null;

  let feedback = '';
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/오늘의\s*한마디/)) {
      const fbLines = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('*') || lines[j].match(/^\d+\./) || lines[j].match(/^#/)) break;
        fbLines.push(lines[j]);
      }
      feedback = fbLines.join(' ').trim();
      break;
    }
  }

  const exercises = [];
  let currentSection = 'main';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\*Warm/i.test(line) || /워밍업/i.test(line)) { currentSection = 'warmup'; continue; }
    if (/\*Main/i.test(line) || /메인워크아웃/i.test(line)) { currentSection = 'main'; continue; }
    if (/\*Cool/i.test(line) || /쿨다운/i.test(line)) { currentSection = 'cooldown'; continue; }

    const nameMatch = line.match(/^\d+\.\s+(.+)/);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    let weight = 0, sets = 0, reps = 0, unit = '회', memo = '';

    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (next.match(/^\d+\./) || next.startsWith('*') || next.match(/^#/)) break;
      if (next.startsWith('::')) {
        memo = next.replace(/^::+\s*/, '').trim();
        continue;
      }
      if (next.startsWith('-') || /^\d+\s*se[ts]+/i.test(next)) {
        if (/초/.test(next)) unit = '초';
        const wm = next.match(/(\d+(?:\.\d+)?)\s*kg/i);
        if (wm) weight = parseFloat(wm[1]);
        const sm = next.match(/(\d+)\s*se[ts]+/i);
        if (sm) sets = parseInt(sm[1]);
        const rm = next.match(/(\d+)(?:~\d+)?\s*(?:reps?|회|번)/i);
        if (rm) reps = parseInt(rm[1]);
        if (reps === 0 && sets > 0) {
          const nums = (next.match(/\d+/g) || []).map(Number);
          const used = new Set([sets, weight]);
          const rest = nums.filter((n) => !used.has(n));
          if (rest.length > 0) reps = rest[rest.length - 1];
        }
      }
    }
    exercises.push({ section: currentSection, name, weight, sets, reps, unit, memo });
  }

  if (!exercises.length) return null;
  return { date: dateStr, dateObj, routineLabel, feedback, exercises };
}

function doImportParse() {
  const text = document.getElementById('import-text').value.trim();
  const member = document.getElementById('import-member').value.trim();
  const st = document.getElementById('import-parse-status');
  if (!text) { showImportSt(st, 'err', '밴드 글을 붙여넣어 주세요'); return; }
  if (!member) { showImportSt(st, 'err', '회원 이름을 입력해주세요'); return; }
  try {
    importParsed = parseBandText(text);
    if (!importParsed.length) {
      showImportSt(st, 'err', '날짜(예: 2026.03.25) 또는 운동 목록을 찾지 못했어요');
      return;
    }
    renderImportPreview();
    showImportSt(st, 'ok', '✅ ' + importParsed.length + '개 일지 파싱 완료! 아래에서 확인하세요');
    document.getElementById('import-preview-card').style.display = 'block';
    document.getElementById('import-preview-card').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    showImportSt(st, 'err', '파싱 오류: ' + e.message);
  }
}

function renderImportPreview() {
  const list = document.getElementById('import-preview-list');
  const tutor = document.getElementById('import-tutor').value;
  const member = document.getElementById('import-member').value.trim();
  document.getElementById('import-count-info').textContent =
    '총 ' + importParsed.length + '개 일지 · ' + member + ' 회원 · ' + tutor + ' 튜터';
  list.innerHTML = '';
  importParsed.forEach((j) => {
    const wu = j.exercises.filter((e) => e.section === 'warmup');
    const mn = j.exercises.filter((e) => e.section === 'main');
    const cd = j.exercises.filter((e) => e.section === 'cooldown');
    const div = document.createElement('div');
    div.className = 'import-preview-item';
    const lbl = j.routineLabel ? ' · ' + j.routineLabel : '';
    let html =
      '<div class="import-preview-header">' +
      '<span class="import-preview-date">📅 ' + j.date + lbl + '</span>' +
      '<span class="import-preview-meta">운동 ' + j.exercises.length + '개</span>' +
      '</div><div class="import-preview-body">';
    const sec = (badge, cls, arr) => {
      if (!arr.length) return '';
      let s = '<span class="section-badge ' + cls + '">' + badge + '</span>';
      arr.forEach((ex) => {
        s +=
          '<div class="import-ex-row"><span class="import-ex-name">' + ex.name + '</span>' +
          '<span class="import-ex-detail">' +
          (ex.weight ? ' · ' + ex.weight + 'kg' : '') +
          (ex.sets ? ' · ' + ex.sets + '세트' : '') +
          (ex.reps ? ' · ' + ex.reps + ex.unit : '') +
          '</span>' +
          (ex.memo ? '<span class="import-ex-memo">💬 ' + ex.memo + '</span>' : '') +
          '</div>';
      });
      return s;
    };
    html += sec('🔥 Warm up', 'badge-warmup', wu);
    html += sec('💪 Main workout', 'badge-main', mn);
    html += sec('❄️ Cool down', 'badge-cooldown', cd);
    if (j.feedback) html += '<div class="import-feedback-box">✅ ' + j.feedback + '</div>';
    html += '</div>';
    div.innerHTML = html;
    list.appendChild(div);
  });
}

async function doImportSave() {
  const member = document.getElementById('import-member').value.trim();
  const tutor = document.getElementById('import-tutor').value;
  const st = document.getElementById('import-save-status');
  document.getElementById('import-save-btn').disabled = true;
  showImportSt(st, 'loading', 'Firebase에 저장 중...');
  try {
    let saved = 0;
    for (const j of importParsed) {
      const dateStr = j.dateObj.slice(0, 10);
      const jid = tutor + '_' + member + '_' + dateStr;
      const ym = dateStr.slice(0, 7);
      const yr = dateStr.slice(0, 4);
      const wu = j.exercises.filter((e) => e.section === 'warmup');
      const mn = j.exercises.filter((e) => e.section === 'main');
      const cd = j.exercises.filter((e) => e.section === 'cooldown');
      await setDoc(doc(db, 'journals', jid), {
        tutor, member, date: j.date, dateObj: j.dateObj,
        yearMonth: ym, year: yr, warmup: wu, main: mn, cooldown: cd,
        feedback: j.feedback || '', createdAt: new Date().toISOString(),
      });
      for (const ex of j.exercises) {
        await addDoc(collection(db, 'workout_records'), {
          member, tutor, date: j.date, dateObj: j.dateObj,
          exerciseName: ex.name, weight: ex.weight || 0,
          sets: ex.sets || 0, reps: ex.reps || 0, unit: ex.unit || '회',
          memo: ex.memo || '', createdAt: new Date(),
        });
      }
      await setDoc(doc(db, 'lesson_records', jid), {
        tutor, member, date: j.date, dateObj: j.dateObj,
        yearMonth: ym, year: yr, createdAt: new Date().toISOString(),
      });
      await autoAddToExerciseDB(j.exercises.map((e) => e.name).filter((n) => n));
      saved++;
      showImportSt(st, 'loading', '저장 중... (' + saved + '/' + importParsed.length + ')');
    }
    showImportSt(st, 'ok', '🎉 완료! ' + saved + '개 일지가 저장됐어요. 일지조회 탭에서 확인하세요!');
  } catch (e) {
    showImportSt(st, 'err', '저장 실패: ' + e.message);
  }
  document.getElementById('import-save-btn').disabled = false;
}

function showImportSt(el, type, msg) {
  el.className = 'import-status ' + type;
  el.textContent = msg;
}

// ══════════════════════════════════════════════
// 운동 DB
// ══════════════════════════════════════════════
async function loadExerciseDB() {
  exerciseDB = [];
  try {
    const snap = await getDocs(collection(db, 'exercise_db'));
    snap.docs.forEach((d) => {
      const x = d.data();
      exerciseDB.push({ name: x.name, method: x.method || '', hasMethod: !!x.method, images: x.images || [] });
    });
    exerciseDB.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  } catch (e) { console.error(e); }
}

async function autoAddToExerciseDB(names) {
  const exist = exerciseDB.map((e) => e.name.toLowerCase());
  const newNames = [...new Set(names.map((n) => n.trim()).filter((n) => n && !exist.includes(n.toLowerCase())))];
  for (const name of newNames) {
    try {
      await setDoc(doc(db, 'exercise_db', name), { name, method: '', hasMethod: false, images: [], createdAt: new Date().toISOString() });
      exerciseDB.push({ name, method: '', hasMethod: false, images: [] });
    } catch (e) {}
  }
  if (newNames.length > 0) exerciseDB.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

async function loadLastRecords(member) {
  lastCache = {};
  try {
    const q = query(collection(db, 'workout_records'), where('member', '==', member), where('tutor', '==', loggedInTutor));
    const snap = await getDocs(q);
    const byEx = {};
    snap.docs.forEach((d) => {
      const r = d.data();
      if (!byEx[r.exerciseName] || new Date(r.dateObj) > new Date(byEx[r.exerciseName].dateObj))
        byEx[r.exerciseName] = r;
    });
    Object.entries(byEx).forEach(([name, r]) => {
      lastCache[name] = { weight: r.weight, sets: r.sets, reps: r.reps, unit: r.unit || '회', date: r.date };
    });
  } catch (e) { console.error(e); }
}

// ══════════════════════════════════════════════
// 템플릿
// ══════════════════════════════════════════════
function loadTpls() {
  try { return JSON.parse(localStorage.getItem('pt-tpl-' + loggedInTutor) || '[]'); }
  catch (e) { return []; }
}
function saveTpls(t) {
  localStorage.setItem('pt-tpl-' + loggedInTutor, JSON.stringify(t));
}

function renderTemplates() {
  const tpls = loadTpls();
  const list = document.getElementById('template-list');
  if (tpls.length === 0) {
    list.innerHTML = '<span style="font-size:12px;color:#bbb">저장된 템플릿이 없어요</span>';
    return;
  }
  list.innerHTML = '';
  tpls.forEach((t, i) => {
    const chip = document.createElement('div');
    chip.className = 'template-chip';
    chip.innerHTML = '<span>' + t.name + '</span><span class="template-chip-del">✕</span>';
    chip.querySelector('span').addEventListener('click', () => applyTemplate(i));
    chip.querySelector('.template-chip-del').addEventListener('click', () => deleteTpl(i));
    list.appendChild(chip);
  });
}

function openSaveTplModal() {
  document.getElementById('tpl-name-input').value = '';
  document.getElementById('tpl-save-modal').classList.add('open');
  setTimeout(() => document.getElementById('tpl-name-input').focus(), 100);
}
function closeSaveTplModal() {
  document.getElementById('tpl-save-modal').classList.remove('open');
}

function saveTemplate() {
  const name = document.getElementById('tpl-name-input').value.trim();
  if (!name) { alert('템플릿 이름을 입력해주세요!'); return; }
  const w = getExercises('warmup'), m = getExercises('main'), c = getExercises('cooldown');
  if (w.length === 0 && m.length === 0 && c.length === 0) { alert('운동을 먼저 입력해주세요!'); return; }
  const tpls = loadTpls();
  tpls.push({ name, warmup: w, main: m, cooldown: c });
  saveTpls(tpls);
  closeSaveTplModal();
  renderTemplates();
  alert('✅ "' + name + '" 템플릿이 저장됐어요!');
}

function applyTemplate(i) {
  const t = loadTpls()[i];
  if (!t) return;
  if (!confirm('"' + t.name + '" 템플릿을 불러올까요?\n현재 내용은 지워져요.')) return;
  ['warmup', 'main', 'cooldown'].forEach((s) => { document.getElementById('list-' + s).innerHTML = ''; });
  t.warmup?.forEach((e) => addRow('warmup', e.name, '', '', e.unit || '회'));
  t.main?.forEach((e) => addRow('main', e.name, '', '', e.unit || '회'));
  t.cooldown?.forEach((e) => addRow('cooldown', e.name, '', '', e.unit || '회'));
  switchTab('warmup');
  alert('✅ 불러왔어요! 중량/세트/횟수를 입력해주세요');
}

function deleteTpl(i) {
  const tpls = loadTpls();
  if (!confirm('"' + tpls[i].name + '" 삭제할까요?')) return;
  tpls.splice(i, 1);
  saveTpls(tpls);
  renderTemplates();
}

// ══════════════════════════════════════════════
// 자동완성 & 힌트
// ══════════════════════════════════════════════
function showAC(input, val) {
  const wrap = input.closest('.name-wrap');
  let acList = wrap.querySelector('.autocomplete-list');
  if (!acList) {
    acList = document.createElement('div');
    acList.className = 'autocomplete-list';
    wrap.appendChild(acList);
  }
  if (!val.trim()) { acList.classList.remove('show'); return; }
  const matches = exerciseDB.filter((e) => e.name.toLowerCase().includes(val.toLowerCase())).slice(0, 8);
  if (!matches.length) { acList.classList.remove('show'); return; }
  acList.innerHTML = '';
  matches.forEach((ex) => {
    const last = lastCache[ex.name];
    const item = document.createElement('div');
    item.className = 'ac-item';
    item.innerHTML =
      '<div class="ac-name">' + ex.name + '</div>' +
      (last
        ? '<div class="ac-last">📅 지난번: ' +
          (last.weight ? last.weight + 'kg ' : '') +
          (last.sets ? last.sets + '세트 ' : '') +
          (last.reps ? last.reps + last.unit : '') +
          ' (' + last.date + ')</div>'
        : '') +
      (ex.method ? '<div class="ac-method">' + ex.method + '</div>' : '');
    item.addEventListener('click', () => {
      input.value = ex.name;
      acList.classList.remove('show');
      const block = input.closest('.exercise-block');
      showMethodHint(block, ex.name);
      showLastHint(block, ex.name, '');
      block.querySelector('input[data-role="weight-main"]')?.focus();
    });
    acList.appendChild(item);
  });
  acList.classList.add('show');
}

function hideAllAC() {
  document.querySelectorAll('.autocomplete-list').forEach((el) => el.classList.remove('show'));
}

function showLastHint(block, exerciseName, currentWeight) {
  const hint = block.querySelector('.last-hint');
  if (!hint) return;
  const last = lastCache[exerciseName];
  if (!last) { hint.classList.remove('show'); return; }
  const cw = parseFloat(currentWeight) || 0, lw = last.weight || 0;
  let badge = '';
  if (cw > 0 && lw > 0) {
    const diff = Math.round((cw - lw) * 10) / 10;
    if (diff > 0) badge = '<span class="last-hint-badge up">▲ +' + diff + 'kg</span>';
    else if (diff < 0) badge = '<span class="last-hint-badge down">▼ ' + diff + 'kg</span>';
    else badge = '<span class="last-hint-badge same">= 동일</span>';
  }
  hint.innerHTML =
    '<span class="last-hint-label">📅 지난번</span>' +
    '<span class="last-hint-val">' +
    (last.weight ? last.weight + 'kg ' : '') +
    (last.sets ? last.sets + '세트 ' : '') +
    (last.reps ? last.reps + last.unit : '') +
    '</span>' +
    badge +
    '<button class="last-hint-apply" data-name="' + exerciseName.replace(/"/g, '&quot;') + '">그대로 적용</button>';
  hint.querySelector('.last-hint-apply').addEventListener('click', function () {
    applyLast(this, this.dataset.name);
  });
  hint.classList.add('show');
}

function applyLast(btn, name) {
  const last = lastCache[name];
  if (!last) return;
  const block = btn.closest('.exercise-block');
  const mainW = block.querySelector('input[data-role="weight-main"]');
  if (mainW) mainW.value = last.weight || '';
  block.querySelector('input[data-role="sets"]').value = last.sets || '';
  block.querySelector('input[data-role="reps"]').value = last.reps || '';
  const ub = block.querySelector('.unit-toggle');
  if (ub) ub.textContent = last.unit || '회';
  updatePerSetWeights(block);
  showLastHint(block, name, last.weight || '');
}

function showMethodHint(block, name) {
  const hint = block.querySelector('.method-hint');
  if (!hint) return;
  const found = exerciseDB.find((e) => e.name === name);
  if (found && found.method) {
    hint.querySelector('.method-hint-text').textContent = found.method;
    hint.classList.add('show');
  } else hint.classList.remove('show');
}

function useMethodHint(btn) {
  const method = btn.closest('.method-hint').querySelector('.method-hint-text').textContent;
  const block = btn.closest('.exercise-block');
  const memo = block.querySelector('.exercise-memo');
  if (memo) {
    memo.value = memo.value ? memo.value + '\n' + method : method;
  }
  btn.closest('.method-hint').classList.remove('show');
}

// ══════════════════════════════════════════════
// 인증
// ══════════════════════════════════════════════
async function doLogin() {
  const err = document.getElementById('login-error');
  if (!loginTutor) { err.textContent = '튜터를 선택해주세요'; return; }
  const pw = document.getElementById('login-pw').value;
  if (!pw) { err.textContent = '비밀번호를 입력해주세요'; return; }
  err.textContent = '확인 중...';
  try {
    let cpw = DEFAULT_PW;
    try {
      const s = await getDoc(doc(db, 'tutor_passwords', loginTutor));
      if (s.exists()) cpw = s.data().password || DEFAULT_PW;
    } catch (e) {}
    if (pw === cpw) await onLoginOK(loginTutor);
    else err.textContent = '비밀번호가 틀렸어요';
  } catch (e) {
    err.textContent = '오류가 발생했어요';
  }
}

async function onLoginOK(name) {
  loggedInTutor = name;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-header').style.display = 'flex';
  document.getElementById('bottom-nav').style.display = 'flex';
  document.getElementById('header-tutor-name').textContent = name + ' 튜터';
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-pw').value = '';
  document.getElementById('import-tutor').value = name;
  await loadMembersFromFB();
  await loadExerciseDB();
  await saveMemberSnap();
  renderMembers();
  renderTemplates();
  showScreen('member');
}

function doLogout() {
  if (!confirm('로그아웃 하시겠어요?')) return;
  loggedInTutor = '';
  loginTutor = '';
  document.getElementById('main-header').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';
  document.querySelectorAll('.login-tutor-btn').forEach((b) => b.classList.remove('selected'));
  document.getElementById('login-pw').value = '';
  document.getElementById('login-error').textContent = '';
  ['member-screen', 'exercise-screen', 'result-screen', 'db-screen', 'growth-screen', 'history-screen', 'dashboard-screen', 'import-screen'].forEach((id) => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('login-screen').style.display = 'flex';
}

// ══════════════════════════════════════════════
// 회원 관리
// ══════════════════════════════════════════════
async function loadMembersFromFB() {
  members[loggedInTutor] = [];
  try {
    const q = query(collection(db, 'members'), where('tutor', '==', loggedInTutor));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const x = d.data();
      members[loggedInTutor].push({ id: d.id, name: x.name, order: x.order || 0 });
    });
    members[loggedInTutor].sort((a, b) => a.order - b.order);
  } catch (e) { console.error(e); }
}

function myMembers() { return members[loggedInTutor] || []; }
function myMemberNames() { return myMembers().map((m) => m.name); }

async function saveMemberSnap() {
  const ym = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  for (const t of TUTORS) {
    try {
      let cnt = t === loggedInTutor
        ? myMemberNames().length
        : (await getDocs(query(collection(db, 'members'), where('tutor', '==', t)))).size;
      await setDoc(doc(db, 'member_snapshots', t + '_' + ym), {
        tutor: t, yearMonth: ym, count: cnt, updatedAt: new Date().toISOString(),
      });
    } catch (e) {}
  }
}

// ══════════════════════════════════════════════
// 네비게이션 & 화면 전환
// ══════════════════════════════════════════════
function navTo(page) {
  ['home', 'history', 'growth', 'dashboard', 'db', 'import'].forEach((p) =>
    document.getElementById('nav-' + p)?.classList.remove('active')
  );
  document.getElementById('nav-' + page)?.classList.add('active');
  if (page === 'home') showScreen('member');
  if (page === 'db') { renderDB(); showScreen('db'); }
  if (page === 'growth') { loadGrowthMemberOpts(); showScreen('growth'); }
  if (page === 'history') { loadHistoryMemberOpts(); showScreen('history'); }
  if (page === 'dashboard') { showScreen('dashboard'); loadReport(); loadDashboard(); }
  if (page === 'import') { document.getElementById('import-tutor').value = loggedInTutor; showScreen('import'); }
}

function showScreen(name) {
  ['member-screen', 'exercise-screen', 'result-screen', 'db-screen', 'growth-screen', 'history-screen', 'dashboard-screen', 'import-screen'].forEach((id) => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(name + '-screen').style.display = 'block';
}

// ══════════════════════════════════════════════
// 날짜 & 캘린더
// ══════════════════════════════════════════════
function fmtDate(d) {
  return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}
function updateDateDisp() {
  currentDateStr = fmtDate(selDate);
  document.getElementById('date-display').textContent = '📅 ' + currentDateStr;
}
function toggleCalendar() {
  const w = document.getElementById('calendar-wrap');
  if (w.classList.toggle('open')) renderCal();
}
function moveMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCal();
}
function renderCal() {
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('cal-title').textContent = calYear + '년 ' + months[calMonth];
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['일','월','화','수','목','금','토'].forEach((d) => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    grid.appendChild(el);
  });
  const fd = new Date(calYear, calMonth, 1).getDay();
  const ld = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();
  for (let i = 0; i < fd; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }
  for (let d = 1; d <= ld; d++) {
    const el = document.createElement('div');
    const dow = (fd + d - 1) % 7;
    let cls = 'cal-day';
    if (dow === 0) cls += ' sun';
    if (dow === 6) cls += ' sat';
    if (d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()) cls += ' today';
    if (d === selDate.getDate() && calMonth === selDate.getMonth() && calYear === selDate.getFullYear()) cls += ' selected';
    el.className = cls;
    el.textContent = d;
    el.addEventListener('click', () => pickDate(d));
    grid.appendChild(el);
  }
}
function pickDate(d) {
  selDate = new Date(calYear, calMonth, d);
  updateDateDisp();
  document.getElementById('calendar-wrap').classList.remove('open');
}

// ══════════════════════════════════════════════
// 회원 목록 렌더링
// ══════════════════════════════════════════════
function renderMembers() {
  document.getElementById('tutor-name-display').textContent = loggedInTutor + ' 튜터';
  const list = document.getElementById('member-list');
  list.innerHTML = '';
  const mm = myMembers();
  const cnt = document.createElement('p');
  cnt.style.cssText = 'font-size:13px;color:#2d6a4f;font-weight:bold;margin-bottom:12px;';
  cnt.textContent = '총 ' + mm.length + '명';
  list.appendChild(cnt);
  if (mm.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'color:#aaa;font-size:14px;margin-bottom:12px;';
    p.textContent = '아직 등록된 회원이 없어요';
    list.appendChild(p);
    return;
  }
  mm.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'member-row';
    const nb = document.createElement('button');
    nb.className = 'name-btn';
    nb.textContent = m.name;
    nb.addEventListener('click', () => selectMember(m.name));
    const db2 = document.createElement('button');
    db2.className = 'del-member-btn';
    db2.textContent = '✕';
    db2.addEventListener('click', () => delMember(m.id, i));
    row.appendChild(nb);
    row.appendChild(db2);
    list.appendChild(row);
  });
}

async function addMember() {
  const name = prompt('새 회원 이름을 입력하세요:');
  if (name && name.trim()) {
    try {
      const ref = await addDoc(collection(db, 'members'), {
        tutor: loggedInTutor, name: name.trim(), order: Date.now(), createdAt: new Date().toISOString(),
      });
      members[loggedInTutor].push({ id: ref.id, name: name.trim(), order: Date.now() });
      await saveMemberSnap();
      renderMembers();
    } catch (e) { alert('저장 중 오류가 발생했어요.'); }
  }
}

async function delMember(id, i) {
  if (!confirm(myMembers()[i]?.name + ' 회원을 삭제할까요?')) return;
  try {
    if (id) await deleteDoc(doc(db, 'members', id));
    members[loggedInTutor].splice(i, 1);
    await saveMemberSnap();
    renderMembers();
  } catch (e) {}
}

async function selectMember(name) {
  currentMember = name;
  document.getElementById('member-name-display').textContent = name + ' 회원님';
  selDate = new Date();
  calYear = selDate.getFullYear();
  calMonth = selDate.getMonth();
  updateDateDisp();
  ['warmup', 'main', 'cooldown'].forEach((s) => { document.getElementById('list-' + s).innerHTML = ''; });
  document.getElementById('feedback-msg').value = '';
  await loadLastRecords(name);
  renderTemplates();
  addRow('warmup');
  addRow('main');
  switchTab('warmup');
  showScreen('exercise');
}

function switchTab(name) {
  currentTab = name;
  ['warmup', 'main', 'cooldown'].forEach((t) => {
    document.getElementById('tab-' + t).classList.toggle('active', t === name);
    document.getElementById('panel-' + t).classList.toggle('active', t === name);
  });
}

// ══════════════════════════════════════════════
// 세트별 중량 입력칸
// ══════════════════════════════════════════════
function updatePerSetWeights(block) {
  const setsInput = block.querySelector('input[data-role="sets"]');
  const perSetSection = block.querySelector('.per-set-weights');
  const perSetGrid = block.querySelector('.per-set-weights-grid');
  const mainWeightInput = block.querySelector('input[data-role="weight-main"]');
  const mainRepsInput = block.querySelector('input[data-role="reps"]');
  const unitToggle = block.querySelector('.unit-toggle');
  if (!setsInput || !perSetSection || !perSetGrid) return;
  const n = parseInt(setsInput.value) || 0;
  const mainW = mainWeightInput ? mainWeightInput.value : '';
  const mainR = mainRepsInput ? mainRepsInput.value : '';
  const unit = unitToggle ? unitToggle.textContent.trim() : '회';
  if (n >= 1) {
    const prevW = Array.from(perSetGrid.querySelectorAll('input[data-role="set-weight"]')).map((el) => el.value);
    const prevR = Array.from(perSetGrid.querySelectorAll('input[data-role="set-reps"]')).map((el) => el.value);
    perSetGrid.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      const item = document.createElement('div');
      item.className = 'set-weight-item';
      const wVal = prevW[i - 1] !== undefined && prevW[i - 1] !== '' ? prevW[i - 1] : mainW;
      const rVal = prevR[i - 1] !== undefined && prevR[i - 1] !== '' ? prevR[i - 1] : mainR;
      item.innerHTML =
        '<label>' + i + '세트</label>' +
        '<input type="number" data-role="set-weight" data-set="' + i + '" placeholder="kg" min="0" value="' + wVal + '" />' +
        '<input type="number" data-role="set-reps" data-set="' + i + '" placeholder="' + unit + '" min="0" value="' + rVal + '" />';
      perSetGrid.appendChild(item);
    }
    perSetSection.classList.add('show');
  } else {
    perSetSection.classList.remove('show');
    perSetGrid.innerHTML = '';
  }
}

// ══════════════════════════════════════════════
// 운동 입력 행
// ══════════════════════════════════════════════
function addRow(section, name = '', weight = '', sets = '', reps = '', unit = '회', memo = '') {
  const block = document.createElement('div');
  block.className = 'exercise-block';
  block.innerHTML = `
    <div class="exercise-name-row">
      <div class="name-wrap">
        <input type="text" placeholder="예) 스쿼트" value="${name}" />
        <div class="autocomplete-list"></div>
      </div>
      <button class="delete-btn">✕</button>
    </div>
    <div class="last-hint"></div>
    <div class="method-hint">
      <div class="method-hint-header">
        <span class="method-hint-title">📌 저장된 운동 방법</span>
        <button class="method-hint-use">메모에 추가 ↓</button>
      </div>
      <div class="method-hint-text"></div>
    </div>

    <div class="sets-weight-section">
      <div class="sets-header">
        <span>중량(kg)</span>
        <span>세트</span>
        <span>횟수/초</span>
      </div>
      <div class="sets-info-row">
        <input type="number" data-role="weight-main" placeholder="60" min="0" value="${weight}" />
        <input type="number" data-role="sets" placeholder="3" min="1" value="${sets}" />
        <div class="reps-cell">
          <input type="number" data-role="reps" placeholder="10" min="1" value="${reps}" />
          <button class="unit-toggle">${unit}</button>
        </div>
      </div>
      <div class="per-set-weights">
        <div class="per-set-weights-label">📊 세트별 중량 / 횟수</div>
        <div class="per-set-weights-grid"></div>
      </div>
    </div>

    <div class="memo-row">
      <textarea class="exercise-memo" placeholder="운동 메모 (코칭 포인트, 느낌 등 / 🎤 음성 입력 가능)">${memo}</textarea>
      <button class="memo-mic-btn">🎤</button>
    </div>

    <div class="media-attach-section">
      <div class="media-attach-toggle">📎 사진/영상 첨부 <span style="font-size:10px;color:#aaa;margin-left:4px">(선택)</span></div>
      <div class="media-attach-body">
        <div class="media-tabs">
          <button class="media-tab active" data-mtab="upload">📁 파일 업로드</button>
          <button class="media-tab" data-mtab="url">🔗 URL 링크</button>
          <button class="media-tab" data-mtab="google">🔍 구글 검색</button>
        </div>
        <div class="media-panel active" data-mpanel="upload">
          <label class="media-upload-area">
            <div class="media-upload-icon">📷</div>
            <div class="media-upload-label">여기를 탭해서 사진/영상 선택</div>
            <input type="file" accept="image/*,video/*" multiple />
          </label>
          <div class="media-hint">사진: JPG, PNG / 영상: MP4 지원</div>
        </div>
        <div class="media-panel" data-mpanel="url">
          <div class="media-url-row">
            <input class="media-url-input" placeholder="이미지/영상 URL 붙여넣기 (http...)" />
            <button class="media-url-add-btn">추가</button>
          </div>
          <div class="media-hint">유튜브 링크, 구글 이미지 주소 등 직접 붙여넣기</div>
        </div>
        <div class="media-panel" data-mpanel="google">
          <div class="google-search-row">
            <input class="google-search-input" placeholder="운동 이름으로 구글 검색..." />
            <button class="google-search-btn">🔍 검색</button>
          </div>
          <div class="google-hint">버튼을 누르면 구글 이미지 검색 페이지가 새 탭으로 열려요.<br>원하는 이미지 주소를 복사한 뒤 'URL 링크' 탭에 붙여넣으세요.</div>
        </div>
        <div class="media-preview-grid"></div>
      </div>
    </div>`;

  const nameInput = block.querySelector('.name-wrap input');
  nameInput.addEventListener('input', function () { onNameInput(this); });
  nameInput.addEventListener('focus', function () { onNameInput(this); });
  nameInput.addEventListener('keydown', function (e) { onNameKey(e, this); });

  block.querySelector('input[data-role="weight-main"]').addEventListener('input', function () { onWeightInput(this); });

  block.querySelector('input[data-role="sets"]').addEventListener('input', function () { updatePerSetWeights(block); });
  block.querySelector('input[data-role="sets"]').addEventListener('change', function () { updatePerSetWeights(block); });

  block.querySelector('.unit-toggle').addEventListener('click', function () { toggleUnit(this); });
  block.querySelector('.delete-btn').addEventListener('click', function () { this.closest('.exercise-block').remove(); });
  block.querySelector('.method-hint-use').addEventListener('click', function () { useMethodHint(this); });
  block.querySelector('.memo-mic-btn').addEventListener('click', function () { toggleMemoVoice(this); });

  block.querySelector('.media-attach-toggle').addEventListener('click', function () {
    const body = block.querySelector('.media-attach-body');
    body.classList.toggle('open');
    this.textContent = body.classList.contains('open') ? '📎 사진/영상 첨부 ▲' : '📎 사진/영상 첨부 ▼';
    if (body.classList.contains('open')) {
      const exName = block.querySelector('.name-wrap input').value.trim();
      if (exName) block.querySelector('.google-search-input').value = exName + ' 운동 방법';
    }
  });

  block.querySelectorAll('.media-tab').forEach((tab) => {
    tab.addEventListener('click', function () {
      const target = this.dataset.mtab;
      block.querySelectorAll('.media-tab').forEach((t) => t.classList.remove('active'));
      block.querySelectorAll('.media-panel').forEach((p) => p.classList.remove('active'));
      this.classList.add('active');
      block.querySelector('[data-mpanel="' + target + '"]').classList.add('active');
    });
  });

  block.querySelector('[data-mpanel="upload"] input[type="file"]').addEventListener('change', function () {
    Array.from(this.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => addMediaThumb(block, e.target.result, file.type.startsWith('video') ? 'video' : 'image');
      reader.readAsDataURL(file);
    });
    this.value = '';
  });

  block.querySelector('.media-url-add-btn').addEventListener('click', function () {
    const urlInput = block.querySelector('.media-url-input');
    const url = urlInput.value.trim();
    if (!url) return;
    addMediaThumb(block, url, 'image');
    urlInput.value = '';
  });

  block.querySelector('.google-search-btn').addEventListener('click', function () {
    const q = block.querySelector('.google-search-input').value.trim();
    const query = q || (block.querySelector('.name-wrap input').value.trim() + ' 운동');
    window.open('https://www.google.com/search?q=' + encodeURIComponent(query) + '&tbm=isch', '_blank');
  });
  block.querySelector('.google-search-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') block.querySelector('.google-search-btn').click();
  });

  document.getElementById('list-' + section).appendChild(block);
  if (name) { showMethodHint(block, name); showLastHint(block, name, weight); }
  if (sets) updatePerSetWeights(block);
}

function addMediaThumb(block, src, type) {
  const grid = block.querySelector('.media-preview-grid');
  const thumb = document.createElement('div');
  thumb.className = 'media-thumb';
  if (type === 'video') {
    thumb.innerHTML = '<video src="' + src + '" muted playsinline></video><button class="media-thumb-del">✕</button>';
  } else {
    thumb.innerHTML = '<img src="' + src + '" onerror="this.parentElement.remove()" /><button class="media-thumb-del">✕</button>';
  }
  thumb.querySelector('.media-thumb-del').addEventListener('click', function () { thumb.remove(); });
  grid.appendChild(thumb);
}

function onNameInput(input) {
  showAC(input, input.value);
  const block = input.closest('.exercise-block');
  showMethodHint(block, input.value.trim());
  if (input.value.trim())
    showLastHint(block, input.value.trim(), block.querySelector('input[data-role="weight-main"]')?.value || '');
  const googleInput = block.querySelector('.google-search-input');
  if (googleInput && input.value.trim()) googleInput.value = input.value.trim() + ' 운동 방법';
}

function onNameKey(e, input) {
  const list = input.closest('.name-wrap').querySelector('.autocomplete-list');
  const items = list.querySelectorAll('.ac-item');
  const active = list.querySelector('.ac-item.active');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!active) items[0]?.classList.add('active');
    else { active.classList.remove('active'); (active.nextElementSibling || items[0])?.classList.add('active'); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!active) items[items.length - 1]?.classList.add('active');
    else { active.classList.remove('active'); (active.previousElementSibling || items[items.length - 1])?.classList.add('active'); }
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    if (active) { e.preventDefault(); active.click(); }
  } else if (e.key === 'Escape') list.classList.remove('show');
}

function onWeightInput(input) {
  const block = input.closest('.exercise-block');
  const name = block.querySelector('.name-wrap input')?.value.trim();
  if (name) showLastHint(block, name, input.value);
  block.querySelectorAll('input[data-role="set-weight"]').forEach((sw) => {
    if (!sw.value) sw.value = input.value;
  });
}

function toggleUnit(btn) {
  btn.textContent = btn.textContent === '회' ? '초' : '회';
}

// ══════════════════════════════════════════════
// 음성 인식
// ══════════════════════════════════════════════
function toggleMemoVoice(btn) {
  if (isMemoListening) stopMemoVoice();
  else { if (activeMemoBtn && activeMemoBtn !== btn) stopMemoVoice(); startMemoVoice(btn); }
}
function startMemoVoice(btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Chrome을 사용해 주세요!'); return; }
  const ta = btn.parentElement.querySelector('.exercise-memo');
  memoRec = new SR();
  memoRec.lang = 'ko-KR';
  memoRec.continuous = true;
  memoRec.interimResults = true;
  let ft = ta.value;
  activeMemoBtn = btn;
  memoRec.onstart = () => { isMemoListening = true; btn.textContent = '⏹'; btn.classList.add('listening'); };
  memoRec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) ft += e.results[i][0].transcript;
      else interim = e.results[i][0].transcript;
    }
    ta.value = ft + interim;
  };
  memoRec.onerror = () => stopMemoVoice();
  memoRec.onend = () => { if (isMemoListening) memoRec.start(); };
  memoRec.start();
}
function stopMemoVoice() {
  isMemoListening = false;
  if (memoRec) memoRec.stop();
  if (activeMemoBtn) { activeMemoBtn.textContent = '🎤'; activeMemoBtn.classList.remove('listening'); activeMemoBtn = null; }
}

function toggleVoice() { isListening ? stopVoice() : startVoice(); }
function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Chrome 브라우저를 사용해 주세요!'); return; }
  recognition = new SR();
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onstart = () => {
    isListening = true;
    document.getElementById('mic-btn').classList.add('listening');
    document.getElementById('mic-btn').textContent = '⏹';
    document.getElementById('voice-status').textContent = '🔴 듣고 있어요!';
    document.getElementById('voice-status').classList.add('active');
  };
  recognition.onresult = (e) => {
    const t = e.results[0][0].transcript;
    document.getElementById('voice-status').textContent = '인식됨: "' + t + '"';
    parseVoice(t);
  };
  recognition.onerror = () => {
    stopVoice();
    document.getElementById('voice-status').textContent = '❌ 인식 실패. 다시 눌러보세요!';
  };
  recognition.onend = () => stopVoice();
  recognition.start();
}
function stopVoice() {
  isListening = false;
  if (recognition) recognition.stop();
  document.getElementById('mic-btn').classList.remove('listening');
  document.getElementById('mic-btn').textContent = '🎤';
  document.getElementById('voice-status').classList.remove('active');
}

function toggleFeedbackVoice() { isFeedbackListening ? stopFeedbackVoice() : startFeedbackVoice(); }
function startFeedbackVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert('Chrome 브라우저를 사용해 주세요!'); return; }
  feedbackRec = new SR();
  feedbackRec.lang = 'ko-KR';
  feedbackRec.continuous = true;
  feedbackRec.interimResults = true;
  let ft = document.getElementById('feedback-msg').value;
  feedbackRec.onstart = () => {
    isFeedbackListening = true;
    const btn = document.getElementById('feedback-mic-btn');
    btn.textContent = '⏹ 중지';
    btn.classList.add('listening');
  };
  feedbackRec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) ft += e.results[i][0].transcript;
      else interim = e.results[i][0].transcript;
    }
    document.getElementById('feedback-msg').value = ft + interim;
  };
  feedbackRec.onerror = () => stopFeedbackVoice();
  feedbackRec.onend = () => { if (isFeedbackListening) feedbackRec.start(); };
  feedbackRec.start();
}
function stopFeedbackVoice() {
  isFeedbackListening = false;
  if (feedbackRec) feedbackRec.stop();
  const btn = document.getElementById('feedback-mic-btn');
  btn.textContent = '🎤 음성 입력';
  btn.classList.remove('listening');
}

function parseVoice(text) {
  const isSec = /초/.test(text);
  const sorted = [...exerciseDB].sort((a, b) => b.name.length - a.name.length);
  let exName = '', remaining = text;
  for (const ex of sorted) {
    if (text.startsWith(ex.name)) { exName = ex.name; remaining = text.slice(ex.name.length).trim(); break; }
  }
  if (!exName) {
    const pat = /\d|킬로그램|킬로그|킬로|키로|세트|회|번씩|초(?!\S)/;
    const idx = text.search(pat);
    if (idx > 0) { exName = text.slice(0, idx).trim(); remaining = text.slice(idx).trim(); }
    else { exName = text.trim(); remaining = ''; }
  }
  const numMap = {
    영:0, 일:1, 이:2, 삼:3, 사:4, 오:5, 육:6, 칠:7, 팔:8, 구:9,
    십:10, 십일:11, 십이:12, 십삼:13, 십사:14, 십오:15, 십육:16, 십칠:17, 십팔:18, 십구:19,
    이십:20, 삼십:30, 사십:40, 오십:50, 육십:60, 칠십:70, 팔십:80, 구십:90,
    백:100, 백오십:150, 이백:200, 삼백:300,
  };
  let cvt = remaining;
  Object.keys(numMap).sort((a, b) => b.length - a.length).forEach((k) => {
    cvt = cvt.replace(new RegExp(k, 'g'), numMap[k]);
  });
  cvt = cvt.replace(/킬로그램|킬로그|킬로|키로그램|키로그|키로/g, '');
  const nums = cvt.match(/\d+/g) || [];
  const weight = nums[0] || '', sets = nums[1] || '', reps = nums[2] || '', unit = isSec ? '초' : '회';
  if (exName || weight) {
    const blocks = document.querySelectorAll('#list-' + currentTab + ' .exercise-block');
    const last = blocks[blocks.length - 1];
    const lastNameInput = last?.querySelector('.name-wrap input');
    if (lastNameInput && !lastNameInput.value.trim()) {
      lastNameInput.value = exName;
      last.querySelector('input[data-role="weight-main"]').value = weight;
      last.querySelector('input[data-role="sets"]').value = sets;
      last.querySelector('input[data-role="reps"]').value = reps;
      const ub = last.querySelector('.unit-toggle');
      if (ub) ub.textContent = unit;
      showMethodHint(last, exName);
      if (exName) showLastHint(last, exName, weight);
      if (sets) updatePerSetWeights(last);
    } else {
      addRow(currentTab, exName, weight, sets, reps, unit);
    }
    document.getElementById('voice-status').textContent = '✅ 입력 완료!';
  }
}

// ══════════════════════════════════════════════
// 운동 데이터 수집 & 저장
// ══════════════════════════════════════════════
function getExercises(section) {
  const blocks = document.querySelectorAll('#list-' + section + ' .exercise-block');
  const list = [];
  blocks.forEach((block) => {
    const name = block.querySelector('.name-wrap input')?.value.trim() || '';
    const weight = block.querySelector('input[data-role="weight-main"]')?.value.trim() || '';
    const sets = block.querySelector('input[data-role="sets"]')?.value.trim() || '';
    const reps = block.querySelector('input[data-role="reps"]')?.value.trim() || '';
    const unit = block.querySelector('.unit-toggle')?.textContent.trim() || '회';
    const memo = block.querySelector('.exercise-memo')?.value.trim() || '';
    const setWeights = [];
    const setReps = [];
    block.querySelectorAll('input[data-role="set-weight"]').forEach((sw) => { setWeights.push(Number(sw.value) || 0); });
    block.querySelectorAll('input[data-role="set-reps"]').forEach((sr) => { setReps.push(Number(sr.value) || 0); });
    if (name) list.push({ name, weight, sets, reps, unit, memo, setWeights, setReps });
  });
  return list;
}

function fmtExercises(list) {
  return list.map((ex, i) => {
    let line = i + 1 + '. ' + ex.name;
    const hasSetWeights = ex.setWeights && ex.setWeights.length > 0 && ex.setWeights.some((w) => w > 0);
    const hasSetReps = ex.setReps && ex.setReps.length > 0 && ex.setReps.some((r) => r > 0);
    if (hasSetWeights || hasSetReps) {
      const count = Math.max((ex.setWeights || []).length, (ex.setReps || []).length);
      const parts = [];
      for (let j = 0; j < count; j++) {
        const w = ex.setWeights && ex.setWeights[j] ? ex.setWeights[j] + 'kg' : '';
        const r = ex.setReps && ex.setReps[j] ? ex.setReps[j] + ex.unit : '';
        parts.push((j + 1) + '세트: ' + [w, r].filter(Boolean).join(' '));
      }
      line += '\n   ' + parts.join(' / ');
    } else {
      if (ex.weight && Number(ex.weight) !== 0) line += '  ' + ex.weight + 'kg';
      if (ex.sets && Number(ex.sets) !== 0) line += ' / ' + ex.sets + '세트';
      if (ex.reps && Number(ex.reps) !== 0) line += ' / ' + ex.reps + ex.unit;
    }
    if (ex.memo) line += '\n   💬 ' + ex.memo;
    return line;
  }).join('\n');
}

async function saveRecord() {
  const warmup = getExercises('warmup'), main = getExercises('main'), cooldown = getExercises('cooldown');
  if (warmup.length === 0 && main.length === 0) { alert('운동을 최소 1개 이상 입력해주세요!'); return; }
  stopFeedbackVoice();
  stopMemoVoice();
  const now = new Date();
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const fb = document.getElementById('feedback-msg').value.trim();
  const jid = loggedInTutor + '_' + currentMember + '_' + selDate.toISOString().slice(0, 10);
  try {
    await setDoc(doc(db, 'journals', jid), {
      tutor: loggedInTutor, member: currentMember, date: currentDateStr,
      dateObj: selDate.toISOString(), yearMonth: ym, year: String(now.getFullYear()),
      warmup, main, cooldown, feedback: fb, createdAt: new Date().toISOString(),
    });
    for (const ex of [...warmup, ...main, ...cooldown]) {
      await addDoc(collection(db, 'workout_records'), {
        member: currentMember, tutor: loggedInTutor, date: currentDateStr,
        dateObj: selDate.toISOString(), exerciseName: ex.name,
        weight: Number(ex.weight) || 0, sets: Number(ex.sets) || 0,
        reps: Number(ex.reps) || 0, unit: ex.unit, memo: ex.memo || '', setWeights: ex.setWeights || [], setReps: ex.setReps || [], createdAt: new Date(),
      });
    }
    await setDoc(doc(db, 'lesson_records', jid), {
      tutor: loggedInTutor, member: currentMember, date: currentDateStr,
      dateObj: selDate.toISOString(), yearMonth: ym, year: String(now.getFullYear()),
      createdAt: new Date().toISOString(),
    });
    await autoAddToExerciseDB([...warmup, ...main, ...cooldown].map((e) => e.name).filter((n) => n));
  } catch (e) { console.error(e); }
  let result = '';
  result += '📋 ' + currentMember + ' 회원님 운동 일지\n';
  result += '📅 ' + currentDateStr + '\n';
  result += '👤 담당 튜터: ' + loggedInTutor + '\n';
  if (warmup.length > 0) result += '\n🔥 Warm up\n─────────────────\n' + fmtExercises(warmup) + '\n';
  if (main.length > 0) result += '\n💪 Main workout\n─────────────────\n' + fmtExercises(main) + '\n';
  if (cooldown.length > 0) result += '\n❄️ Cool down\n─────────────────\n' + fmtExercises(cooldown) + '\n';
  result += '─────────────────\n';
  result += fb ? fb : '✅ 오늘도 수고하셨습니다! 💪';
  lastResult = result;
  document.getElementById('result-text').textContent = result;
  document.getElementById('copy-btn').textContent = '📋 복사하기';
  document.getElementById('copy-btn').classList.remove('copied');
  showScreen('result');
}

function copyResult() {
  navigator.clipboard.writeText(lastResult).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅ 복사 완료!';
    btn.classList.add('copied');
  }).catch(() => {
    const el = document.createElement('textarea');
    el.value = lastResult;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✅ 복사 완료!';
    btn.classList.add('copied');
  });
}

function openBand() {
  navigator.clipboard.writeText(lastResult).then(() => {
    window.location.href = 'bandapp://write';
    setTimeout(() => { window.open('https://band.us/home', '_blank'); }, 1000);
  }).catch(() => {
    const el = document.createElement('textarea');
    el.value = lastResult;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    window.location.href = 'bandapp://write';
    setTimeout(() => { window.open('https://band.us/home', '_blank'); }, 1000);
  });
}

// ══════════════════════════════════════════════
// 운동 DB 화면
// ══════════════════════════════════════════════
function renderDB() {
  const sv = (document.getElementById('db-search')?.value || '').trim().toLowerCase();
  const list = document.getElementById('db-list');
  const badge = document.getElementById('db-count-badge');
  const filtered = sv ? exerciseDB.filter((e) => e.name.toLowerCase().includes(sv)) : exerciseDB;
  const wm = exerciseDB.filter((e) => e.hasMethod).length;
  if (badge) badge.textContent = '총 ' + exerciseDB.length + '개 · 방법 등록됨 ' + wm + '개 · 미등록 ' + (exerciseDB.length - wm) + '개';
  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = '<p style="color:#aaa;font-size:14px;text-align:center;padding:20px 0">' + (sv ? '검색 결과 없음' : '아직 등록된 운동이 없어요') + '</p>';
    return;
  }
  filtered.forEach((ex) => {
    const item = document.createElement('div');
    item.className = 'db-item';
    const imgHtml = (ex.images && ex.images.length > 0)
      ? '<div class="db-item-image"><img src="' + ex.images[0] + '" alt="참고 이미지" /><div class="db-item-image-hint">총 ' + ex.images.length + '개 이미지</div></div>'
      : '';
    item.innerHTML =
      '<div class="db-item-header">' +
      '<span class="db-item-name">' + ex.name + (!ex.hasMethod ? '<span class="db-new-badge">방법 미등록</span>' : '') + '</span>' +
      '<div class="db-item-btns">' +
      '<button class="db-edit-btn">✏️ ' + (ex.hasMethod ? '수정' : '등록') + '</button>' +
      '<button class="db-google-btn">🔍 구글</button>' +
      '<button class="db-del-btn">삭제</button>' +
      '</div></div>' +
      (ex.method ? '<div class="db-item-method">' + ex.method + '</div>' : '<div class="db-item-no-method">운동 방법이 아직 등록되지 않았어요</div>') +
      imgHtml;
    item.querySelector('.db-edit-btn').addEventListener('click', () => openDbModal(ex.name));
    item.querySelector('.db-google-btn').addEventListener('click', () => {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(ex.name + ' 운동 방법') + '&tbm=isch', '_blank');
    });
    item.querySelector('.db-del-btn').addEventListener('click', () => deleteFromDB(ex.name));
    list.appendChild(item);
  });
}

function openDbModal(name = null) {
  dbEditName = name;
  dbModalMediaList = [];
  const titleEl = document.getElementById('db-modal-title');
  const nameWrap = document.getElementById('db-modal-name-wrap');
  const methodEl = document.getElementById('db-modal-method');
  if (name) {
    const found = exerciseDB.find((e) => e.name === name);
    titleEl.textContent = '운동 방법 ' + (found?.hasMethod ? '수정' : '등록');
    nameWrap.innerHTML = '<div class="modal-name-readonly">🏋️ ' + name + '</div>';
    methodEl.value = found?.method || '';
    if (found?.images?.length) {
      found.images.forEach((src) => { dbModalMediaList.push({ type: 'url', src }); });
    }
  } else {
    titleEl.textContent = '운동 직접 추가';
    nameWrap.innerHTML = '<input type="text" id="db-modal-new-name" placeholder="운동 이름 입력 (예: 바벨 백 스쿼트)" />';
    methodEl.value = '';
  }
  renderDbModalMedia();
  document.getElementById('db-modal-overlay').classList.add('open');
  setTimeout(() => { if (!name) document.getElementById('db-modal-new-name')?.focus(); else methodEl.focus(); }, 100);
}

function closeDbModal() {
  document.getElementById('db-modal-overlay').classList.remove('open');
  dbModalMediaList = [];
  renderDbModalMedia();
}

async function saveDbModal() {
  const method = document.getElementById('db-modal-method').value.trim();
  const imageUrls = dbModalMediaList.map((m) => m.src).filter(Boolean);
  if (dbEditName) {
    try {
      await setDoc(doc(db, 'exercise_db', dbEditName), { name: dbEditName, method, hasMethod: method.length > 0, images: imageUrls, updatedAt: new Date().toISOString() });
      const i = exerciseDB.findIndex((e) => e.name === dbEditName);
      if (i !== -1) { exerciseDB[i].method = method; exerciseDB[i].hasMethod = method.length > 0; exerciseDB[i].images = imageUrls; }
      closeDbModal();
      renderDB();
    } catch (e) { alert('저장 중 오류가 발생했어요.'); }
  } else {
    const nameEl = document.getElementById('db-modal-new-name');
    const name = nameEl?.value.trim();
    if (!name) { alert('운동 이름을 입력해주세요!'); return; }
    if (exerciseDB.find((e) => e.name.toLowerCase() === name.toLowerCase())) { alert('이미 등록된 운동 이름이에요!'); return; }
    try {
      await setDoc(doc(db, 'exercise_db', name), { name, method, hasMethod: method.length > 0, images: imageUrls, createdAt: new Date().toISOString() });
      exerciseDB.push({ name, method, hasMethod: method.length > 0, images: imageUrls });
      exerciseDB.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      closeDbModal();
      renderDB();
    } catch (e) { alert('저장 중 오류가 발생했어요.'); }
  }
}

async function deleteFromDB(name) {
  if (!confirm(name + ' 운동을 DB에서 삭제할까요?')) return;
  try {
    await deleteDoc(doc(db, 'exercise_db', name));
    exerciseDB = exerciseDB.filter((e) => e.name !== name);
    renderDB();
  } catch (e) {}
}

// ══════════════════════════════════════════════
// 일지 조회
// ══════════════════════════════════════════════
function loadHistoryMemberOpts() {
  const sel = document.getElementById('history-member');
  const cur = sel.value;
  sel.innerHTML = '<option value="">회원 선택</option>';
  myMemberNames().forEach((n) => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

async function loadHistory() {
  const member = document.getElementById('history-member').value;
  const period = document.getElementById('history-period').value;
  const content = document.getElementById('history-content');
  if (!member) { content.innerHTML = '<p class="empty-msg">회원을 선택해주세요</p>'; return; }
  content.innerHTML = '<p class="loading-msg">불러오는 중...</p>';
  try {
    const q = query(collection(db, 'journals'), where('tutor', '==', loggedInTutor), where('member', '==', member));
    const snap = await getDocs(q);
    let journals = snap.docs.map((d) => d.data());
    const now = new Date();
    if (period === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      journals = journals.filter((j) => new Date(j.dateObj) >= s);
    } else if (period === '3month') {
      const s = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      journals = journals.filter((j) => new Date(j.dateObj) >= s);
    }
    journals.sort((a, b) => new Date(b.dateObj) - new Date(a.dateObj));
    if (!journals.length) { content.innerHTML = '<p class="empty-msg">해당 기간에 일지가 없어요</p>'; return; }
    let html = '<p style="font-size:13px;color:#888;margin-bottom:12px;">총 ' + journals.length + '개의 일지</p>';
    journals.forEach((j) => {
      const wl = j.warmup || [], ml = j.main || [], cl = j.cooldown || [];
      html += "<div class=\"history-item\"><div class=\"history-item-header\" onclick=\"this.nextElementSibling.classList.toggle('open');this.querySelector('span:last-child').textContent=this.nextElementSibling.classList.contains('open')?'▲':'▼';\"><div><div class=\"history-item-date\">📅 " +
        j.date + '</div><div class="history-item-meta">운동 ' + (wl.length + ml.length + cl.length) + '개</div></div><span style="color:#aaa;font-size:16px">▼</span></div><div class="history-item-body">';
      const rs = (label, list) => {
        if (!list.length) return '';
        let s = '<div class="history-section-label">' + label + '</div>';
        list.forEach((ex) => {
          s += '<div class="history-exercise">' + ex.name;
          if (ex.weight && Number(ex.weight) !== 0) s += ' · ' + ex.weight + 'kg';
          if (ex.sets && Number(ex.sets) !== 0) s += ' / ' + ex.sets + '세트';
          if (ex.reps && Number(ex.reps) !== 0) s += ' / ' + ex.reps + ex.unit;
          if (ex.memo) s += '<br><span style="color:#888;font-size:12px">💬 ' + ex.memo + '</span>';
          s += '</div>';
        });
        return s;
      };
      html += rs('🔥 Warm up', wl) + rs('💪 Main workout', ml) + rs('❄️ Cool down', cl);
      if (j.feedback) html += '<div class="history-feedback">✏️ ' + j.feedback + '</div>';
      html += '</div></div>';
    });
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = '<p class="empty-msg">데이터를 불러오는 중 오류가 발생했어요</p>';
    console.error(e);
  }
}

// ══════════════════════════════════════════════
// 성장 기록
// ══════════════════════════════════════════════
function loadGrowthMemberOpts() {
  const sel = document.getElementById('growth-member');
  const cur = sel.value;
  sel.innerHTML = '<option value="">회원 선택</option>';
  myMemberNames().forEach((n) => {
    const o = document.createElement('option');
    o.value = n;
    o.textContent = n;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

async function onGrowthMemberChange() {
  const member = document.getElementById('growth-member').value;
  const exSel = document.getElementById('growth-exercise');
  exSel.innerHTML = '<option value="">운동 선택</option>';
  document.getElementById('growth-content').innerHTML = '<p class="empty-msg">운동을 선택해주세요</p>';
  if (!member) return;
  try {
    const q = query(collection(db, 'workout_records'), where('member', '==', member), where('tutor', '==', loggedInTutor));
    const snap = await getDocs(q);
    const exNames = [...new Set(snap.docs.map((d) => d.data().exerciseName))];
    exNames.forEach((n) => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      exSel.appendChild(o);
    });
  } catch (e) { console.error(e); }
}

async function loadGrowthData() {
  const member = document.getElementById('growth-member').value;
  const exercise = document.getElementById('growth-exercise').value;
  const period = document.getElementById('growth-period').value;
  const content = document.getElementById('growth-content');
  if (!member || !exercise) { content.innerHTML = '<p class="empty-msg">회원과 운동을 선택해주세요</p>'; return; }
  content.innerHTML = '<p class="loading-msg">불러오는 중...</p>';
  try {
    const q = query(collection(db, 'workout_records'), where('member', '==', member), where('tutor', '==', loggedInTutor));
    const snap = await getDocs(q);
    let records = snap.docs.map((d) => d.data()).filter((r) => r.exerciseName === exercise);
    records.sort((a, b) => new Date(a.dateObj) - new Date(b.dateObj));
    const now = new Date();
    if (period === 'week') { const c = new Date(now); c.setDate(now.getDate() - 7); records = records.filter((r) => new Date(r.dateObj) >= c); }
    if (period === 'month') { const c = new Date(now); c.setMonth(now.getMonth() - 1); records = records.filter((r) => new Date(r.dateObj) >= c); }
    if (period === 'year') { const c = new Date(now); c.setFullYear(now.getFullYear() - 1); records = records.filter((r) => new Date(r.dateObj) >= c); }
    if (!records.length) { content.innerHTML = '<p class="empty-msg">해당 기간에 기록이 없어요</p>'; return; }
    content.innerHTML =
      '<p style="font-size:13px;font-weight:bold;color:#2d6a4f;margin-bottom:6px;">📦 중량 변화</p><div class="chart-wrap"><canvas id="chartWeight"></canvas></div>' +
      '<p style="font-size:13px;font-weight:bold;color:#2d6a4f;margin-bottom:6px;margin-top:8px;">🔄 횟수/초 변화</p><div class="chart-wrap"><canvas id="chartReps"></canvas></div>' +
      '<p style="font-size:13px;font-weight:bold;color:#333;margin-bottom:8px;margin-top:16px;">📋 상세 기록</p>' +
      '<table class="growth-table"><thead><tr><th>날짜</th><th>중량</th><th>세트</th><th>횟수/초</th><th>메모</th></tr></thead><tbody>' +
      records.map((r) =>
        '<tr><td>' + r.date + '</td><td>' + (r.weight ? r.weight + 'kg' : '-') + '</td><td>' +
        (r.sets ? r.sets + '세트' : '-') + '</td><td>' + (r.reps ? r.reps + r.unit : '-') +
        '</td><td style="font-size:12px;color:#666;text-align:left">' + (r.memo || '-') + '</td></tr>'
      ).join('') + '</tbody></table>';
    if (gwChart) gwChart.destroy();
    if (grChart) grChart.destroy();
    const opts = (label, data, color) => ({
      type: 'line',
      data: { labels: records.map((r) => r.date), datasets: [{ label, data, borderColor: color, backgroundColor: color + '22', tension: 0.3, fill: true, pointRadius: 4, pointHoverRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: '#f0f4f8' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 11 } } } } },
    });
    gwChart = new Chart(document.getElementById('chartWeight'), opts('중량(kg)', records.map((r) => r.weight || 0), '#2d6a4f'));
    grChart = new Chart(document.getElementById('chartReps'), opts('횟수/초', records.map((r) => r.reps || 0), '#4a90d9'));
  } catch (e) {
    content.innerHTML = '<p class="empty-msg">데이터를 불러오는 중 오류가 발생했어요</p>';
    console.error(e);
  }
}

// ══════════════════════════════════════════════
// 리포트 & 대시보드
// ══════════════════════════════════════════════
function setPeriod(period, btn) {
  reportPeriod = period;
  document.querySelectorAll('.period-tab').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  loadReport();
}

async function loadReport() {
  const content = document.getElementById('report-content');
  content.innerHTML = '<p class="loading-msg">불러오는 중...</p>';
  const now = new Date();
  let s1, e1, s2, e2, pl, ll;
  if (reportPeriod === 'month') {
    s1 = new Date(now.getFullYear(), now.getMonth(), 1);
    e1 = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    s2 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    e2 = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    pl = now.getFullYear() + '년 ' + (now.getMonth() + 1) + '월';
    ll = (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) + '년 ' + (now.getMonth() === 0 ? 12 : now.getMonth()) + '월';
  } else if (reportPeriod === 'lastmonth') {
    s1 = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    e1 = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    s2 = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    e2 = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
    pl = (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) + '년 ' + (now.getMonth() === 0 ? 12 : now.getMonth()) + '월';
    ll = '그 전달';
  } else {
    s1 = new Date(now.getFullYear(), 0, 1);
    e1 = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    s2 = new Date(now.getFullYear() - 1, 0, 1);
    e2 = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    pl = now.getFullYear() + '년';
    ll = now.getFullYear() - 1 + '년';
  }
  try {
    const snap1 = await getDocs(query(collection(db, 'lesson_records'), where('dateObj', '>=', s1.toISOString()), where('dateObj', '<=', e1.toISOString())));
    const l1 = snap1.docs.map((d) => d.data());
    const t1 = l1.length;
    const t2 = (await getDocs(query(collection(db, 'lesson_records'), where('dateObj', '>=', s2.toISOString()), where('dateObj', '<=', e2.toISOString())))).docs.length;
    const diff = t1 - t2;
    const dc = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    const pct = t2 > 0 ? Math.round((Math.abs(diff) / t2) * 100) : 0;
    const tc = {};
    TUTORS.forEach((t) => { tc[t] = 0; });
    l1.forEach((l) => { if (tc[l.tutor] !== undefined) tc[l.tutor]++; });
    const mc = {};
    l1.forEach((l) => { mc[l.member] = (mc[l.member] || 0) + 1; });
    const top = Object.entries(mc).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const md = Array(12).fill(0);
    if (reportPeriod === 'year') l1.forEach((l) => { md[new Date(l.dateObj).getMonth()]++; });
    let html =
      '<div class="report-summary-grid">' +
      '<div class="report-summary-item"><div class="report-summary-num">' + t1 + '</div><div class="report-summary-label">' + pl + ' 수업</div></div>' +
      '<div class="report-summary-item"><div class="report-summary-num">' + t2 + '</div><div class="report-summary-label">' + ll + ' 수업</div></div>' +
      '<div class="report-summary-item"><div class="report-summary-num report-change-badge ' + dc + '">' + (diff > 0 ? '+' + diff : diff === 0 ? '±0' : diff) + '</div><div class="report-summary-label">전기간 대비</div>' +
      (t2 > 0 ? '<div class="report-change-badge ' + dc + '">' + pct + '%</div>' : '') + '</div></div>';
    if (reportPeriod === 'year') html += '<p class="report-section-title">📅 월별 수업 수</p><div class="lesson-chart-wrap"><canvas id="lessonChart"></canvas></div>';
    html += '<p class="report-section-title">👨‍🏫 튜터별 수업 수</p><table class="growth-table" style="margin-bottom:16px"><thead><tr><th>튜터</th><th>수업 수</th><th>비율</th></tr></thead><tbody>';
    TUTORS.forEach((t) => {
      const c = tc[t] || 0;
      const p = t1 > 0 ? Math.round((c / t1) * 100) : 0;
      html += '<tr><td>' + t + '</td><td style="font-weight:bold;color:#2d6a4f">' + c + '회</td><td>' + p + '%</td></tr>';
    });
    html += '</tbody></table>';
    if (top.length > 0) {
      html += '<p class="report-section-title">🏆 수업 수 Top 5 회원</p><table class="growth-table"><thead><tr><th>순위</th><th>회원</th><th>수업 수</th></tr></thead><tbody>';
      top.forEach(([n, c], i) => {
        html += '<tr><td>' + (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 + '위') + '</td><td>' + n + '</td><td style="font-weight:bold;color:#2d6a4f">' + c + '회</td></tr>';
      });
      html += '</tbody></table>';
    }
    content.innerHTML = html;
    if (reportPeriod === 'year') {
      if (lessonChart) lessonChart.destroy();
      lessonChart = new Chart(document.getElementById('lessonChart'), {
        type: 'bar',
        data: {
          labels: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
          datasets: [{ label: '수업 수', data: md, backgroundColor: '#2d6a4f88', borderColor: '#2d6a4f', borderWidth: 1, borderRadius: 6 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f4f8' } }, x: { grid: { display: false } } } },
      });
    }
  } catch (e) {
    content.innerHTML = '<p class="empty-msg">데이터를 불러오는 중 오류가 발생했어요</p>';
    console.error(e);
  }
}

async function loadDashboard() {
  const content = document.getElementById('dashboard-content');
  content.innerHTML = '<p class="loading-msg">불러오는 중...</p>';
  const now = new Date();
  const ld = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lym = ld.getFullYear() + '-' + String(ld.getMonth() + 1).padStart(2, '0');
  let html = '';
  for (const tutor of TUTORS) {
    let tc = 0;
    try { const q = query(collection(db, 'members'), where('tutor', '==', tutor)); tc = (await getDocs(q)).size; } catch (e) {}
    let lc = null;
    try { const s = await getDoc(doc(db, 'member_snapshots', tutor + '_' + lym)); if (s.exists()) lc = s.data().count; } catch (e) {}
    const diff = lc !== null ? tc - lc : null;
    const dn = diff !== null ? (diff > 0 ? '+' + diff : diff === 0 ? '±0' : String(diff)) : '-';
    const dc = diff === null ? 'same' : diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    const ct = diff === null ? '정보 없음' : diff > 0 ? '▲ ' + diff + '명 증가' : diff < 0 ? '▼ ' + Math.abs(diff) + '명 감소' : '→ 전달과 동일';
    html +=
      '<div class="dash-tutor-card"><div class="dash-tutor-header"><span class="dash-tutor-name">' + tutor + ' 튜터</span><span class="dash-change ' + dc + '">' + ct + '</span></div>' +
      '<div class="dash-count-wrap">' +
      '<div class="dash-count-item"><div class="dash-count-num">' + tc + '</div><div class="dash-count-label">이번달 회원 수</div></div>' +
      '<div class="dash-count-item"><div class="dash-count-num">' + (lc !== null ? lc : '-') + '</div><div class="dash-count-label">지난달 회원 수</div></div>' +
      '<div class="dash-count-item"><div class="dash-diff-num ' + dc + '">' + dn + '</div><div class="dash-count-label">전달 대비</div></div>' +
      '</div></div>';
  }
  content.innerHTML = html;
}
