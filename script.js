// SETUP: grab canvas + drawing context:
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const themePalettes = {
  'github-dark': ['#161b22', '#0e4429', '#196c2e', '#2ea043', '#3fb950'],
  'github-light': ['#eaeef2', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  ocean: ['#0d1b2a', '#093a4c', '#0f4c5c', '#2ec4b6', '#7bdff2']
};

let rowColors = [...themePalettes['github-dark']];

const W = canvas.width;
const H = canvas.height;

function applyTheme(themeName) {
  const palette = themePalettes[themeName] || themePalettes['github-dark'];
  const root = document.documentElement;

  if (themeName === 'github-dark') {
    root.style.setProperty('--bg', '#0d1117');
    root.style.setProperty('--bg-alt', '#161b22');
    root.style.setProperty('--bg-deep', '#010409');
    root.style.setProperty('--panel', '#0d1117');
    root.style.setProperty('--panel-soft', '#161b22');
    root.style.setProperty('--text', '#c9d1d9');
    root.style.setProperty('--muted', '#8b949e');
    root.style.setProperty('--border', '#30363d');
    root.style.setProperty('--accent', '#238636');
    root.style.setProperty('--accent-strong', '#2f81f7');
    root.style.setProperty('--shadow', 'rgba(1, 4, 9, 0.7)');
  } else if (themeName === 'github-light') {
    root.style.setProperty('--bg', '#f6f8fa');
    root.style.setProperty('--bg-alt', '#eef3f8');
    root.style.setProperty('--bg-deep', '#dfe8f3');
    root.style.setProperty('--panel', '#ffffff');
    root.style.setProperty('--panel-soft', '#eef3f8');
    root.style.setProperty('--text', '#24292f');
    root.style.setProperty('--muted', '#57606a');
    root.style.setProperty('--border', '#d0d7de');
    root.style.setProperty('--accent', '#1f883d');
    root.style.setProperty('--accent-strong', '#0969da');
    root.style.setProperty('--shadow', 'rgba(27, 31, 35, 0.12)');
  } else {
    root.style.setProperty('--bg', '#08131d');
    root.style.setProperty('--bg-alt', '#112535');
    root.style.setProperty('--bg-deep', '#020b12');
    root.style.setProperty('--panel', '#0b1824');
    root.style.setProperty('--panel-soft', '#112535');
    root.style.setProperty('--text', '#dff5ff');
    root.style.setProperty('--muted', '#9bb8c9');
    root.style.setProperty('--border', '#233c4d');
    root.style.setProperty('--accent', '#16a085');
    root.style.setProperty('--accent-strong', '#2ec4b6');
    root.style.setProperty('--shadow', 'rgba(2, 11, 18, 0.72)');
  }

  rowColors = [...palette];
  document.querySelectorAll('.theme-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === themeName);
  });
}

const themeButtons = document.querySelectorAll('.theme-btn');
themeButtons.forEach((button) => {
  button.addEventListener('click', () => applyTheme(button.dataset.theme));
});

// GAME STATE:
let score = 0;
let lives = 3;
let level = 1;
let gameRunning = false;   // true once ball is launched
let gameOver = false;

// Paddle: a rectangle the player moves horizontally
const paddle = {
  baseWidth: 90,
  width: 90,
  height: 12,
  x: W / 2 - 45,
  y: H - 30,
  speed: 7,
  dx: 0      // current horizontal velocity (set by key state)
};

// Ball: position, velocity, radius
const ball = {
  x: W / 2,
  y: paddle.y - 10,
  radius: 7,
  speed: 4.5,
  speedModifier: 1,
  dx: 0,
  dy: 0
};

function resetBallOnPaddle() {
  ball.x = W / 2;
  ball.y = paddle.y - ball.radius - 1;
  ball.dx = 0;
  ball.dy = 0;
}

// Power-ups: falling squares that give temporary effects when collected
const powerUps = [];
const powerUpChance = 0.18;
const powerUpFallSpeed = 2.2;
const powerUpTypes = [
  { type: 'expand', label: 'EXPAND', color: '#3fb950', duration: 10000 },
  { type: 'slow', label: 'SLOW', color: '#d29922', duration: 10000 },
  { type: 'life', label: '1-UP', color: '#58a6ff', duration: 0 }
];
const activePowerUps = {
  list: [],
  expand: false,
  slow: false
};

