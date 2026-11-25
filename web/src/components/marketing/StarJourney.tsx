"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { getHomepageContent } from "@/data/homepage";
import styles from "./landing.module.css";

/**
 * Die Scrollreise im Kopfbereich der Startseite (Entwurf vom 24.11.2026).
 *
 * Ein Sternenhimmel (Canvas, scharf, ohne Video) verwandelt sich beim Scrollen: Find (Sterne leuchten
 * auf), Align (Bahnen), Founder Setup (ein Sternbild zeichnet sich), Connect (Kamera zieht zurueck,
 * Signale), Advisor (ein Leitstern). Der Text fliegt mit und wechselt die Seite.
 *
 * - Alles, was gelesen werden soll, steht im HTML (Server). Der Canvas ist reine Dekoration.
 * - Bei "weniger Bewegung" gibt es keine Zeitanimation, kein Funkeln und kein Mitfliegen; der Text
 *   blendet nur ein und aus.
 * - Die Schleife laeuft nur, solange die Buehne im Bild ist.
 */

type Journey = ReturnType<typeof getHomepageContent>["journey"];

// Wo ein Kapitel beginnt (Anteil der Scrollstrecke). 0 = Start, 1..5 = Find ... Advisor.
const B = [0, 0.14, 0.32, 0.5, 0.68, 0.84, 1];
// Auf welcher Seite der Himmel steht (1 = rechts) und auf welcher der Text.
const CONSTELLATION_SIDE = [1, 1, -1, 1, -1, 1];
const TEXT_RIGHT = [false, false, true, false, true, false];

type Star = { x: number; y: number; z: number; ly: number; r: number; tw: number; sp: number; big: boolean; c: string };
type Cand = { x: number; y: number; c: number; ang: number; spd: number; px: number; py: number };
type Group = { x: number; y: number; nodes: { x: number; y: number }[]; ph: number; cx: number; cy: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function shortestAngle(a: number) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COL = ["155,130,255", "79,208,240"];
// Himmelsfarben je Anteil der Reise: [Anteil, oben, unten]
const KEYFRAMES: [number, number[], number[]][] = [
  [0, [13, 10, 46], [29, 20, 80]], [0.2, [14, 11, 51], [24, 28, 104]], [0.4, [18, 10, 56], [50, 22, 110]],
  [0.58, [12, 18, 56], [18, 58, 106]], [0.76, [10, 20, 56], [13, 74, 110]], [0.92, [26, 15, 61], [74, 42, 122]], [1, [26, 15, 61], [74, 42, 122]],
];
const NEBULAE: [number, number, number, string, number, number][] = [
  [0.15, 0.25, 0.55, "120,80,255", 0.2, 0.5], [0.85, 0.2, 0.5, "60,170,255", 0.16, 0.8], [0.7, 0.8, 0.6, "150,90,255", 0.16, 0.35],
  [0.2, 0.85, 0.45, "40,200,230", 0.12, 1], [0.5, 0.5, 0.7, "90,70,220", 0.12, 0.2],
];
const TEAM_RADIUS = [0.62, 0.9, 1.12, 1.34];
const TEAM_ANGLE = [-2.1, -0.55, 0.75, 2.35];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]];

