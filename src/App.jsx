import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import CyberTunnel from "./components/CyberTunnel.jsx";
import CountdownTimer from "./components/CountdownTimer.jsx";
import HandScanner from "./components/HandScanner.jsx";
import HUDOverlay from "./components/HUDOverlay.jsx";
import SoundSystem from "./components/SoundSystem.jsx";
import WarpSequence from "./components/WarpSequence.jsx";
import * as sound from "./sound.js";
import logoBcf from "./images/logobcf.png";

/**
 * App — Main coordinator.
 *
 * Phases:  boot -> ready -> scanning -> warp -> dashboard
 *   - boot:      tunnel cruising, title scramble running
 *   - ready:     both scanners glowing, waiting for input
 *   - scanning:  Enter pressed — both hands scan simultaneously
 *   - warp:      100% -> tunnel hyper-speed + white/cyan flash
 *   - dashboard: success content view
 */

const SCANNER_COUNT = 2;
/* Single source of truth for scan timing:
   countdown runs 5s, "SCAN COMPLETE" holds ~1.5s, then warp begins. */
const COUNTDOWN_MS = 5000;
const COMPLETE_HOLD_MS = 1500;
const SCAN_MS = COUNTDOWN_MS + COMPLETE_HOLD_MS;
const BOOT_MS = 2200;

const CONFETTI_COLORS = [
  "#71c5e8",
  "#307fe2",
  "#0857c3",
  "#f5c518",
  "#ffffff",
  "#b9dcf5",
];