function getPowerUpInfo(type) {
  return powerUpTypes.find(p => p.type === type) || powerUpTypes[0];
}

function setBallSpeedModifier(multiplier) {
  ball.speedModifier = multiplier;
  const speed = ball.speed * ball.speedModifier;
  const angle = Math.atan2(ball.dy, ball.dx);
  if (ball.dx !== 0 || ball.dy !== 0) {
    ball.dx = Math.cos(angle) * speed;
    ball.dy = Math.sin(angle) * speed;
  }
}

function updateActivePowerUps(now) {
  activePowerUps.list = activePowerUps.list.filter(p => p.duration === 0 || p.expiresAt > now);
  activePowerUps.expand = activePowerUps.list.some(p => p.type === 'expand');
  activePowerUps.slow = activePowerUps.list.some(p => p.type === 'slow');

  paddle.width = activePowerUps.expand ? Math.min(paddle.baseWidth + 42, 180) : paddle.baseWidth;
  paddle.x = Math.max(0, Math.min(W - paddle.width, paddle.x));
  setBallSpeedModifier(activePowerUps.slow ? 0.75 : 1);
}

function formatActivePowerUps() {
  const now = performance.now();
  return activePowerUps.list.map(p => {
    if (p.type === 'life') return getPowerUpInfo(p.type).label;
    const seconds = Math.ceil((p.expiresAt - now) / 1000);
    return `${getPowerUpInfo(p.type).label} ${seconds}s`;
  }).join(', ') || 'NONE';
}


// Bricks: a 2D grid. Each brick has a status (1 = alive, 0 = destroyed)
const brickInfo = {
  rows: 5,
  cols: 8,
  width: 68,
  height: 20,
  padding: 8,
  offsetTop: 50,
  offsetLeft: 20
};

const levelConfigs = [
  { rows: 5, cols: 14, padding: 6, offsetTop: 38, offsetLeft: 18, pattern: 'activity' },
  { rows: 5, cols: 14, padding: 6, offsetTop: 38, offsetLeft: 18, pattern: 'activity' },
  { rows: 5, cols: 14, padding: 6, offsetTop: 38, offsetLeft: 18, pattern: 'activity' },
  { rows: 5, cols: 14, padding: 6, offsetTop: 38, offsetLeft: 18, pattern: 'activity' },
  { rows: 5, cols: 14, padding: 6, offsetTop: 38, offsetLeft: 18, pattern: 'activity' }
];

let currentPattern = 'activity';
let paused = false;

let bricks = [];

function getLevelConfig(levelNumber) {
  return levelConfigs[(levelNumber - 1) % levelConfigs.length];
}

function applyLevelConfig(config) {
  brickInfo.rows = config.rows;
  brickInfo.cols = config.cols;
  brickInfo.padding = config.padding;
  brickInfo.offsetTop = config.offsetTop;
  brickInfo.offsetLeft = config.offsetLeft;
  brickInfo.width = Math.floor((W - config.offsetLeft * 2 - (brickInfo.cols - 1) * brickInfo.padding) / brickInfo.cols);
  currentPattern = config.pattern;
}

function shouldPlaceBrick(r, c) {
  switch (currentPattern) {
    case 'activity': {
      const activityChance = 0.32 + level * 0.08 + ((r + c + level) % 5) * 0.04;
      return Math.random() < Math.min(activityChance, 0.94);
    }
    case 'checkerboard':
      return (r + c) % 2 === 0;
    case 'castle':
      return r < brickInfo.rows - 2 || c === 0 || c === brickInfo.cols - 1 || (r === brickInfo.rows - 2 && c % 2 === 0) || (r === brickInfo.rows - 1 && c % 2 === 1);
    case 'pyramid':
      const center = (brickInfo.cols - 1) / 2;
      return Math.abs(c - center) <= r;
    case 'random':
      return Math.random() > 0.25;
    default:
      return true;
  }
}

function createBricks() {
  const baseConfig = getLevelConfig(level);
  applyLevelConfig(baseConfig);
  currentPattern = 'activity';
  bricks = [];

  for (let r = 0; r < brickInfo.rows; r++) {
    bricks[r] = [];
    for (let c = 0; c < brickInfo.cols; c++) {
      bricks[r][c] = {
        x: 0,
        y: 0,
        status: shouldPlaceBrick(r, c) ? 1 : 0
      };
    }
  }
}
createBricks();

