import { page } from '../html.js';

// Client script: plain string, no backticks / template placeholders / backslashes inside.
// The token stays in memory and goes only in JSON bodies (R14). AI text is inserted with textContent.
const CLIENT = `
(function () {
  var token = (location.hash.match(/^#t=([A-Za-z0-9_-]+)$/) || [])[1] || '';
  var $ = function (id) { return document.getElementById(id); };
  var turns = [];
  var slug = '';
  function showLink() {
    var url = location.origin + '/p/' + slug;
    $('pubOpen').href = '/p/' + slug; $('pubUrl').textContent = url; $('pubLink').hidden = false;
  }
  function say(who, text) {
    var d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text;
    $('log').appendChild(d); d.scrollIntoView({ block: 'nearest' });
  }
  function post(path, data) {
    return fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
  }
  function show(j) {
    if (j.preview !== undefined) $('preview').innerHTML = j.preview; // server-escaped HTML
    if (j.status === 'held') { $('publishBox').hidden = true; $('heldBox').hidden = false; $('chatForm').hidden = true; }
    else { $('publishBox').hidden = false; $('heldBox').hidden = true; }
    if (j.slug) slug = j.slug;
    if (j.status === 'published') { $('pubBtn').textContent = '확인했어요'; showLink(); }
    if (j.gameConsent) $('consent').checked = true;
  }
  function noToken() { $('app').hidden = true; $('relink').hidden = false; }
  if (!token) { noToken(); } else {
    post('/api/landing/state', { token: token }).then(function (r) {
      if (!r.ok) { noToken(); return; }
      show(r.j);
      say('bot', r.j.next || '필요한 내용이 다 모였어요. 아래에서 미리보기를 확인하고 공개해 주세요.');
    });
  }
  $('chatForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = $('msg').value.trim(); if (!msg) return;
    $('msg').value = ''; say('me', msg); $('send').disabled = true;
    post('/api/landing/chat', { token: token, message: msg, history: turns.slice(-24) }).then(function (r) {
      $('send').disabled = false;
      var reply = r.j.reply || r.j.error || '잠깐 문제가 생겼어요. 다시 말씀해 주세요';
      say('bot', reply);
      if (r.ok && !r.j.failed) { turns.push({ role: 'user', content: msg }, { role: 'assistant', content: reply }); show(r.j); }
    }, function () { $('send').disabled = false; say('bot', '잠깐 문제가 생겼어요. 다시 말씀해 주세요'); });
  });
  $('photo').addEventListener('change', function () {
    var f = $('photo').files[0]; if (!f) return;
    var fd = new FormData(); fd.append('token', token); fd.append('file', f);
    say('me', '사진을 올리는 중이에요');
    fetch('/api/landing/photo', { method: 'POST', body: fd }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) { say('bot', r.ok ? '사진을 올렸어요.' : r.j.error); if (r.ok) show(r.j); $('photo').value = ''; });
  });
  $('pubBtn').addEventListener('click', function () {
    var live = $('pubBtn').textContent === '확인했어요';
    $('pubBtn').disabled = true;
    post('/api/landing/publish', { token: token, gameConsent: $('consent').checked }).then(function (r) {
      $('pubBtn').disabled = false;
      $('pubMsg').textContent = r.ok ? (live ? '확인했어요.' : '공개했어요.') : r.j.error;
      if (r.ok) { $('pubBtn').textContent = '확인했어요'; showLink(); }
    });
  });
  $('copyBtn').addEventListener('click', function () {
    var url = $('pubUrl').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { $('copyBtn').textContent = '복사했어요'; });
  });
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    var mic = $('mic'); mic.hidden = false;
    mic.addEventListener('click', function () {
      var rec = new SR(); rec.lang = 'ko-KR'; rec.interimResults = false;
      rec.onresult = function (ev) { $('msg').value = ($('msg').value + ' ' + ev.results[0][0].transcript).trim(); };
      mic.textContent = '듣는 중...'; rec.onend = function () { mic.textContent = '말로 입력'; };
      rec.start();
    });
  }
  var handle = '';
  $('rlSend').addEventListener('click', function () {
    post('/api/edit-link', { phone: $('rlPhone').value }).then(function (r) {
      $('rlMsg').textContent = r.j.message || r.j.error;
      if (r.ok) { handle = r.j.handle; $('rlCodeBox').hidden = false; }
    });
  });
  $('rlConfirm').addEventListener('click', function () {
    post('/api/edit-link', { handle: handle, code: $('rlCode').value }).then(function (r) {
      if (r.ok) { location.href = r.j.editUrl; location.reload(); } else { $('rlMsg').textContent = r.j.error; }
    });
  });
})();`;

