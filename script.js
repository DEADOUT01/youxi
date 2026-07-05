const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  radius: Math.random() * 1.6 + 0.4,
  speed: Math.random() * 60 + 40,
}));

const enemyTypes = [
  { kind: "normal", size: 24, speed: 90, hp: 1, color: "#ff5e7a" },
  { kind: "fast", size: 18, speed: 150, hp: 1, color: "#7cf0a4" },
  { kind: "heavy", size: 34, speed: 60, hp: 3, color: "#ffb347" },
];

const state = {
  running: false,
  score: 0,
  lives: 3,
  player: {
    x: canvas.width / 2 - 18,
    y: canvas.height - 90,
    width: 36,
    height: 48,
    speed: 280,
    drift: 0,
  },
  bullets: [],
  enemies: [],
  particles: [],
  shootCooldown: 0,
  spawnTimer: 0,
  lastTime: 0,
};

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.player.x = canvas.width / 2 - 18;
  state.player.y = canvas.height - 90;
  state.bullets = [];
  state.enemies = [];
  state.particles = [];
  state.shootCooldown = 0;
  state.spawnTimer = 0;
  state.lastTime = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
}

function startGame() {
  resetGame();
  state.running = true;
  overlay.classList.add("hidden");
}

function endGame() {
  state.running = false;
  overlay.querySelector("h1").textContent = "游戏结束";
  overlay.querySelector("p").textContent = `本局得分：${state.score}`;
  startBtn.textContent = "再来一局";
  overlay.classList.remove("hidden");
}

function spawnEnemy() {
  const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
  const size = type.size;
  state.enemies.push({
    x: Math.random() * (canvas.width - size * 2) + size,
    y: -size,
    width: size,
    height: size,
    speed: type.speed,
    hp: type.hp,
    maxHp: type.hp,
    color: type.color,
    kind: type.kind,
  });
}

function update(delta) {
  if (!state.running) return;

  state.player.drift += delta * 2.6;
  const autoX = Math.sin(state.player.drift) * 90;
  const autoY = Math.sin(state.player.drift * 1.6) * 24;

  state.player.x = canvas.width / 2 - state.player.width / 2 + autoX;
  state.player.y = canvas.height - 120 + autoY;
  state.player.x = Math.max(0, Math.min(canvas.width - state.player.width, state.player.x));
  state.player.y = Math.max(0, Math.min(canvas.height - state.player.height, state.player.y));

  state.shootCooldown -= delta;
  if (state.shootCooldown <= 0) {
    state.bullets.push({
      x: state.player.x + state.player.width / 2 - 2,
      y: state.player.y - 10,
      width: 4,
      height: 14,
      speed: 420,
    });
    state.shootCooldown = 0.16;
  }

  state.spawnTimer += delta;
  if (state.spawnTimer > 0.7) {
    spawnEnemy();
    state.spawnTimer = 0;
  }

  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.y -= bullet.speed * delta;
    if (bullet.y + bullet.height < 0) {
      state.bullets.splice(i, 1);
    }
  }

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    enemy.y += enemy.speed * delta;

    if (enemy.y - enemy.height > canvas.height) {
      state.enemies.splice(i, 1);
      continue;
    }

    const hitPlayer =
      enemy.x < state.player.x + state.player.width &&
      enemy.x + enemy.width > state.player.x &&
      enemy.y < state.player.y + state.player.height &&
      enemy.y + enemy.height > state.player.y;

    if (hitPlayer) {
      state.enemies.splice(i, 1);
      state.lives -= 1;
      updateHud();
      if (state.lives <= 0) {
        endGame();
      }
      continue;
    }

    for (let j = state.bullets.length - 1; j >= 0; j -= 1) {
      const bullet = state.bullets[j];
      const hitBullet =
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y;

      if (hitBullet) {
        state.bullets.splice(j, 1);
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          state.enemies.splice(i, 1);
          state.score += enemy.maxHp === 1 ? 100 : 180;
          updateHud();
          for (let p = 0; p < 10; p += 1) {
            state.particles.push({
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              vx: (Math.random() - 0.5) * 160,
              vy: (Math.random() - 0.5) * 160,
              life: 0.6,
              radius: Math.random() * 2 + 1,
            });
          }
        }
        break;
      }
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.life -= delta;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#08131f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    star.y += star.speed * 0.016;
    if (star.y > canvas.height) {
      star.y = -2;
      star.x = Math.random() * canvas.width;
    }
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const { x, y, width, height } = state.player;
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.fillStyle = "#5cf3ff";
  ctx.beginPath();
  ctx.moveTo(0, -height / 2);
  ctx.lineTo(width / 2, height / 2);
  ctx.lineTo(0, height / 3);
  ctx.lineTo(-width / 2, height / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ff5e7a";
  ctx.fillRect(-6, -4, 12, 20);
  ctx.restore();
}

function drawBullets() {
  ctx.fillStyle = "#ffdd66";
  for (const bullet of state.bullets) {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    ctx.fillStyle = enemy.color;

    if (enemy.kind === "heavy") {
      ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
      ctx.fillStyle = "#fff0a8";
      ctx.fillRect(-enemy.width / 2 + 6, -enemy.height / 2 + 6, enemy.width - 12, enemy.height - 12);
    } else if (enemy.kind === "fast") {
      ctx.beginPath();
      ctx.moveTo(-enemy.width / 2, enemy.height / 2);
      ctx.lineTo(0, -enemy.height / 2);
      ctx.lineTo(enemy.width / 2, enemy.height / 2);
      ctx.lineTo(enemy.width / 4, enemy.height / 4);
      ctx.lineTo(-enemy.width / 4, enemy.height / 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-enemy.width / 2, enemy.height / 2);
      ctx.lineTo(0, -enemy.height / 2);
      ctx.lineTo(enemy.width / 2, enemy.height / 2);
      ctx.lineTo(enemy.width * 0.3, enemy.height * 0.2);
      ctx.lineTo(-enemy.width * 0.3, enemy.height * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    if (enemy.maxHp > 1) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(-enemy.width / 2, enemy.height / 2 + 6, enemy.width, 4);
      ctx.fillStyle = "#4bff8a";
      ctx.fillRect(-enemy.width / 2, enemy.height / 2 + 6, (enemy.width * enemy.hp) / enemy.maxHp, 4);
    }

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 221, 102, ${Math.max(0, p.life / 0.6)})`;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function render() {
  drawBackground();
  drawParticles();
  drawEnemies();
  drawBullets();
  drawPlayer();
}

function frame(time) {
  if (!state.lastTime) state.lastTime = time;
  const delta = (time - state.lastTime) / 1000;
  state.lastTime = time;

  update(delta);
  render();
  requestAnimationFrame(frame);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

updateHud();
requestAnimationFrame(frame);