// INPUT HANDLING:
let rightPressed = false;
let leftPressed = false;

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') rightPressed = true;
  if (e.key === 'ArrowLeft') leftPressed = true;
  if (e.key.toLowerCase() === 'p') {
    e.preventDefault();
    if (!gameOver) togglePause();
  }
  if (e.key === ' ') {
    e.preventDefault();
    launchBall();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowRight') rightPressed = false;
  if (e.key === 'ArrowLeft') leftPressed = false;
});

// Mouse control: paddle follows cursor x-position
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scale = W / rect.width; // account for CSS scaling on small screens
  const mouseX = (e.clientX - rect.left) * scale;
  paddle.x = Math.min(Math.max(mouseX - paddle.width / 2, 0), W - paddle.width);
});

document.getElementById('restartBtn').addEventListener('click', resetGame);

// GAME LOGIC:
function launchBall() {
  if (gameRunning || gameOver || paused) return;
  gameRunning = true;
  const angle = (Math.random() * 0.6 - 0.3); // radians, -0.3 to 0.3
  ball.dx = ball.speed * Math.sin(angle);
  ball.dy = -ball.speed * Math.cos(angle);
}

function togglePause() {
  paused = !paused;
}

function movePaddle() {
  if (rightPressed) paddle.x += paddle.speed;
  if (leftPressed) paddle.x -= paddle.speed;
  // Clamp so paddle can't leave the canvas
  paddle.x = Math.max(0, Math.min(W - paddle.width, paddle.x));
}

function moveBall() {
  if (!gameRunning) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 1;
    return;
  }

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - ball.radius < 0 || ball.x + ball.radius > W) {
    ball.dx *= -1;
  }
  if (ball.y - ball.radius < 0) {
    ball.dy *= -1;
  }
  if (ball.y + ball.radius > H) {
    loseLife();
    return;
  }

  if (
    ball.dy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const maxAngle = Math.PI / 3;
    const angle = hitPos * maxAngle;

    ball.dx = ball.speed * ball.speedModifier * Math.sin(angle);
    ball.dy = -ball.speed * ball.speedModifier * Math.cos(angle);
  }

  checkBrickCollisions();
}

// POWER-UP LOGIC:
function spawnPowerUp(x, y) {
  if (Math.random() > powerUpChance) return;
  const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)].type;
  powerUps.push({
    x: x + brickInfo.width / 2,
    y: y + brickInfo.height / 2,
    size: 16,
    type
  });
}

function movePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    powerUp.y += powerUpFallSpeed;
    if (powerUp.y - powerUp.size > H) {
      powerUps.splice(i, 1);
    }
  }
}

function checkPowerUpCollection() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    if (
      powerUp.x >= paddle.x &&
      powerUp.x <= paddle.x + paddle.width &&
      powerUp.y + powerUp.size / 2 >= paddle.y &&
      powerUp.y - powerUp.size / 2 <= paddle.y + paddle.height
    ) {
      applyPowerUp(powerUp);
      powerUps.splice(i, 1);
    }
  }
}

function applyPowerUp(powerUp) {
  const now = performance.now();
  if (powerUp.type === 'life') {
    lives++;
    score += 50;
    updateHUD();
    return;
  }

  const info = getPowerUpInfo(powerUp.type);
  activePowerUps.list.push({
    type: powerUp.type,
    expiresAt: now + info.duration,
    duration: info.duration
  });
  updateActivePowerUps(now);
}

function checkBrickCollisions() {
  for (let r = 0; r < brickInfo.rows; r++) {
    for (let c = 0; c < brickInfo.cols; c++) {
      const brick = bricks[r][c];
      if (brick.status !== 1) continue;

      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brickInfo.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brickInfo.height
      ) {
        ball.dy *= -1;
        brick.status = 0;
        score += (brickInfo.rows - r) * 10; // top rows worth more
        spawnPowerUp(brick.x, brick.y);
        updateHUD();

        if (allBricksCleared()) nextLevel();
        return; // only handle one collision per frame
      }
    }
  }
}

function allBricksCleared() {
  return bricks.every(row => row.every(b => b.status === 0));
}

function nextLevel() {
  level++;
  ball.speed += 0.5;
  gameRunning = false;
  resetBallOnPaddle();
  createBricks();
  updateHUD();
}