const CSS = `<style>
.msg{padding:10px 14px;border-radius:var(--r);margin:0 0 8px;white-space:pre-wrap;max-width:90%}
.msg.bot{background:var(--bg)}.msg.me{background:var(--accent-tint);margin-left:auto}
#log{max-height:320px;overflow:auto;margin:0 0 12px}
input[type=text],input[type=tel]{width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:var(--r);font:inherit}
button.btn{border:0;cursor:pointer;font:inherit;font-weight:600}button.btn:disabled{opacity:.5}
.row{display:flex;gap:8px;margin:0 0 8px}.row input{flex:1}
.filebtn{display:inline-block;margin:0 0 12px;cursor:pointer}.filebtn input{display:none}
#preview{background:var(--bg);border:1px solid var(--surface)}
[hidden]{display:none!important}
</style>`;

export function editPage() {
  const body = `${CSS}<h1>우리 가게 페이지 만들기</h1>
<p class="lead" id="keep">이 주소를 즐겨찾기에 저장해 두면 언제든 다시 고칠 수 있어요. 잃어버리면 휴대폰 인증으로 새 주소를 받을 수 있어요.</p>
<div id="app">
<section class="panel"><div id="log" aria-live="polite"></div>
<form id="chatForm"><div class="row"><input type="text" id="msg" placeholder="여기에 말씀해 주세요" maxlength="1000" autocomplete="off"><button class="btn" id="send">보내기</button></div>
<button type="button" class="btn ghost" id="mic" hidden>말로 입력</button>
<label class="btn ghost filebtn">사진 올리기<input type="file" id="photo" accept="image/jpeg,image/png,image/webp"></label></form></section>
<h2>미리보기</h2><section id="preview" class="panel"></section>
<section class="panel" id="publishBox"><label><input type="checkbox" id="consent"> 게임·홍보에 가게 이름이 나와도 괜찮아요</label>
<p><button class="btn" id="pubBtn">공개하기</button> <span id="pubMsg"></span></p>
<div id="pubLink" hidden><p>내 가게 페이지 주소: <span id="pubUrl"></span></p>
<p><a class="btn" id="pubOpen" target="_blank" rel="noopener">내 가게 페이지 열기</a> <button type="button" class="btn ghost" id="copyBtn">주소 복사</button></p></div></section>
<section class="panel" id="heldBox" hidden><b>확인 중이에요</b><p class="lead">확인이 끝나면 안내해 드릴게요.</p></section>
</div>
<section class="panel" id="relink" hidden><h2>수정 주소를 다시 받을게요</h2>
<p class="lead">등록할 때 쓴 휴대폰 번호로 인증해 주세요. 이전 주소는 더 이상 쓸 수 없어요.</p>
<div class="row"><input type="tel" id="rlPhone" placeholder="휴대폰 번호"><button class="btn" id="rlSend">문자 받기</button></div>
<div id="rlCodeBox" hidden class="row"><input type="text" id="rlCode" inputmode="numeric" maxlength="6" placeholder="인증번호 6자리"><button class="btn" id="rlConfirm">확인</button></div>
<p id="rlMsg"></p></section>
<script>${CLIENT}</script>`;
  const res = page({ title: '우리 가게 페이지 만들기', desc: '', body, noindex: true });
  res.headers.set('cache-control', 'no-store');
  return res;
}
