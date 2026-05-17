/* ═══════════════════════════════════════════════
   SCORE STORE
═══════════════════════════════════════════════ */
const store = {
  get(k, def) {
    try { const v = localStorage.getItem('gz_' + k); return v !== null ? JSON.parse(v) : def; } catch { return def; }
  },
  set(k, v) { try { localStorage.setItem('gz_' + k, JSON.stringify(v)); } catch {} },
};

let scores = {
  tttWins: store.get('tttWins', 0),
  tttLosses: store.get('tttLosses', 0),
  tttDraws: store.get('tttDraws', 0),
  memBest4: store.get('memBest4', null),
  memBest6: store.get('memBest6', null),
  snakeBest: store.get('snakeBest', 0),
  achievements: store.get('achievements', []),
};

function saveScores() {
  store.set('tttWins', scores.tttWins);
  store.set('tttLosses', scores.tttLosses);
  store.set('tttDraws', scores.tttDraws);
  store.set('memBest4', scores.memBest4);
  store.set('memBest6', scores.memBest6);
  store.set('snakeBest', scores.snakeBest);
  store.set('achievements', scores.achievements);
}

function updateNavBar() {
  document.getElementById('nav-ttt').textContent = scores.tttWins;
  document.getElementById('nav-mem').textContent = scores.memBest4 !== null ? scores.memBest4 : '—';
  document.getElementById('nav-snake').textContent = scores.snakeBest;
}

function updateHomeScores() {
  document.getElementById('home-ttt-wins').textContent = scores.tttWins;
  document.getElementById('home-mem-best').textContent = scores.memBest4 !== null ? scores.memBest4 + ' moves' : '—';
  document.getElementById('home-snake-best').textContent = scores.snakeBest;
  document.getElementById('sb-ttt-wins').textContent = scores.tttWins;
  document.getElementById('sb-mem-4').textContent = scores.memBest4 !== null ? scores.memBest4 : '—';
  document.getElementById('sb-mem-6').textContent = scores.memBest6 !== null ? scores.memBest6 : '—';
  document.getElementById('sb-snake').textContent = scores.snakeBest;
  renderLeaderboard();
}

function addAchievement(game, title, value) {
  scores.achievements.unshift({ game, title, value, date: new Date().toLocaleDateString() });
  if (scores.achievements.length > 20) scores.achievements.pop();
  saveScores();
}

