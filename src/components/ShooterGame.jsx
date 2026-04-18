import { useCallback, useEffect, useRef } from "react";
import { PHASES, useGame } from "../context/GameContext.jsx";

// --- Constants ---
const CANVAS_W = 800;
const CANVAS_H = 600;
const TITLE_BAR_H = 28;

// Speeds in pixels per second
const PLAYER_SPEED = 360;
const ENEMY_SPEED_BASE = 120;
const BULLET_SPEED = 480;
const SHOOT_COOLDOWN = 0.2; // seconds
const ENEMY_SPAWN_INTERVAL = 1.5; // seconds
const MAX_DELTA = 0.1; // clamp deltaTime

// Sizes
const PLAYER_W = 30;
const PLAYER_H = 30;
const ENEMY_SIZE = 20;
const BULLET_W = 4;
const BULLET_H = 12;
const PARTICLE_SIZE = 2;
const PARTICLE_COUNT = 8;
const PARTICLE_LIFE = 0.4; // seconds
const PARTICLE_SPEED = 150; // px/s

// Anomaly
const ANOMALY_6_DURATION = 0.1;
const ANOMALY_7_DURATION = 0.5;
const ANOMALY_7_JITTER = 2;
const ANOMALY_9_DURATION = 0.5;
const ANOMALY_9_JITTER = 2;