function clearActivePowerUps() {
  activePowerUps.list = activePowerUps.list.filter(p => p.type === 'life');
  activePowerUps.expand = activePowerUps.list.some(p => p.type === 'expand');
  activePowerUps.slow = activePowerUps.list.some(p => p.type === 'slow');
  paddle.width = activePowerUps.expand ? Math.min(paddle.baseWidth + 42, 180) : paddle.baseWidth;
  setBallSpeedModifier(activePowerUps.slow ? 0.72 : 1);
}

function loseLife() {
  lives--;
  updateHUD();
  if (lives <= 0) {
    endGame(false);
  } else {
    gameRunning = false;
    clearActivePowerUps();
    resetBallOnPaddle();
  }
}

function resetPowerUps() {
  powerUps.length = 0;
  activePowerUps.list.length = 0;
  activePowerUps.expand = false;
  activePowerUps.slow = false;
  paddle.width = paddle.baseWidth;
  ball.speedModifier = 1;
}

function endGame(won) {
  gameOver = true;
  gameRunning = false;
  const overlay = document.getElementById('overlay');
  document.getElementById('overlayTitle').textContent = won ? 'YOU WIN' : 'GAME OVER';
  document.getElementById('overlayMsg').textContent = `Final score: ${score}`;
  overlay.classList.add('show');
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  ball.speed = 4.5;
  ball.speedModifier = 1;
  paused = false;
  gameOver = false;
  gameRunning = false;
  paddle.width = paddle.baseWidth;
  paddle.x = W / 2 - paddle.width / 2;
  ball.dx = 0;
  ball.dy = 0;
  resetPowerUps();
  resetBallOnPaddle();
  createBricks();
  updateHUD();
  document.getElementById('overlay').classList.remove('show');
}

function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('lives').textContent = lives;
  document.getElementById('level').textContent = level;
  document.getElementById('powerup').textContent = formatActivePowerUps();
}

// DRAWING:
function drawBricks() {
  for (let r = 0; r < brickInfo.rows; r++) {
    for (let c = 0; c < brickInfo.cols; c++) {
      const brick = bricks[r][c];
      if (brick.status !== 1) continue;

      const x = brickInfo.offsetLeft + c * (brickInfo.width + brickInfo.padding);
      const y = brickInfo.offsetTop + r * (brickInfo.height + brickInfo.padding);
      brick.x = x;
      brick.y = y;

      const brickColor = rowColors[Math.min(r, rowColors.length - 1) % rowColors.length];
      ctx.fillStyle = brickColor;
      ctx.shadowColor = brickColor;
      ctx.shadowBlur = 6;
      ctx.fillRect(x, y, brickInfo.width, brickInfo.height);
      ctx.shadowBlur = 0;
    }
  }
}

function drawPaddle() {
  ctx.fillStyle = '#58a6ff';
  ctx.shadowColor = '#58a6ff';
  ctx.shadowBlur = 10;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
}
 
function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#f0f6fc';
  ctx.shadowColor = '#c9d1d9';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.closePath();
  ctx.shadowBlur = 0;
}
 
function drawPrompt() {
  if (gameRunning || gameOver) return;
  ctx.fillStyle = '#3d5f8a';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PRESS SPACE TO LAUNCH', W / 2, H / 2);
}

function drawPauseMessage() {
  if (!paused) return;
  ctx.fillStyle = '#3d5f8a';
  ctx.font = '18px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('PRESS P TO RESUME', W / 2, H / 2 + 16);
}

function drawPowerUps() {
  for (const powerUp of powerUps) {
    const info = getPowerUpInfo(powerUp.type);
    ctx.fillStyle = info.color;
    ctx.shadowColor = info.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(powerUp.x - powerUp.size / 2, powerUp.y - powerUp.size / 2, powerUp.size, powerUp.size);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#05080f';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(info.label[0], powerUp.x, powerUp.y + 3);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBricks();
  drawPaddle();
  drawBall();
  drawPowerUps();
  drawPrompt();
  drawPauseMessage();
}

// GAME LOOP
// requestAnimationFrame calls this function ~60 times per second.
// Each call: update state -> draw -> schedule next frame.
function gameLoop() {
  if (!gameOver && !paused) {
    const now = performance.now();
    movePaddle();
    moveBall();
    movePowerUps();
    checkPowerUpCollection();
    updateActivePowerUps(now);
    updateHUD();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

updateHUD();
gameLoop();