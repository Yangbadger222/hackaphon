import { useCallback, useEffect, useRef } from "react";
import { PHASES, useGame } from "../context/GameContext.jsx";

// Phase 1 BGM — loop, cleaned up on unmount
function useLoopBGM(src, volume = 0.3) {
  const audioRef = useRef(null);
  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.volume = volume;
    audioRef.current = a;
    // Auto-play on first user interaction (browsers block autoplay)
    const tryPlay = () => { a.play().catch(() => {}); };
    window.addEventListener("keydown", tryPlay, { once: true });
    window.addEventListener("click", tryPlay, { once: true });
    return () => {
      a.pause(); a.src = "";
      window.removeEventListener("keydown", tryPlay);
      window.removeEventListener("click", tryPlay);
    };
  }, [src, volume]);
  return audioRef;
}

// --- Constants ---
const CANVAS_W = 800;
const CANVAS_H = 600;
const TITLE_BAR_H = 28;

// Speeds in pixels per second
const PLAYER_SPEED = 360;
const ENEMY_SPEED_BASE = 120;
const BULLET_SPEED = 480;
const SHOOT_COOLDOWN = 0.2;
const ENEMY_SPAWN_INTERVAL = 1.5;
const MAX_DELTA = 0.1;

// Sizes
const PLAYER_W = 30;
const PLAYER_H = 30;
const ENEMY_SIZE = 20;
const BULLET_W = 4;
const BULLET_H = 12;
const PARTICLE_SIZE = 2;
const PARTICLE_COUNT = 8;
const PARTICLE_LIFE = 0.4;
const PARTICLE_SPEED = 150;

// Health
const MAX_HP = 3;
const INVINCIBILITY_DURATION = 1.0; // seconds

// Anomaly
const ANOMALY_6_DURATION = 0.1;
const ANOMALY_7_DURATION = 0.5;
const ANOMALY_7_JITTER = 2;
const ANOMALY_9_DURATION = 0.5;
const ANOMALY_9_JITTER = 2;

