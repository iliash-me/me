import { useState, useEffect, useCallback } from "react";

/**
 * Reusable Fullscreen hook for games.
 * Handles HTML5 Fullscreen API, cross-browser vendor prefixes,
 * 'F' keyboard shortcut toggle, and synchronized state via fullscreenchange.
 */
export function useGameFullscreen(containerRef) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

      const inFs = Boolean(
        activeEl &&
          (!containerRef?.current ||
            activeEl === containerRef.current ||
            containerRef.current.contains(activeEl))
      );
      setIsFullscreen(inFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [containerRef]);

  const toggleFullscreen = useCallback(async () => {
    const target = containerRef?.current || document.documentElement;

    const isCurrentlyFs = Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );

    try {
      if (isCurrentlyFs) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } else {
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if (target.webkitRequestFullscreen) {
          await target.webkitRequestFullscreen();
        } else if (target.mozRequestFullScreen) {
          await target.mozRequestFullScreen();
        } else if (target.msRequestFullscreen) {
          await target.msRequestFullscreen();
        }
        setIsFullscreen(true);
      }
    } catch {
      // Fallback: toggle state for CSS fullscreen simulation if browser blocks API
      setIsFullscreen((prev) => !prev);
    }
  }, [containerRef]);

  // Toggle with 'F' key (unless user is typing in an input)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "f" || e.key === "F") {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  return { isFullscreen, toggleFullscreen };
}
