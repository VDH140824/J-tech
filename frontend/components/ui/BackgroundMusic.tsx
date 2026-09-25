import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const MUSIC_URL =
  "https://res.cloudinary.com/keticbsk/video/upload/v1785996208/Japanese_Music_Nh%E1%BA%A1c_Nh%E1%BA%ADt_B%E1%BA%A3n_Hay_Nh%E1%BA%A5t_Nh%E1%BA%A1c_Anime_Bu%E1%BB%93n_Nh%E1%BA%B9_Nh%C3%A0ng_om5uhw.mp3";

/** Routes where background music should play */
const MUSIC_ROUTES = ["/", "/home", "/login"];

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [showVolume, setShowVolume] = useState(false);
  const location = useLocation();

  const shouldPlay = MUSIC_ROUTES.some(
    (route) =>
      location.pathname === route || location.pathname.startsWith(`${route}/`),
  );

  // Create audio element once. Playback starts only from the music button.
  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Pause when leaving music-enabled routes; resume only if already playing.
  useEffect(() => {
    if (!audioRef.current) return;
    if (!shouldPlay) {
      audioRef.current.pause();
      setPlaying(false);
    } else if (playing) {
      audioRef.current.play().catch(() => {});
    }
  }, [shouldPlay, playing]);

  // Keep the audio element volume in sync with the slider.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!shouldPlay) return null;

  const toggle = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();

    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    // Playback is initiated exclusively by an explicit click on this button.
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };

  return (
    <>
      <style>{`
        .bg-music-widget {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          font-family: 'Inter', sans-serif;
        }

        .bg-music-volume-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(2, 10, 22, 0.55);
          border: 1px solid rgba(56, 189, 248, 0.3);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 18px rgba(0,0,0,0.3);
          animation: musicFadeIn 0.25s ease;
        }

        @keyframes musicFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .bg-music-volume-bar input[type="range"] {
          width: 80px;
          accent-color: #38bdf8;
          cursor: pointer;
        }

        .bg-music-vol-icon {
          font-size: 13px;
          color: #7dd3fc;
        }

        .bg-music-btn {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 16px 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(56, 189, 248, 0.35);
          background: rgba(2, 10, 22, 0.55);
          backdrop-filter: blur(12px);
          color: #e0f2fe;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(0,0,0,0.3);
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s, transform 0.2s;
          user-select: none;
        }
        .bg-music-btn:hover {
          border-color: #38bdf8;
          background: rgba(14, 165, 233, 0.2);
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.35);
          transform: translateY(-1px);
        }

        .bg-music-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 14px;
          background: rgba(14, 165, 233, 0.25);
          border: 1px solid rgba(56, 189, 248, 0.4);
          flex-shrink: 0;
        }

        @keyframes musicPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56,189,248,0.4); }
          50%       { transform: scale(1.06); box-shadow: 0 0 0 5px rgba(56,189,248,0); }
        }
        .bg-music-icon.playing {
          animation: musicPulse 1.8s ease-in-out infinite;
          background: rgba(14, 165, 233, 0.4);
        }

        .bg-music-equalizer {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 12px;
        }
        .bg-music-bar {
          width: 3px;
          border-radius: 2px;
          background: #38bdf8;
        }
        .bg-music-bar:nth-child(1) { animation: eq1 0.6s ease-in-out infinite alternate; }
        .bg-music-bar:nth-child(2) { animation: eq2 0.5s ease-in-out infinite alternate 0.15s; }
        .bg-music-bar:nth-child(3) { animation: eq3 0.7s ease-in-out infinite alternate 0.05s; }
        @keyframes eq1 { from { height: 4px; } to { height: 12px; } }
        @keyframes eq2 { from { height: 8px; } to { height: 4px; }  }
        @keyframes eq3 { from { height: 3px; } to { height: 10px; } }
      `}</style>

      <div className="bg-music-widget">
        {/* Volume slider (shown on hover) */}
        {showVolume && (
          <div className="bg-music-volume-bar">
            <span className="bg-music-vol-icon">🔈</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="bg-music-vol-icon">🔊</span>
          </div>
        )}

        {/* Main play/pause button */}
        <div
          className="bg-music-btn"
          onClick={toggle}
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
          title={
            playing
              ? "Pause music • Scroll for volume"
              : "Play Japanese background music"
          }
        >
          <span className={`bg-music-icon ${playing ? "playing" : ""}`}>
            {playing ? "🎵" : "🎶"}
          </span>

          {playing ? (
            <div className="bg-music-equalizer">
              <div className="bg-music-bar" />
              <div className="bg-music-bar" />
              <div className="bg-music-bar" />
            </div>
          ) : (
            <span>Nhạc Nhật</span>
          )}
        </div>
      </div>
    </>
  );
}
