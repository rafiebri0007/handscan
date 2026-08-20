import { useEffect, useRef } from "react";
import * as sound from "../sound.js";

/**
 * SoundSystem — invisible audio orchestrator.
 * Listens to the app phase and plays the matching event sound:
 *   boot      -> startup arpeggio
 *   ready     -> confirmation blip + ambient hum loop
 *   scanning  -> sonar pings (repeating)
 *   warp      -> sound1.mp3 loops until the welcome appears
 *   dashboard -> end.mp3 loops while welcome + logo are shown
 * Verified chime is fired directly from App (scan completion timing).
 */
export default function SoundSystem({ phase }) {
  const prevPhase = useRef(phase);

  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    if (prev === phase) return;

    /* warp music (sound1.mp3 loop) stops as soon as the warp phase ends */
    if (prev === "warp") sound.stopWarpMusic();
    /* scan.mp3 stops the moment the tunnel/warp begins */
    if (prev === "scanning") sound.stopScan();
    /* end.mp3 stops as soon as the dashboard (welcome + logo) is left */
    if (prev === "dashboard") sound.stopEndMusic();

    switch (phase) {
      case "boot":
        sound.playBoot();
        break;
      case "ready":
        sound.stopAmbient();
        sound.playReady();
        sound.startAmbient();
        break;
      case "scanning":
        sound.stopAmbient();
        break;
      case "warp":
        sound.playWarpMusic();
        break;
      case "dashboard":
        sound.playEndMusic();
        break;
      default:
        sound.stopAmbient();
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "scanning") return;
    const id = setInterval(() => sound.playScanPing(), 750);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      sound.stopWarpMusic();
      sound.stopEndMusic();
      sound.stopAmbient();
    };
  }, []);

  return null;
}