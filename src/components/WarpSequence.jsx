import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * WarpSequence — Full-screen visual-only animation shown after a successful
 * scan (~10s total) before the welcome dashboard appears. No text, just the
 * holographic portal pulses:
 *
 *   1.3s  portal rings fade in over the fading warp flash
 *   5.0s  first pulse wave fades out, second wave fades in
 *   8.6s  rings fade out
 *   9.2s  onFlash -> white/cyan overlay covers screen
 *  10.0s  onComplete -> App switches to dashboard (welcome + logo)
 */

export default function WarpSequence({ onFlash, onComplete }) {
  const ringsRef = useRef(null);

  useEffect(() => {
    const targets = [ringsRef.current].filter(Boolean);

    const tl = gsap.timeline({ onComplete });

    tl.fromTo(
      ringsRef.current,
      { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
      1.3,
    )
      .to(
        ringsRef.current,
        { scale: 1.12, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 },
        3.0,
      )
      .to(ringsRef.current, { opacity: 0, duration: 0.4, ease: "power2.in" }, 5.0)
      .fromTo(
        ringsRef.current,
        { opacity: 0, scale: 0.75 },
        { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" },
        5.6,
      )
      .to(
        ringsRef.current,
        { scale: 1.12, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: 1 },
        7.0,
      )
      .to(ringsRef.current, { opacity: 0, duration: 0.5, ease: "power2.in" }, 8.6)
      .call(onFlash, [], 9.2)
      .call(onComplete, [], 10.0);

    return () => {
      tl.kill();
      gsap.killTweensOf(targets);
    };
  }, [onComplete, onFlash]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Holographic portal — pure visual, no text */}
      <div ref={ringsRef} className="absolute inset-0 flex items-center justify-center opacity-0">
        <div className="logo-halo absolute h-64 w-96 rounded-full sm:h-80 sm:w-[30rem]" />
        <div className="absolute h-40 w-40 rounded-full border border-mentari/70 animate-ring-ping" />
        <div
          className="absolute h-56 w-56 rounded-full border border-cyan-300/70 animate-ring-ping"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute h-72 w-72 rounded-full border border-electric/80 animate-ring-ping"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute h-96 w-96 rounded-full border-2 border-dashed border-mentari/50 animate-ring-spin"
          style={{ animationDuration: "10s" }}
        />
      </div>
    </div>
  );
}