export default function ShooterGame() {
  const { dispatch } = useGame();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gameStateRef = useRef(null);
  const keysRef = useRef({});
  const animFrameRef = useRef(null);
  const awakeningRef = useRef(false);

  // Initialize game state (mutable ref, not React state)
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

      // Anomaly state
      anomaly6Timer: -1, // remaining seconds to show red text, -1 = inactive
      anomaly7Active: false,
      anomaly7Timer: -1,
      anomaly8NextExplosionRed: false,
      anomaly9Enemies: [], // enemies in delayed death state: { x, y, timer, visible }

      // Awakening state
      awakeningTriggered: false,
    };
  }, []);

  // ---------- Awakening Sequence ----------
  const triggerAwakening = useCallback(
    (gs, ctx, canvas) => {
      if (awakeningRef.current) return;
      awakeningRef.current = true;
      gs.awakeningTriggered = true;

      // T+0.0s — stop game loop (handled by flag)
      // We run the awakening in its own timeline using setTimeout

      const container = containerRef.current;
      if (!container) return;

      // T+0.1s — freeze everything, enemies jitter (drawn in a separate loop)
      const jitterFrameId = { current: null };
      const drawJitter = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw score
        ctx.fillStyle = "#888";
        ctx.font = "14px monospace";
        ctx.fillText(`SCORE: ${gs.score}`, 12, 22);

        // Draw player frozen
        drawPlayer(ctx, gs.player.x, gs.player.y);

        // Draw bullets frozen
        for (const b of gs.bullets) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
        }

        // Draw enemies with jitter
        for (const e of gs.enemies) {
          const jx = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          const jy = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(
            e.x - ENEMY_SIZE / 2 + jx,
            e.y - ENEMY_SIZE / 2 + jy,
            ENEMY_SIZE,
            ENEMY_SIZE
          );
        }

        // Draw anomaly9 enemies with jitter
        for (const e of gs.anomaly9Enemies) {
          const jx = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          const jy = (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(
            e.x - ENEMY_SIZE / 2 + jx,
            e.y - ENEMY_SIZE / 2 + jy,
            ENEMY_SIZE,
            ENEMY_SIZE
          );
        }

        jitterFrameId.current = requestAnimationFrame(drawJitter);
      };

      setTimeout(() => {
        drawJitter();
      }, 100);

      // T+0.3s — red flash overlay 3 times over container (including title bar)
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 0, 0, 0.3); pointer-events: none; opacity: 0; z-index: 10;
      `;
      container.style.position = "relative";
      container.appendChild(overlay);

      const flashSequence = [300, 500, 700]; // start times of each flash-on
      for (const t of flashSequence) {
        setTimeout(() => {
          overlay.style.opacity = "1";
        }, t);
        setTimeout(() => {
          overlay.style.opacity = "0";
        }, t + 100);
      }

      // T+0.9s — generate snapshot, hide original, show snapshot canvas
      setTimeout(() => {
        // Stop jitter drawing
        if (jitterFrameId.current) {
          cancelAnimationFrame(jitterFrameId.current);
        }
        overlay.remove();

        // Create snapshot canvas covering entire container (title bar + game canvas)
        const snapshotCanvas = document.createElement("canvas");
        const totalW = CANVAS_W;
        const totalH = TITLE_BAR_H + CANVAS_H;
        snapshotCanvas.width = totalW;
        snapshotCanvas.height = totalH;
        const sCtx = snapshotCanvas.getContext("2d");

        // Draw title bar area
        sCtx.fillStyle = "#444";
        sCtx.fillRect(0, 0, totalW, TITLE_BAR_H);
        sCtx.fillStyle = "#999";
        sCtx.font = "12px monospace";
        sCtx.fillText("H.O.R.S.E._v0.1.exe", 10, 18);
        sCtx.fillStyle = "#777";
        sCtx.textAlign = "right";
        sCtx.fillText("\u2500 \u25a1 \u00d7", totalW - 10, 18);
        sCtx.textAlign = "left";

        // Draw game canvas content
        sCtx.drawImage(canvas, 0, TITLE_BAR_H);

        // Save snapshot as image
        const snapshotImage = new Image();
        snapshotImage.src = snapshotCanvas.toDataURL();

        snapshotImage.onload = () => {
          // Hide original container children
          const titleBar = container.querySelector("[data-titlebar]");
          if (titleBar) titleBar.style.display = "none";
          canvas.style.display = "none";

          // Position snapshot canvas
          snapshotCanvas.style.display = "block";
          container.appendChild(snapshotCanvas);

          // T+1.0s — start concentric scaling animation
          setTimeout(() => {
            let currentScale = 1.0;
            const centerX = totalW / 2;
            const centerY = totalH / 2;

            const shrink = () => {
              sCtx.fillStyle = "#000";
              sCtx.fillRect(0, 0, totalW, totalH);

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
                // T+~2.0s — pure black, wait then transition
                sCtx.fillStyle = "#000";
                sCtx.fillRect(0, 0, totalW, totalH);

                // T+2.5s — switch to Phase 2
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
  function drawPlayer(ctx, x, y) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(x, y - PLAYER_H / 2);
    ctx.lineTo(x - PLAYER_W / 2, y + PLAYER_H / 2);
    ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H / 2);
    ctx.closePath();
    ctx.fill();
  }

  // ---------- Main effect ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const gs = initGameState();
    gameStateRef.current = gs;

    // --- Keyboard handling ---
    const handleKeyDown = (e) => {
      keysRef.current[e.key] = true;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // --- Collision detection ---
    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
      return (
        ax - aw / 2 < bx + bw / 2 &&
        ax + aw / 2 > bx - bw / 2 &&
        ay - ah / 2 < by + bh / 2 &&
        ay + ah / 2 > by - bh / 2
      );
    }

    // --- On kill callback (handles anomalies) ---
    function onKill(killScore, enemy) {
      dispatch({ type: "INCREMENT_SCORE" });

      if (killScore === 6) {
        gs.anomaly6Timer = ANOMALY_6_DURATION;
      }
      if (killScore === 7) {
        gs.anomaly7Active = true;
        gs.anomaly7Timer = ANOMALY_7_DURATION;
      }
      if (killScore === 8) {
        gs.anomaly8NextExplosionRed = true;
      }
      if (killScore === 9) {
        // Delayed death: add to anomaly9 list instead of removing immediately
        gs.anomaly9Enemies.push({
          x: enemy.x,
          y: enemy.y,
          timer: ANOMALY_9_DURATION,
          frameCount: 0,
        });
        return "delay"; // signal to not create normal explosion
      }
      if (killScore === 10) {
        triggerAwakening(gs, ctx, canvas);
        return "awakening";
      }
      return "normal";
    }

    // --- Spawn explosion particles ---
    function spawnParticles(x, y, useRed) {
      const color = useRed ? "#f00" : "#fff";
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
        gs.particles.push({
          x,
          y,
          vx: Math.cos(angle) * PARTICLE_SPEED,
          vy: Math.sin(angle) * PARTICLE_SPEED,
          life: PARTICLE_LIFE,
          color,
        });
      }
    }

    // --- Game loop ---
    function gameLoop(now) {
      if (gs.awakeningTriggered) return; // stop loop during awakening

      const dt = Math.min((now - gs.lastTime) / 1000, MAX_DELTA);
      gs.lastTime = now;

      const keys = keysRef.current;

      // --- Update ---

      // Player movement (always active, even during anomaly7)
      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        gs.player.x -= PLAYER_SPEED * dt;
      }
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        gs.player.x += PLAYER_SPEED * dt;
      }
      gs.player.x = Math.max(PLAYER_W / 2, Math.min(CANVAS_W - PLAYER_W / 2, gs.player.x));

      // Shooting
      gs.shootCooldown -= dt;
      if (keys[" "] && gs.shootCooldown <= 0) {
        gs.bullets.push({
          x: gs.player.x,
          y: gs.player.y - PLAYER_H / 2,
        });
        gs.shootCooldown = SHOOT_COOLDOWN;
      }

      // Move bullets
      for (let i = gs.bullets.length - 1; i >= 0; i--) {
        gs.bullets[i].y -= BULLET_SPEED * dt;
        if (gs.bullets[i].y < -BULLET_H) {
          gs.bullets.splice(i, 1);
        }
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

      // Move enemies (freeze during anomaly7)
      if (!gs.anomaly7Active) {
        for (let i = gs.enemies.length - 1; i >= 0; i--) {
          gs.enemies[i].y += gs.enemies[i].speed * dt;
          if (gs.enemies[i].y > CANVAS_H + ENEMY_SIZE) {
            gs.enemies.splice(i, 1);
          }
        }
      }

      // Anomaly 7 timer
      if (gs.anomaly7Active) {
        gs.anomaly7Timer -= dt;
        if (gs.anomaly7Timer <= 0) {
          gs.anomaly7Active = false;
        }
      }

      // Anomaly 6 timer
      if (gs.anomaly6Timer > 0) {
        gs.anomaly6Timer -= dt;
      }

      // Anomaly 9 — update delayed death enemies
      for (let i = gs.anomaly9Enemies.length - 1; i >= 0; i--) {
        const a9 = gs.anomaly9Enemies[i];
        a9.timer -= dt;
        a9.frameCount++;
        if (a9.timer <= 0) {
          // Finally explode
          spawnParticles(a9.x, a9.y, false);
          gs.anomaly9Enemies.splice(i, 1);
        }
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
              // Kill 9: don't remove enemy yet, it goes to anomaly9 list
              gs.enemies.splice(ei, 1);
              gs.bullets.splice(bi, 1);
            } else if (result === "awakening") {
              gs.enemies.splice(ei, 1);
              gs.bullets.splice(bi, 1);
              spawnParticles(e.x, e.y, false);
              return; // stop game loop
            } else {
              // Normal kill
              const useRed = gs.anomaly8NextExplosionRed;
              if (useRed) gs.anomaly8NextExplosionRed = false;
              spawnParticles(e.x, e.y, useRed);
              gs.enemies.splice(ei, 1);
              gs.bullets.splice(bi, 1);
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
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          gs.particles.splice(i, 1);
        }
      }

      // --- Draw ---
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Score
      ctx.fillStyle = "#888";
      ctx.font = "14px monospace";
      ctx.fillText(`SCORE: ${gs.score}`, 12, 22);

      // Player
      drawPlayer(ctx, gs.player.x, gs.player.y);

      // Bullets
      ctx.fillStyle = "#fff";
      for (const b of gs.bullets) {
        ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
      }

      // Enemies
      for (const e of gs.enemies) {
        let drawX = e.x;
        let drawY = e.y;
        if (gs.anomaly7Active) {
          drawX += (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
          drawY += (Math.random() - 0.5) * ANOMALY_7_JITTER * 2;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(
          drawX - ENEMY_SIZE / 2,
          drawY - ENEMY_SIZE / 2,
          ENEMY_SIZE,
          ENEMY_SIZE
        );
      }

      // Anomaly 9 enemies (jitter + blink)
      for (const a9 of gs.anomaly9Enemies) {
        const visible = a9.frameCount % 6 < 3; // blink every 3 frames
        if (visible) {
          const jx = (Math.random() - 0.5) * ANOMALY_9_JITTER * 2;
          const jy = (Math.random() - 0.5) * ANOMALY_9_JITTER * 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(
            a9.x - ENEMY_SIZE / 2 + jx,
            a9.y - ENEMY_SIZE / 2 + jy,
            ENEMY_SIZE,
            ENEMY_SIZE
          );
        }
      }

      // Particles
      for (const p of gs.particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - PARTICLE_SIZE / 2, p.y - PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
      }

      // Anomaly 6 — red text flash
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
  }, [initGameState, dispatch, triggerAwakening]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-black">
      <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
        {/* Fake window title bar */}
        <div
          data-titlebar
          className="flex items-center justify-between font-mono text-xs"
          style={{
            width: CANVAS_W,
            height: TITLE_BAR_H,
            background: "#444",
            color: "#999",
            padding: "0 10px",
            userSelect: "none",
          }}
        >
          <span>H.O.R.S.E._v0.1.exe</span>
          <span style={{ color: "#777" }}>{"\u2500 \u25a1 \u00d7"}</span>
        </div>
        {/* Game canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", background: "#000" }}
        />
      </div>
    </section>
  );
}
