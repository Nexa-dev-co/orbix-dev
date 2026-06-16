import type { CameraMode } from "./config";
import type { OrbitSection } from "./sections";

interface OrbitHudProps {
  sections: OrbitSection[];
  active: number;
  mode: CameraMode;
  onJump: (index: number) => void;
}

/** Right-side nav rail (jump to any orbit) + bottom-left camera-mode hint. */
export default function OrbitHud({ sections, active, mode, onJump }: OrbitHudProps) {
  return (
    <>
      <nav style={railStyle}>
        {sections.map((s, i) => {
          const on = i === active;
          return (
            <button key={s.nav} onClick={() => onJump(i)} style={{ ...buttonStyle, color: on ? "var(--fg)" : "var(--muted)" }}>
              <span className="eyebrow" style={{ opacity: on ? 1 : 0, transition: "opacity 0.3s" }}>{s.nav}</span>
              <span style={{ width: on ? 26 : 14, height: 2, background: on ? "var(--accent)" : "var(--border)", transition: "all 0.35s" }} />
            </button>
          );
        })}
      </nav>

      <div className="eyebrow" style={hintStyle}>
        Camera: {mode === "zoom" ? "full zoom-out" : "fly along route"}
        {mode === "fly" ? " · ?cam=zoom" : " · ?cam=fly"} · ?view=2d
      </div>
    </>
  );
}

const railStyle: React.CSSProperties = {
  position: "fixed",
  right: "clamp(1.2rem,3vw,2.4rem)",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  gap: "0.9rem",
  alignItems: "flex-end",
};

const buttonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

const hintStyle: React.CSSProperties = {
  position: "fixed",
  left: "clamp(1.2rem,3vw,2.4rem)",
  bottom: "clamp(1.2rem,3vw,2.4rem)",
  zIndex: 3,
  color: "var(--muted)",
};