export default function App() {
  const [phase, setPhase] = useState("boot");
  const [statuses, setStatuses] = useState(Array(SCANNER_COUNT).fill("idle"));
  const [progress, setProgress] = useState(0);
  const scannedCount = statuses.filter((s) => s === "verified").length;

  const warpRef = useRef({ active: false });
  const overlayRef = useRef(null);
  const dashboardRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const dividerRef = useRef(null);
  const progressProxy = useRef({ value: 0 });
  const timersRef = useRef([]);
  const verifiedRef = useRef(0);
  const warpStartedRef = useRef(false);

  /* ------------------------------ helpers ------------------------------ */
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  /* ------------------------------- boot ------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => setPhase("ready"), BOOT_MS);
    timersRef.current.push(t);
    return () => clearTimeout(t);
  }, []);

  /* ------------------------------ scanning ----------------------------- */
  const handleScan = () => {
    if (phase !== "ready" && phase !== "scanning") return;
    if (statuses.some((s) => s === "scanning")) return;

    setPhase("scanning");
    setStatuses(Array(SCANNER_COUNT).fill("scanning"));

    /* Progress fills linearly across the countdown, reaching 100% at the
       exact moment the countdown completes, then holds at 100% during the
       SCAN COMPLETE hold before warping. */
    gsap.killTweensOf(progressProxy.current);
    progressProxy.current.value = 0;
    setProgress(0);
    gsap.to(progressProxy.current, {
      value: 100,
      duration: COUNTDOWN_MS / 1000,
      ease: "linear",
      onUpdate: () => setProgress(progressProxy.current.value),
    });
  };

  /* Fired by CountdownTimer the moment it reaches 0 — the scan is done. */
  const handleScanComplete = () => {
    if (warpStartedRef.current) return;
    setStatuses(Array(SCANNER_COUNT).fill("verified"));
    verifiedRef.current = SCANNER_COUNT;
    sound.playVerify();

    /* Hold the "SCAN COMPLETE" state, then warp */
    const t = setTimeout(() => {
      if (!warpStartedRef.current) beginWarp();
    }, COMPLETE_HOLD_MS);
    timersRef.current.push(t);
  };

  /* ---------------------------- warp + dashboard ------------------------ */
  const flashOverlay = () => {
    gsap.to(overlayRef.current, { opacity: 1, duration: 0.8, ease: "power2.in" });
  };

  const beginWarp = () => {
    warpStartedRef.current = true;
    warpRef.current.active = true;
    setPhase("warp");

    gsap
      .timeline()
      .to(overlayRef.current, { opacity: 1, duration: 0.85, ease: "power2.in" })
      .to(overlayRef.current, {
        opacity: 0,
        duration: 0.7,
        delay: 0.2,
        ease: "power2.out",
      });
  };

  /* Called by WarpSequence after its ~10s staged animation completes */
  const endWarp = () => {
    warpRef.current.active = false;
    setPhase("dashboard");
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.9, ease: "power2.out" });
  };

  useEffect(() => {
    if (phase === "dashboard" && dashboardRef.current) {
      gsap.fromTo(
        dashboardRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" },
      );
      gsap.fromTo(
        titleRef.current,
        { letterSpacing: "0.9em", opacity: 0, y: -14 },
        {
          letterSpacing: "0.35em",
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay: 0.15,
          ease: "power3.out",
        },
      );
      gsap.fromTo(
        logoRef.current,
        { scale: 0.85, opacity: 0, y: 20 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay: 0.45,
          ease: "back.out(1.6)",
        },
      );
      gsap.fromTo(
        dividerRef.current,
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.6,
          delay: 0.9,
          ease: "power2.out",
        },
      );
    }
  }, [phase]);

  /* -------------------------------- reset ------------------------------- */
  const resetAll = () => {
    clearTimers();
    gsap.killTweensOf(progressProxy.current);
    if (overlayRef.current)
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.4 });
    progressProxy.current.value = 0;
    verifiedRef.current = 0;
    warpStartedRef.current = false;
    warpRef.current.active = false;
    setProgress(0);
    setStatuses(Array(SCANNER_COUNT).fill("idle"));
    setPhase("ready");
  };

  /* ----------------------------- keyboard ------------------------------- */
  useEffect(() => {
    const onKey = (e) => {
      sound.unlockAudio();
      if (e.key === "Enter") {
        e.preventDefault();
        if (phase === "dashboard" || phase === "warp") resetAll();
        else handleScan();
      } else if (e.key === "Escape") {
        resetAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------------ confetti ------------------------------ */
  const confetti = useMemo(() => {
    if (phase !== "dashboard") return [];
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      width: 6 + Math.random() * 7,
      height: (6 + Math.random() * 7) * (1.4 + Math.random()),
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      sway: `${((Math.random() - 0.5) * 160).toFixed(0)}px`,
      duration: `${(2.6 + Math.random() * 1.9).toFixed(2)}s`,
      delay: `${(Math.random() * 0.7).toFixed(2)}s`,
    }));
  }, [phase]);

  const interactive = phase !== "warp" && phase !== "dashboard";

  /* -------------------------------- render ------------------------------ */
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      {/* Audio orchestrator (phase-driven sound effects) */}
      <SoundSystem phase={phase} />

      {/* A. 3D cyber grid tunnel */}
      <CyberTunnel warpRef={warpRef} />

      {/* CRT scanlines + vignette */}
      <div className="scanlines pointer-events-none absolute inset-0 z-30" />
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(2,6,23,0.55) 100%)",
        }}
      />

      {/* B. HUD overlay */}
      {phase !== "dashboard" && phase !== "warp" && (
        <HUDOverlay
          progress={progress}
          scanned={scannedCount}
          phase={phase}
          compact={phase === "scanning"}
        />
      )}

      {/* Sci-Fi countdown HUD while palms are being scanned */}
      {phase === "scanning" && (
        <CountdownTimer
          seconds={COUNTDOWN_MS / 1000}
          onComplete={handleScanComplete}
        />
      )}

      {/* C. Hand scanner array (bottom panel) */}
      {interactive && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-3 sm:bottom-8">
          <div className="sci-fi-panel flex items-end gap-10 px-5 pb-8 pt-4 sm:gap-16 sm:px-9 sm:pb-9 sm:pt-5 lg:gap-40">
            {statuses.map((status, i) => (
              <HandScanner
                key={i}
                index={i}
                status={status}
                disabled={phase === "boot"}
              />
            ))}
          </div>
        </div>
      )}

      {phase === "warp" && (
        <WarpSequence onFlash={flashOverlay} onComplete={endWarp} />
      )}

      {/* White/cyan warp flash */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 z-40 opacity-0"
        style={{
          background:
            "radial-gradient(circle at center, #ffffff 0%, #d9f6ff 35%, rgba(113,197,232,0.85) 70%, rgba(8,87,195,0.9) 100%)",
        }}
      />

      {/* D. Dashboard content */}
      {phase === "dashboard" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-1">
          <div
            ref={dashboardRef}
            className="relative flex w-full max-w-xl flex-col items-center text-center"
          >
            {/* WELCOME title */}
            <h2
              ref={titleRef}
              className="font-display text-4xl font-extrabold uppercase tracking-[0.35em] text-white neon-white sm:text-6xl"
            >
              Welcome&nbsp;to
            </h2>

            {/* Decorative divider */}
            <div ref={dividerRef} className="mt-5 flex items-center gap-3">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-mentari/70 sm:w-24" />
              <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_rgba(245,197,24,0.95)]" />
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-mentari/70 sm:w-24" />
            </div>

            {/* Logo (transparent PNG, floating over the tunnel) */}
            <div className="relative mt-8">
              <div className="logo-halo pointer-events-none absolute left-1/2 top-1/2 h-72 w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-96 sm:w-[34rem]" />
              <img
                ref={logoRef}
                src={logoBcf}
                alt="Logo BRILiaN Culture Fest 2026"
                draggable="false"
                className="relative w-[26rem] max-w-[85vw] object-contain drop-shadow-[0_0_14px_rgba(113,197,232,0.5)] drop-shadow-[0_0_44px_rgba(8,87,195,0.35)] sm:w-[34rem]"
              />
            </div>

            {/* Decorative divider */}
            <div ref={dividerRef} className="mt-5 flex items-center gap-3">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-mentari/70 sm:w-24" />
              <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_rgba(245,197,24,0.95)]" />
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-mentari/70 sm:w-24" />
            </div>

            <h2
              ref={titleRef}
              className="font-display whitespace-nowrap text-4xl font-extrabold uppercase tracking-[0.35em] text-white neon-white sm:text-6xl"
            >
              BO BANYUWANGI
            </h2>
          </div>
        </div>
      )}

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti-piece"
          style={{
            left: c.left,
            width: c.width,
            height: c.height,
            background: c.background,
            ["--sway"]: c.sway,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        />
      ))}
    </div>
  );
}