export default function ShooterGame() {
  const { dispatch } = useGame();
  useLoopBGM("/phase1.mp3", 0.3);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gameStateRef = useRef(null);
  const keysRef = useRef({});
  const animFrameRef = useRef(null);
  const awakeningRef = useRef(false);

  const initGameState = useCallback(() => {
    return {
      player: { x: CANVAS_W / 2, y: CANVAS_H - 50 },
      enemies: [],
      bullets: [],
      particles: [],
      score: 0,
      spawnTimer: 0,
      shootCooldown: 0,
      lastTime: performance.now(),

      // Health
      playerHealth: MAX_HP,
      invincibilityTimer: 0,
      deathTriggered: false,

      // Anomaly state
      anomaly6Timer: -1,
      anomaly7Active: false,
      anomaly7Timer: -1,
      anomaly8NextExplosionRed: false,
      anomaly9Enemies: [],

      // Awakening state
      awakeningTriggered: false,
    };
  }, []);

  // ---------- Death transition (HP=0, no ceremony) ----------
  const triggerDeath = useCallback(
    (gs, ctx) => {
      if (gs.deathTriggered) return;
      gs.deathTriggered = true;
      gs.awakeningTriggered = true; // stop game loop

      let fadeAlpha = 0;
      const fadeDraw = () => {
        fadeAlpha += 0.04;
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(fadeAlpha, 1)})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        if (fadeAlpha < 1) {
          requestAnimationFrame(fadeDraw);
        } else {
          setTimeout(() => {
            dispatch({ type: "SET_PHASE", payload: PHASES.GLITCH });
          }, 300);
        }
      };
      requestAnimationFrame(fadeDraw);
    },
    [dispatch]
  );

  // ---------- Awakening Sequence ----------
  const triggerAwakening = useCallback(
    (gs, ctx, canvas) => {
      if (awakeningRef.current) return;
      awakeningRef.current = true;
      gs.awakeningTriggered = true;

      const container = containerRef.current;
      if (!container) return;

      const jitterFrameId = { current: null };
      const drawJitter = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#888";
        ctx.font = "14px monospace";
        ctx.fillText(`SCORE: ${gs.score}`, 12, 22);
        drawHearts(ctx, gs.playerHealth);
        drawPlayer(ctx, gs.player.x, gs.player.y, "#fff");
        for (const b of gs.bullets) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
        }
        for (const e of gs.enemies) {
          const jx = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          const jy = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(e.x - ENEMY_SIZE / 2 + jx, e.y - ENEMY_SIZE / 2 + jy, ENEMY_SIZE, ENEMY_SIZE);
        }
        for (const e of gs.anomaly9Enemies) {
          const jx = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          const jy = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(e.x - ENEMY_SIZE / 2 + jx, e.y - ENEMY_SIZE / 2 + jy, ENEMY_SIZE, ENEMY_SIZE);
        }
        jitterFrameId.current = requestAnimationFrame(drawJitter);
      };

      setTimeout(() => drawJitter(), 100);

      // Red flash overlay
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 0, 0, 0.3); pointer-events: none; opacity: 0; z-index: 10;
      `;
      container.style.position = "relative";
      container.appendChild(overlay);

      for (const t of [300, 500, 700]) {
        setTimeout(() => { overlay.style.opacity = "1"; }, t);
        setTimeout(() => { overlay.style.opacity = "0"; }, t + 100);
      }

      // Snapshot
      setTimeout(() => {
        if (jitterFrameId.current) cancelAnimationFrame(jitterFrameId.current);
        overlay.remove();

        const snapshotCanvas = document.createElement("canvas");
        const totalW = CANVAS_W;
        const totalH = TITLE_BAR_H + CANVAS_H;
        snapshotCanvas.width = totalW;
        snapshotCanvas.height = totalH;
        const sCtx = snapshotCanvas.getContext("2d");

        sCtx.fillStyle = "#444";
        sCtx.fillRect(0, 0, totalW, TITLE_BAR_H);
        sCtx.fillStyle = "#999";
        sCtx.font = "12px monospace";
        sCtx.fillText("H.O.R.S.E._v0.1.exe", 10, 18);
        sCtx.fillStyle = "#777";
        sCtx.textAlign = "right";
        sCtx.fillText("\u2500 \u25a1 \u00d7", totalW - 10, 18);
        sCtx.textAlign = "left";
        sCtx.drawImage(canvas, 0, TITLE_BAR_H);

        const snapshotImage = new Image();
        snapshotImage.src = snapshotCanvas.toDataURL();

        snapshotImage.onload = () => {
          const titleBar = container.querySelector("[data-titlebar]");
          if (titleBar) titleBar.style.display = "none";
          canvas.style.display = "none";
          snapshotCanvas.style.display = "block";
          container.appendChild(snapshotCanvas);

          setTimeout(() => {
            let currentScale = 1.0;
            const centerX = totalW / 2;
            const centerY = totalH / 2;

            const shrink = () => {
              sCtx.clearRect(0, 0, totalW, totalH);
              if (currentScale > 0) {
                sCtx.save();
                sCtx.translate(centerX, centerY);
                sCtx.scale(currentScale, currentScale);
                sCtx.translate(-centerX, -centerY);
                sCtx.drawImage(snapshotImage, 0, 0);
                sCtx.restore();
                currentScale -= 0.03;
                requestAnimationFrame(shrink);
              } else {
                setTimeout(() => {
                  dispatch({ type: "SET_PHASE", payload: PHASES.GLITCH });
                }, 500);
              }
            };
            requestAnimationFrame(shrink);
          }, 100);
        };
      }, 900);
    },
    [dispatch]
  );

  // ---------- Drawing helpers ----------
  function drawPlayer(ctx, x, y, color) {
    ctx.fillStyle = color || "#fff";
    ctx.beginPath();
    ctx.moveTo(x, y - PLAYER_H / 2);
    ctx.lineTo(x - PLAYER_W / 2, y + PLAYER_H / 2);
    ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H / 2);
    ctx.closePath();
    ctx.fill();
  }

  function drawHearts(ctx, hp) {
    ctx.font = "14px monospace";
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < hp ? "#f00" : "#444";
      ctx.fillText("\u2665", 100 + i * 16, 22);
    }
  }

  // ---------- Main effect ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const gs = initGameState();
    gameStateRef.current = gs;

    const handleKeyDown = (e) => {
      keysRef.current[e.key] = true;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return ax - aw / 2 < bx + bw / 2 && ax + aw / 2 > bx - bw / 2 &&
        ay - ah / 2 < by + bh / 2 && ay + ah / 2 > by - bh / 2;
    }

    function onKill(killScore, enemy) {
      dispatch({ type: "INCREMENT_SCORE" });
      if (killScore === 6) gs.anomaly6Timer = ANOMALY_6_DURATION;
      if (killScore === 7) { gs.anomaly7Active = true; gs.anomaly7Timer = ANOMALY_7_DURATION; }
      if (killScore === 8) gs.anomaly8NextExplosionRed = true;
      if (killScore === 9) {
        gs.anomaly9Enemies.push({ x: enemy.x, y: enemy.y, timer: ANOMALY_9_DURATION, frameCount: 0 });
        return "delay";
      }
      if (killScore === 10) { triggerAwakening(gs, ctx, canvas); return "awakening"; }
      return "normal";
    }

    function spawnParticles(x, y, useRed) {
      const color = useRed ? "#f00" : "#fff";
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
        gs.particles.push({ x, y, vx: Math.cos(angle) * PARTICLE_SPEED, vy: Math.sin(angle) * PARTICLE_SPEED, life: PARTICLE_LIFE, color });
      }
    }

    function gameLoop(now) {
      if (gs.awakeningTriggered) return;

      const dt = Math.min((now - gs.lastTime) / 1000, MAX_DELTA);
      gs.lastTime = now;
      const keys = keysRef.current;

      // --- Update ---

      // Invincibility timer
      if (gs.invincibilityTimer > 0) gs.invincibilityTimer -= dt;

      // Player movement
      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) gs.player.x -= PLAYER_SPEED * dt;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) gs.player.x += PLAYER_SPEED * dt;
      gs.player.x = Math.max(PLAYER_W / 2, Math.min(CANVAS_W - PLAYER_W / 2, gs.player.x));

      // Shooting
      gs.shootCooldown -= dt;
      if (keys[" "] && gs.shootCooldown <= 0) {
        gs.bullets.push({ x: gs.player.x, y: gs.player.y - PLAYER_H / 2 });
        gs.shootCooldown = SHOOT_COOLDOWN;
      }

      // Move bullets
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        gs.bullets[i].y -= BULLET_SPEED * dt;
        if (gs.bullets[i].y < -BULLET_H) gs.bullets.splice(i, 1);
      }

      // Spawn enemies
      if (!gs.anomaly7Active) {
        gs.spawnTimer += dt;
        if (gs.spawnTimer >= ENEMY_SPAWN_INTERVAL) {
          gs.spawnTimer = 0;
          gs.enemies.push({
            x: ENEMY_SIZE / 2 + Math.random() * (CANVAS_W - ENEMY_SIZE),
            y: -ENEMY_SIZE,
            speed: ENEMY_SPEED_BASE + Math.random() * 60,
          });
        }
      }

      // Move enemies
      if (!gs.anomaly7Active) {
        for (let i = gs.enemies.length - 1; i >= 0; i--) {
          gs.enemies[i].y += gs.enemies[i].speed * dt;
          if (gs.enemies[i].y > CANVAS_H + ENEMY_SIZE) gs.enemies.splice(i, 1);
        }
      }

      // Enemy-player collision (health system)
      if (gs.invincibilityTimer <= 0) {
        for (let i = gs.enemies.length - 1; i >= 0; i--) {
          const e = gs.enemies[i];
          if (rectsOverlap(gs.player.x, gs.player.y, PLAYER_W, PLAYER_H, e.x, e.y, ENEMY_SIZE, ENEMY_SIZE)) {
            gs.playerHealth--;
            gs.invincibilityTimer = INVINCIBILITY_DURATION;
            spawnParticles(e.x, e.y, true); // red explosion on hit
            gs.enemies.splice(i, 1);
            if (gs.playerHealth <= 0) {
              triggerDeath(gs, ctx);
              return;
            }
            break;
          }
        }
      }

      // Anomaly timers
      if (gs.anomaly7Active) { gs.anomaly7Timer -= dt; if (gs.anomaly7Timer <= 0) gs.anomaly7Active = false; }
      if (gs.anomaly6Timer > 0) gs.anomaly6Timer -= dt;

      // Anomaly 9
      for (let i = gs.anomaly9Enemies.length - 1; i >= 0; i--) {
        const a9 = gs.anomaly9Enemies[i];
        a9.timer -= dt;
        a9.frameCount++;
        if (a9.timer <= 0) { spawnParticles(a9.x, a9.y, false); gs.anomaly9Enemies.splice(i, 1); }
      }

      // Bullet-enemy collision
      for (let bi = gs.bullets.length - 1; bi >= 0; bi--) {
        const b = gs.bullets[bi];
        let hit = false;
        for (let ei = gs.enemies.length - 1; ei >= 0; ei--) {
          const e = gs.enemies[ei];
          if (rectsOverlap(b.x, b.y, BULLET_W, BULLET_H, e.x, e.y, ENEMY_SIZE, ENEMY_SIZE)) {
            gs.score++;
            const result = onKill(gs.score, e);
            if (result === "delay") {
              gs.enemies.splice(ei, 1); gs.bullets.splice(bi, 1);
            } else if (result === "awakening") {
              gs.enemies.splice(ei, 1); gs.bullets.splice(bi, 1);
              spawnParticles(e.x, e.y, false);
              return;
            } else {
              const useRed = gs.anomaly8NextExplosionRed;
              if (useRed) gs.anomaly8NextExplosionRed = false;
              spawnParticles(e.x, e.y, useRed);
              gs.enemies.splice(ei, 1); gs.bullets.splice(bi, 1);
            }
            hit = true;
            break;
          }
        }
        if (hit) continue;
      }

      // Update particles
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        const p = gs.particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) gs.particles.splice(i, 1);
      }

      // --- Draw ---
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Score + Hearts
      ctx.fillStyle = "#888";
      ctx.font = "14px monospace";
      ctx.fillText(`SCORE: ${gs.score}`, 12, 22);
      drawHearts(ctx, gs.playerHealth);

      // Player (flash red/white during invincibility)
      if (gs.invincibilityTimer > 0) {
        const flashOn = Math.floor(gs.invincibilityTimer * 10) % 2 === 0;
        drawPlayer(ctx, gs.player.x, gs.player.y, flashOn ? "#f00" : "#fff");
      } else {
        drawPlayer(ctx, gs.player.x, gs.player.y, "#fff");
      }

      // Bullets
      ctx.fillStyle = "#fff";
      for (const b of gs.bullets) {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      }

      // Enemies
      for (const e of gs.enemies) {
        let dx = e.x, dy = e.y;
        if (gs.anomaly7Active) {
          dx += (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          dy += (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(dx - ENEMY_SIZE / 2, dy - ENEMY_SIZE / 2, ENEMY_SIZE, ENEMY_SIZE);
      }

      // Anomaly 9 enemies
      for (const a9 of gs.anomaly9Enemies) {
        if (a9.frameCount % 6 < 3) {
          const jx = (Math.random() - 0.5) * ANOMALY_9_JITTER * 2;
          const jy = (Math.random() - 0.5) * ANOMALY_9_JITTER * 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(a9.x - ENEMY_SIZE / 2 + jx, a9.y - ENEMY_SIZE / 2 + jy, ENEMY_SIZE, ENEMY_SIZE);
        }
      }

      // Particles
      for (const p of gs.particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - PARTICLE_SIZE / 2, p.y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
      }

      // Anomaly 6
      if (gs.anomaly6Timer > 0) {
        ctx.fillStyle = "#f00";
        ctx.font = "14px monospace";
        ctx.textAlign = "right";
        ctx.fillText("...neigh...", CANVAS_W - 12, CANVAS_H - 12);
        ctx.textAlign = "left";
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [initGameState, dispatch, triggerAwakening, triggerDeath]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
        <div
          data-titlebar
          className="flex items-center justify-between font-mono text-xs"
          style={{ width: CANVAS_W, height: TITLE_BAR_H, background: "#444", color: "#999", padding: "0 10px", userSelect: "none" }}
        >
          <span>H.O.R.S.E._v0.1.exe</span>
          <span style={{ color: "#777" }}>{"\u2500 \u25a1 \u00d7"}</span>
        </div>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: "block", background: "#000" }} />
      </div>
    </div>
  );
}