export function StarJourney({ content, startLabel, accessLabel }: { content: Journey; startLabel: string; accessLabel: string }) {
  const storyRef = useRef<HTMLElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);

  function goTo(index: number) {
    const story = storyRef.current;
    const stick = stickRef.current;
    if (!story || !stick) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = story.getBoundingClientRect().top + window.scrollY;
    const navHeight = parseFloat(getComputedStyle(stick).top) || 0;
    const span = story.offsetHeight - stick.offsetHeight;
    window.scrollTo({ top: top - navHeight + span * (B[index] + 0.04), behavior: reduce ? "auto" : "smooth" });
  }

  useEffect(() => {
    const story = storyRef.current;
    const stick = stickRef.current;
    const canvas = canvasRef.current;
    if (!story || !stick || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g: CanvasRenderingContext2D = ctx;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const articles = Array.from(story.querySelectorAll<HTMLElement>("[data-txt]"));
    const ghosts = Array.from(story.querySelectorAll<HTMLElement>("[data-ghost]"));
    const wordsOf = articles.map((el) => Array.from(el.querySelectorAll<HTMLElement>("[data-w]")));

    // Die Welt: Sterne in drei Tiefenschichten, Kandidaten (die ersten vier sind das Team), weitere Sternbilder.
    const R = rng(7);
    const stars: Star[] = [];
    for (let i = 0; i < 260; i++) {
      const ly = i % 3;
      stars.push({ x: R() * 2 - 1, y: R() * 2 - 1, z: R(), ly, r: 0.5 + R() * (ly === 2 ? 1.1 : 0.7), tw: R() * 6.28, sp: 0.6 + R() * 1.4, big: R() < 0.1, c: R() < 0.3 ? (R() < 0.5 ? "185,163,255" : "130,220,255") : "232,229,255" });
    }
    const cand: Cand[] = [];
    for (let i = 0; i < 12; i++) {
      const an = R() * 6.283, rd = 0.5 + R() * 1.15;
      const x = Math.cos(an) * rd, y = Math.sin(an) * rd * 0.8;
      cand.push({ x, y, c: i % 2, ang: Math.atan2(y / 0.62, x), spd: (0.28 + R() * 0.22) * (i % 2 ? 1 : -1), px: x, py: y });
    }
    const groups: Group[] = [];
    for (let i = 0; i < 6; i++) {
      const ga = i * 1.0472 + 0.35, gd = 2.5 + (i % 2) * 0.5, n = 3 + (i % 2);
      const nodes: { x: number; y: number }[] = [];
      for (let j = 0; j < n; j++) nodes.push({ x: (R() - 0.5) * 0.7, y: (R() - 0.5) * 0.55 });
      groups.push({ x: Math.cos(ga) * gd, y: Math.sin(ga) * gd * 0.78, nodes, ph: R() * 6.28, cx: 0, cy: 0 });
    }

    let W = 0, H = 0, cx = 0, cy = 0, U = 1, p = 0, target = 0, tm = 0, last = 0, raf = 0, running = false, act = 0;

    function size() {
      const r = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas!.width = Math.round(W * dpr); canvas!.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mobile = W < 900;
      cy = mobile ? H * 0.33 : H * 0.5;
      U = mobile ? Math.min(W * 0.32, H * 0.17) : Math.min(W * 0.19, H * 0.29);
      cx = W * (mobile ? 0.5 : 0.66);
    }
    const ph = (k: number) => clamp01((p - B[k]) / (B[k + 1] - B[k]));

    function glow(x: number, y: number, r: number, c: string, a: number) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 4);
      gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.25, `rgba(${c},${a * 0.35})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 4, 0, 6.2832); g.fill();
      g.fillStyle = `rgba(255,255,255,${Math.min(1, a + 0.15)})`; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    }

    function drawBackground() {
      let a = KEYFRAMES[KEYFRAMES.length - 1], b = a, t = 0;
      for (let k = 0; k < KEYFRAMES.length - 1; k++) {
        if (p >= KEYFRAMES[k][0] && p <= KEYFRAMES[k + 1][0]) { a = KEYFRAMES[k]; b = KEYFRAMES[k + 1]; t = (p - a[0]) / (b[0] - a[0] || 1); break; }
      }
      const col = (x: number[], y: number[]) => `rgb(${Math.round(mix(x[0], y[0], t))},${Math.round(mix(x[1], y[1], t))},${Math.round(mix(x[2], y[2], t))})`;
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, col(a[1], b[1])); gr.addColorStop(1, col(a[2], b[2]));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      for (const n of NEBULAE) {
        const x = W * (0.5 + (n[0] - 0.5) * (1 + p * 0.9 * n[5])), y = H * (n[1] - p * 0.12 * n[5]);
        const r = Math.max(W, H) * n[2] * (1 + p * 1.1 * n[5]) * 0.55;
        const gg = g.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, `rgba(${n[3]},${n[4]})`); gg.addColorStop(1, `rgba(${n[3]},0)`);
        g.fillStyle = gg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = "source-over";
    }

    function drawStars() {
      const v = reduce ? 0 : Math.min(1, Math.abs(target - p) * 30);
      const speeds = [1, 0.6, 0.32], travel = p * 2.2;
      g.globalCompositeOperation = "lighter";
      for (const s of stars) {
        const z = (((s.z - travel * speeds[s.ly]) % 1) + 1) % 1, k = 0.42 / (z + 0.12);
        const x = W / 2 + s.x * W * 1.6 * k * 0.5, y = H / 2 + s.y * H * 1.6 * k * 0.5;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
        const fade = Math.min(1, z < 0.08 ? z / 0.08 : 1, z > 0.9 ? (1 - z) / 0.1 : 1);
        const size = s.r * (0.6 + (1 - z) * 1.8);
        const tw = reduce ? 1 : 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(tm * s.sp * 2 + s.tw), 2);
        const al = fade * (0.3 + 0.7 * (1 - z)) * tw;
        g.fillStyle = `rgba(${s.c},${al})`; g.beginPath(); g.arc(x, y, size, 0, 6.2832); g.fill();
        if (v > 0.03) {
          g.strokeStyle = `rgba(${s.c},${al * 0.6})`; g.lineWidth = size * 0.8; g.beginPath(); g.moveTo(x, y);
          g.lineTo(x - (x - W / 2) * 0.05 * v * k, y - (y - H / 2) * 0.05 * v * k); g.stroke();
        }
        if (s.big && tw > 0.7 && z < 0.85) {
          const L = size * (4 + 14 * Math.pow(tw, 4));
          g.strokeStyle = `rgba(${s.c},${al * 0.7})`; g.lineWidth = 1; g.beginPath();
          g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke();
        }
      }
      g.globalCompositeOperation = "source-over";
    }

    // Text und Schattenwoerter fliegen mit dem Scrollen
    function updateText() {
      const desktop = W >= 900;
      for (let k = 0; k < articles.length; k++) {
        const el = articles[k];
        const u = (p - B[k]) / (B[k + 1] - B[k]);
        const on = u >= 0 && u <= 1;
        const ent = k === 0 ? 1 : clamp01(u / 0.24);
        const ex = k === 5 ? 0 : clamp01((u - 0.78) / 0.22);
        const o = on ? ent * (1 - ex) : 0;
        const y = reduce ? 0 : (1 - ent) * 56 - ex * 40;
        const s = reduce ? 1 : (0.92 + 0.08 * ent) * (1 + ex * 0.1);
        el.style.opacity = String(o);
        el.style.visibility = o < 0.01 ? "hidden" : "visible";
        el.style.transform = `${desktop ? `translateY(calc(-50% + ${y}px))` : `translateY(${y}px)`} scale(${s})`;
        el.style.filter = !reduce && ex > 0.05 ? `blur(${ex * 6}px)` : "none";
        el.setAttribute("aria-hidden", o < 0.5 ? "true" : "false");
        const wi = k === 0 ? clamp01(tm * 0.9) : ent;
        wordsOf[k].forEach((w, j) => {
          const l = clamp01(wi * 1.6 - j * 0.24);
          w.style.opacity = String(l);
          w.style.transform = `translateY(${reduce ? 0 : (1 - l) * 30}px)`;
        });
        const gh = ghosts[k - 1];
        if (gh) {
          const gu = clamp01(u);
          gh.style.opacity = String(on && !reduce ? Math.sin(Math.PI * gu) : 0);
          gh.style.transform = `translate(-50%,-50%) scale(${0.7 + 1.5 * gu})`;
        }
      }
    }

    function sideNow() {
      let k = 0;
      for (let i = 0; i < 6; i++) if (p >= B[i]) k = i;
      const prev = CONSTELLATION_SIDE[Math.max(k - 1, 0)], now = CONSTELLATION_SIDE[k];
      return mix(prev, now, k === 0 ? 1 : ease(clamp01(ph(k) / 0.4)));
    }

    function frame(now: number) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now; tm += dt;
      p += (target - p) * (reduce ? 1 : 0.1);
      cx = W * (W < 900 ? 0.5 : 0.5 + sideNow() * 0.17);
      drawBackground(); drawStars(); updateText();

      const f = ease(ph(1)), a = ease(ph(2)), l = ease(ph(3)), c4 = ease(ph(4)), c5 = ease(ph(5));
      const zoom = 1 - 0.64 * c4;
      const sx = (x: number) => cx + x * U * zoom, sy = (y: number) => cy + y * U * zoom;

      if (c4 > 0) {
        groups.forEach((gr, gi) => {
          const bx = gr.x + Math.sin(tm * 0.3 + gr.ph) * 0.03, by = gr.y + Math.cos(tm * 0.25 + gr.ph) * 0.03;
          const pts = gr.nodes.map((n) => [sx(bx + n.x), sy(by + n.y)]);
          g.strokeStyle = `rgba(185,163,255,${0.35 * c4})`; g.lineWidth = 1; g.beginPath();
          pts.forEach((q, k) => (k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke();
          pts.forEach((q, k) => glow(q[0], q[1], 2.2, COL[(gi + k) % 2], 0.6 * c4));
          gr.cx = sx(bx); gr.cy = sy(by);
        });
        const cs: [number, number][] = [[cx, cy], ...groups.map((gr): [number, number] => [gr.cx, gr.cy])];
        const pairs = [[0, 1], [0, 3], [0, 5], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]];
        pairs.forEach((pr, k) => {
          const A = cs[pr[0]], Bq = cs[pr[1]];
          if (!A || !Bq) return;
          const mx = (A[0] + Bq[0]) / 2, my = (A[1] + Bq[1]) / 2 - U * 0.35 * zoom;
          g.strokeStyle = `rgba(111,211,255,${0.22 * c4})`; g.lineWidth = 1; g.beginPath(); g.moveTo(A[0], A[1]); g.quadraticCurveTo(mx, my, Bq[0], Bq[1]); g.stroke();
          const t = (tm * 0.16 + k * 0.37) % 1, u = 1 - t;
          glow(u * u * A[0] + 2 * u * t * mx + t * t * Bq[0], u * u * A[1] + 2 * u * t * my + t * t * Bq[1], 1.8, "111,211,255", 0.8 * c4);
        });
      }
      if (c5 > 0) {
        const gx = cx, gy = cy - U * 1.05 * zoom - U * 0.1;
        groups.forEach((gr) => { g.strokeStyle = `rgba(255,240,200,${0.16 * c5})`; g.lineWidth = 1; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gr.cx, gr.cy); g.stroke(); });
        const rr = 5 * (1 + (reduce ? 0 : 0.06 * Math.sin(tm * 1.4)));
        glow(gx, gy, rr, "255,226,160", 0.9 * c5);
        g.strokeStyle = `rgba(255,240,205,${0.6 * c5})`; g.lineWidth = 1.2; g.beginPath();
        g.moveTo(gx - rr * 5, gy); g.lineTo(gx + rr * 5, gy); g.moveTo(gx, gy - rr * 5); g.lineTo(gx, gy + rr * 5); g.stroke();
      }
      for (let i = 0; i < cand.length; i++) {
        const cd = cand[i], lit = clamp01(f * 13 - i), team = i < 4;
        let x: number, y: number, alpha: number;
        if (team) {
          if (a > 0) { cd.ang += cd.spd * dt * (1 - l); cd.ang += shortestAngle(TEAM_ANGLE[i] - cd.ang) * 0.06 * l * l; }
          const ox = Math.cos(cd.ang) * TEAM_RADIUS[i], oy = Math.sin(cd.ang) * TEAM_RADIUS[i] * 0.62;
          x = mix(cd.x, ox, a); y = mix(cd.y, oy, a); alpha = 0.95 * lit; cd.px = x; cd.py = y;
          if (a > 0 && l < 1) {
            g.strokeStyle = `rgba(185,163,255,${0.16 * a * (1 - l)})`; g.lineWidth = 1; g.beginPath();
            g.ellipse(sx(0), sy(0), TEAM_RADIUS[i] * U * zoom, TEAM_RADIUS[i] * 0.62 * U * zoom, 0, 0, 6.2832); g.stroke();
          }
        } else { x = cd.x; y = cd.y; alpha = 0.9 * lit * (1 - 0.8 * a); }
        if (lit > 0) glow(sx(x), sy(y), team ? 3 + 1.5 * lit : 2.2, COL[cd.c], alpha);
      }
      if (l > 0) {
        g.lineWidth = 1.4;
        EDGES.forEach((e, j) => {
          const k = clamp01(l * EDGES.length - j), A = cand[e[0]], Bq = cand[e[1]];
          if (k <= 0) return;
          const x1 = sx(A.px), y1 = sy(A.py), x2 = sx(Bq.px), y2 = sy(Bq.py);
          g.strokeStyle = `rgba(235,230,255,${0.55 * k})`; g.beginPath(); g.moveTo(x1, y1); g.lineTo(mix(x1, x2, k), mix(y1, y2, k)); g.stroke();
        });
        if (l > 0.95) {
          const pr = reduce ? 0 : (tm % 3) / 3;
          for (let i = 0; i < 4; i++) { g.strokeStyle = `rgba(185,163,255,${0.35 * (1 - pr)})`; g.lineWidth = 1; g.beginPath(); g.arc(sx(cand[i].px), sy(cand[i].py), 6 + pr * 18, 0, 6.2832); g.stroke(); }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    function onScroll() {
      const r = story!.getBoundingClientRect();
      const navHeight = parseFloat(getComputedStyle(stick!).top) || 0;
      const span = story!.offsetHeight - stick!.offsetHeight;
      target = span > 0 ? clamp01((navHeight - r.top) / span) : 0;
      let k = 0;
      for (let i = 0; i < 6; i++) if (target >= B[i]) k = i;
      if (k !== act) { act = k; setActive(k); }
    }
    function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size(); onScroll(); p = target;
    updateText();
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) start(); else stop(); }, { threshold: 0 });
    io.observe(story);
    const ro = new ResizeObserver(() => { size(); onScroll(); });
    ro.observe(stick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { stop(); io.disconnect(); ro.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  const chapters = content.chapters;
  return (
    <section ref={storyRef} className={styles.story} aria-label={content.ariaLabel}>
      <div ref={stickRef} className={styles.stick}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.txts}>
          {chapters.map((c, i) => <div key={c.ghost} className={styles.ghost} data-ghost={i + 1} aria-hidden="true">{c.ghost}</div>)}
          <article className={`${styles.txt} ${styles.txtFirst}`} data-txt="0">
            <h1><span data-w>{content.headline[0]}</span><span className={styles.two} data-w>{content.headline[1]}</span></h1>
            <p>{content.sub}</p>
            <div className={styles.ctaRow}>
              <Link href="/start" className={`${styles.btn} ${styles.btnLg} ${styles.btnPrimary}`}>{startLabel}</Link>
              <a href="#zugang" className={`${styles.btn} ${styles.btnLg} ${styles.btnGhost}`}>{accessLabel}</a>
            </div>
            <span className={styles.hint}>{content.scroll} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg></span>
          </article>
          {chapters.map((c, i) => (
            <article key={c.label} className={`${styles.txt} ${TEXT_RIGHT[i + 1] ? styles.txtRight : ""}`} data-txt={i + 1}>
              <p className={styles.label}>{c.label}</p>
              <h2>{c.title.split(" ").map((w, j) => <span key={j} className={styles.word} data-w>{w}</span>)}</h2>
              <p>{c.text}</p>
            </article>
          ))}
        </div>
        <nav className={styles.dots} aria-label={content.dotsLabel}>
          {content.dots.map((label, i) => (
            <button key={label} type="button" className={styles.dot} aria-label={label} aria-current={active === i ? "true" : "false"} onClick={() => goTo(i)}>
              <span>{label}</span><i />
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