function renderLeaderboard() {
  const tbody = document.getElementById('lb-body');
  if (!scores.achievements.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted); padding:20px; text-align:center">Play games to unlock achievements</td></tr>';
    return;
  }
  const ranks = ['gold','silver','bronze'];
  tbody.innerHTML = scores.achievements.slice(0, 10).map((a, i) => {
    const rk = i < 3 ? `<span class="rank ${ranks[i]}">#${i+1}</span>` : `<span class="rank">#${i+1}</span>`;
    const badge = `<span class="lb-badge ${a.game}">${a.game === 'ttt' ? 'Tic Tac Toe' : a.game === 'mem' ? 'Memory' : 'Snake'}</span>`;
    return `<tr>${[rk, a.title, badge, `<span class="score-cell">${a.value}</span>`, a.date].map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */
let currentGame = null;

function openGame(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  currentGame = id;
  if (id === 'ttt') initTTT();
  if (id === 'mem') initMemory();
  if (id === 'snake') initSnakePage();
}

function goHome() {
  if (currentGame === 'snake') stopSnake();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-home').classList.add('active');
  currentGame = null;
  updateHomeScores();
  updateNavBar();
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════════════
   TIC TAC TOE
═══════════════════════════════════════════════ */
let tttBoard, tttCurrent, tttGameOver, tttMode, tttDiff;
let tttScoreX = 0, tttScoreO = 0, tttScoreD = 0;
let tttMoves = [];

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function initTTT() {
  tttMode = 'ai'; tttDiff = 'hard';
  tttScoreX = 0; tttScoreO = 0; tttScoreD = 0;
  updateTTTScoreDisplay();
  resetTTT();
}

function resetTTT() {
  tttBoard = Array(9).fill('');
  tttCurrent = 'X';
  tttGameOver = false;
  tttMoves = [];
  renderTTTBoard();
  updateTTTStatus('Your turn (X)');
  document.getElementById('ttt-history').innerHTML = '<h3>Move History</h3>';
}

function renderTTTBoard() {
  const board = document.getElementById('ttt-board');
  board.innerHTML = '';
  tttBoard.forEach((cell, i) => {
    const el = document.createElement('div');
    el.className = 'ttt-cell' + (cell ? ' taken ' + cell.toLowerCase() : '');
    el.textContent = cell;
    if (!cell && !tttGameOver) el.onclick = () => tttMove(i);
    board.appendChild(el);
  });
}

function tttMove(i) {
  if (tttBoard[i] || tttGameOver) return;
  tttBoard[i] = tttCurrent;
  tttMoves.push({ player: tttCurrent, cell: i });
  addMoveToHistory(tttCurrent, i);
  const win = checkTTTWin(tttBoard, tttCurrent);
  if (win) return finishTTT(tttCurrent, win);
  if (tttBoard.every(Boolean)) return finishTTT('draw', null);
  tttCurrent = tttCurrent === 'X' ? 'O' : 'X';
  renderTTTBoard();
  if (tttMode === 'ai' && tttCurrent === 'O') {
    updateTTTStatus('AI is thinking...');
    setTimeout(aiMove, 350);
  } else {
    updateTTTStatus(`${tttMode === 'p2' ? 'Player ' + tttCurrent + "'s" : 'Your'} turn (${tttCurrent})`);
  }
}

function aiMove() {
  const idx = tttDiff === 'hard' ? minimax(tttBoard, 'O', true).idx : randomAIMove();
  tttMove(idx);
}

function randomAIMove() {
  const empty = tttBoard.map((v,i) => v === '' ? i : -1).filter(i => i >= 0);
  // 30% chance play winning/blocking move, rest random
  for (const i of empty) {
    const t = [...tttBoard]; t[i] = 'O';
    if (checkTTTWin(t,'O')) return i;
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

function minimax(board, player, isMax, depth = 0) {
  const win = checkTTTWin(board, 'O');
  const lose = checkTTTWin(board, 'X');
  if (win) return { score: 10 - depth };
  if (lose) return { score: depth - 10 };
  if (board.every(Boolean)) return { score: 0 };
  const empty = board.map((v,i) => v===''?i:-1).filter(i=>i>=0);
  let best = isMax ? { score: -Infinity } : { score: Infinity };
  for (const i of empty) {
    const nb = [...board]; nb[i] = player;
    const res = minimax(nb, player === 'O' ? 'X' : 'O', !isMax, depth + 1);
    res.idx = i;
    if (isMax ? res.score > best.score : res.score < best.score) best = res;
  }
  return best;
}

function checkTTTWin(board, player) {
  return WIN_LINES.find(l => l.every(i => board[i] === player)) || null;
}

function finishTTT(result, winLine) {
  tttGameOver = true;
  if (winLine) {
    const cells = document.querySelectorAll('.ttt-cell');
    winLine.forEach(i => cells[i].classList.add('win'));
  }
  if (result === 'X') {
    tttScoreX++;
    scores.tttWins++;
    saveScores();
    addAchievement('ttt', 'Beat the AI', 'Win #' + scores.tttWins);
    showToast('🎉 You won!');
    updateTTTStatus('🏆 You win!');
  } else if (result === 'O') {
    tttScoreO++;
    scores.tttLosses++;
    saveScores();
    showToast('💀 AI wins this round');
    updateTTTStatus(tttMode === 'p2' ? '🏆 Player O wins!' : '🤖 AI wins!');
  } else {
    tttScoreD++;
    scores.tttDraws++;
    saveScores();
    showToast("🤝 It's a draw!");
    updateTTTStatus("🤝 Draw!");
  }
  updateTTTScoreDisplay();
  updateNavBar();
  renderTTTBoard();
}

function updateTTTStatus(msg) {
  document.getElementById('ttt-status').textContent = msg;
}

function updateTTTScoreDisplay() {
  document.getElementById('ttt-score-x').textContent = tttScoreX;
  document.getElementById('ttt-score-o').textContent = tttScoreO;
  document.getElementById('ttt-score-d').textContent = tttScoreD;
}

function addMoveToHistory(player, cell) {
  const h = document.getElementById('ttt-history');
  const row = h.querySelector('h3') ? document.createElement('div') : document.createElement('div');
  if (!h.querySelector('.move-item')) {} 
  const d = document.createElement('div');
  d.className = 'move-item';
  const col = player === 'X' ? '#7c6ff7' : '#ef4f6b';
  const who = tttMode === 'p2' ? `Player ${player}` : player === 'X' ? 'You (X)' : 'AI (O)';
  d.innerHTML = `<span style="color:${col}">${who}</span> → cell ${cell + 1}`;
  h.appendChild(d);
}

function setMode(m) {
  tttMode = m;
  document.getElementById('mode-ai').classList.toggle('active', m === 'ai');
  document.getElementById('mode-p2').classList.toggle('active', m === 'p2');
  document.getElementById('diff-row').style.display = m === 'ai' ? '' : 'none';
  document.getElementById('ttt-o-label').textContent = m === 'p2' ? 'Player O' : 'AI (O)';
  document.getElementById('ttt-mode-label').textContent = m === 'p2' ? '2 Players' : `vs AI — ${tttDiff === 'hard' ? 'Hard' : 'Easy'}`;
  tttScoreX = 0; tttScoreO = 0; tttScoreD = 0;
  updateTTTScoreDisplay();
  resetTTT();
}

function setDiff(d) {
  tttDiff = d;
  document.getElementById('diff-easy').classList.toggle('active', d === 'easy');
  document.getElementById('diff-hard').classList.toggle('active', d === 'hard');
  document.getElementById('ttt-mode-label').textContent = `vs AI — ${d === 'hard' ? 'Hard' : 'Easy'}`;
  resetTTT();
}

/* ═══════════════════════════════════════════════
   MEMORY GAME
═══════════════════════════════════════════════ */
const EMOJIS = ['🎯','🚀','💎','🎸','🌈','🦋','🏆','🎭','🧩','🎨','🌺','🎪','🦄','🌊','⚡','🎁','🍕','🎃','🌙','🎠','🦊','🐉','🎺','🎯'];
let memGrid, memCards, memFlipped, memMoves, memMatched, memTimer, memTimerVal, memRunning, memGridSize;

function initMemory() {
  memGridSize = memGridSize || 4;
  const pairs = memGridSize === 4 ? 8 : 18;
  const chosen = EMOJIS.slice(0, pairs);
  memCards = shuffle([...chosen, ...chosen]);
  memFlipped = []; memMoves = 0; memMatched = 0; memRunning = false;
  clearInterval(memTimer); memTimerVal = 0;
  document.getElementById('mem-moves').textContent = 0;
  document.getElementById('mem-matched').textContent = 0;
  document.getElementById('mem-timer').textContent = 0;
  document.getElementById('mem-result').classList.remove('show');
  const best = memGridSize === 4 ? scores.memBest4 : scores.memBest6;
  document.getElementById('mem-best-disp').textContent = best !== null ? best : '—';
  resetRing();
  renderMemBoard();
}

function setGrid(n) {
  memGridSize = n;
  document.getElementById('grid-4').classList.toggle('active', n === 4);
  document.getElementById('grid-6').classList.toggle('active', n === 6);
  const board = document.getElementById('mem-board');
  board.className = 'mem-board g' + n;
  initMemory();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderMemBoard() {
  const board = document.getElementById('mem-board');
  board.innerHTML = '';
  memCards.forEach((emoji, i) => {
    const card = document.createElement('div');
    card.className = 'mem-card';
    card.dataset.i = i;
    card.innerHTML = `<div class="mem-back">?</div><div class="mem-face">${emoji}</div>`;
    card.onclick = () => flipCard(i);
    board.appendChild(card);
  });
}

function flipCard(i) {
  if (memFlipped.length === 2) return;
  const cards = document.querySelectorAll('.mem-card');
  const card = cards[i];
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (!memRunning) startMemTimer();
  card.classList.add('flipped');
  memFlipped.push(i);
  if (memFlipped.length === 2) {
    memMoves++;
    document.getElementById('mem-moves').textContent = memMoves;
    setTimeout(checkMemMatch, 650);
  }
}

function checkMemMatch() {
  const [a, b] = memFlipped;
  const cards = document.querySelectorAll('.mem-card');
  if (memCards[a] === memCards[b]) {
    cards[a].classList.add('matched'); cards[a].classList.remove('flipped');
    cards[b].classList.add('matched'); cards[b].classList.remove('flipped');
    memMatched++;
    document.getElementById('mem-matched').textContent = memMatched;
    const total = memGridSize === 4 ? 8 : 18;
    if (memMatched === total) memWin();
  } else {
    cards[a].classList.remove('flipped');
    cards[b].classList.remove('flipped');
  }
  memFlipped = [];
}

function startMemTimer() {
  memRunning = true;
  memTimer = setInterval(() => {
    memTimerVal++;
    document.getElementById('mem-timer').textContent = memTimerVal;
    updateRing(memTimerVal);
  }, 1000);
}

function updateRing(t) {
  const max = memGridSize === 4 ? 60 : 120;
  const ring = document.getElementById('mem-ring');
  const pct = Math.min(t / max, 1);
  ring.style.strokeDashoffset = 138.2 * pct;
  ring.style.stroke = pct < 0.6 ? 'var(--green)' : pct < 0.85 ? 'var(--amber)' : 'var(--red)';
}

function resetRing() {
  const ring = document.getElementById('mem-ring');
  ring.style.strokeDashoffset = 0;
  ring.style.stroke = 'var(--green)';
}

function memWin() {
  clearInterval(memTimer); memRunning = false;
  const key = memGridSize === 4 ? 'memBest4' : 'memBest6';
  const isNew = scores[key] === null || memMoves < scores[key];
  if (isNew) {
    scores[key] = memMoves;
    saveScores();
    addAchievement('mem', `Memory ${memGridSize}×${memGridSize} best`, memMoves + ' moves');
    showToast('🏆 New best score!');
  }
  const stars = memMoves <= (memGridSize === 4 ? 12 : 30) ? '⭐⭐⭐' : memMoves <= (memGridSize === 4 ? 20 : 45) ? '⭐⭐' : '⭐';
  document.getElementById('result-stars').textContent = stars;
  document.getElementById('result-title').textContent = isNew ? '🏆 New Best!' : '🎉 Well done!';
  document.getElementById('result-msg').textContent = `Completed in ${memMoves} moves and ${memTimerVal}s. ${isNew ? 'New personal best!' : `Best is ${scores[key]} moves.`}`;
  document.getElementById('mem-result').classList.add('show');
  updateNavBar();
}

/* ═══════════════════════════════════════════════
   SNAKE GAME
═══════════════════════════════════════════════ */
const CELL = 20;
const COLS = 20, ROWS = 20;
let snake, dir, nextDir, food, snakeScore, snakeRunning, snakeInterval, snakeSpeed;
const SPEEDS = { slow: 200, med: 130, fast: 75 };

function initSnakePage() {
  snakeSpeed = 'med';
  document.getElementById('sp-med').classList.add('active');
  document.getElementById('snake-best-disp').textContent = scores.snakeBest;
  drawSnakeIdle();
  showSnakeOverlay('Snake', 'Use arrow keys or WASD to move', 'Start Game');
}

function drawSnakeIdle() {
  const canvas = document.getElementById('snakeCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1e28';
  ctx.fillRect(0, 0, 400, 400);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x <= 400; x += CELL) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,400); ctx.stroke(); }
  for (let y = 0; y <= 400; y += CELL) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(400,y); ctx.stroke(); }
}

function startSnake() {
  snake = [{x:10, y:10},{x:9,y:10},{x:8,y:10}];
  dir = {x:1, y:0}; nextDir = {x:1, y:0};
  food = randomFood();
  snakeScore = 0; snakeRunning = true;
  document.getElementById('snake-score-disp').textContent = 0;
  document.getElementById('snake-overlay').style.display = 'none';
  clearInterval(snakeInterval);
  snakeInterval = setInterval(snakeStep, SPEEDS[snakeSpeed]);
}

function stopSnake() {
  clearInterval(snakeInterval);
  snakeRunning = false;
}

function resetSnake() {
  stopSnake();
  drawSnakeIdle();
  showSnakeOverlay('Snake', 'Use arrow keys or WASD to move', 'Start Game');
}

function snakeStep() {
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
      snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOverSnake();
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    snakeScore++;
    document.getElementById('snake-score-disp').textContent = snakeScore;
    food = randomFood();
    if (snakeScore > scores.snakeBest) {
      scores.snakeBest = snakeScore;
      saveScores();
      document.getElementById('snake-best-disp').textContent = snakeScore;
      document.getElementById('nav-snake').textContent = snakeScore;
      addAchievement('snake', 'Snake high score', snakeScore + ' pts');
    }
  } else {
    snake.pop();
  }
  drawSnake();
}

function drawSnake() {
  const canvas = document.getElementById('snakeCanvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1e28';
  ctx.fillRect(0, 0, 400, 400);
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x <= 400; x += CELL) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,400); ctx.stroke(); }
  for (let y = 0; y <= 400; y += CELL) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(400,y); ctx.stroke(); }
  snake.forEach((s, i) => {
    const a = i === 0 ? 1 : Math.max(0.3, 1 - i * 0.05);
    ctx.fillStyle = i === 0 ? '#22c77a' : `rgba(34,199,122,${a})`;
    ctx.beginPath();
    ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
    ctx.fill();
    if (i === 0) {
      ctx.fillStyle = '#0f0f13';
      const ex = dir.x === 1 ? 14 : dir.x === -1 ? 4 : 5;
      const ey = dir.y === 1 ? 14 : dir.y === -1 ? 4 : 5;
      const ex2 = dir.x === 1 ? 14 : dir.x === -1 ? 4 : 13;
      const ey2 = dir.y === 1 ? 14 : dir.y === -1 ? 4 : 5;
      ctx.beginPath(); ctx.arc(s.x * CELL + ex, s.y * CELL + ey, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(s.x * CELL + ex2, s.y * CELL + ey2, 2, 0, Math.PI * 2); ctx.fill();
    }
  });
  ctx.fillStyle = '#ef4f6b';
  ctx.beginPath();
  ctx.roundRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('★', food.x * CELL + CELL/2, food.y * CELL + CELL/2 + 4);
}

function gameOverSnake() {
  stopSnake();
  showSnakeOverlay('Game Over', `Score: ${snakeScore} | Best: ${scores.snakeBest}`, 'Play Again');
  showToast(`💀 Game over! Score: ${snakeScore}`);
  updateNavBar();
}

function showSnakeOverlay(title, msg, btn) {
  const ov = document.getElementById('snake-overlay');
  ov.style.display = '';
  document.getElementById('snake-overlay-title').textContent = title;
  document.getElementById('snake-overlay-msg').textContent = msg;
  ov.querySelector('button').textContent = btn;
}

function randomFood() {
  let f;
  do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
  while (snake && snake.some(s => s.x === f.x && s.y === f.y));
  return f;
}

function setSpeed(s) {
  snakeSpeed = s;
  ['slow','med','fast'].forEach(k => document.getElementById('sp-' + k).classList.toggle('active', k === s));
  if (snakeRunning) { clearInterval(snakeInterval); snakeInterval = setInterval(snakeStep, SPEEDS[s]); }
}

function snakeDpad(d) {
  const map = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const nd = map[d];
  if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd;
}

document.addEventListener('keydown', e => {
  if (currentGame !== 'snake') return;
  const map = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
                w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0},
                W:{x:0,y:-1}, S:{x:0,y:1}, A:{x:-1,y:0}, D:{x:1,y:0} };
  const nd = map[e.key];
  if (nd) { e.preventDefault(); if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd; }
  if ((e.key === ' ' || e.key === 'Enter') && !snakeRunning) startSnake();
});

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
updateNavBar();
updateHomeScores();

