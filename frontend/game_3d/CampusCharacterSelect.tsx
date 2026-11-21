import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Link } from "react-router-dom";
import { CampusAvatar, type AvatarMotion, type CampusCharacter } from "./CampusAvatar";

const choices: { id: CampusCharacter; label: string }[] = [
  { id: "male", label: "Nam" },
  { id: "female", label: "Nữ" },
];

const previewUnavailable = <span className="campus-character-preview-notice">Không thể xem trước 3D</span>;

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? previewUnavailable : this.props.children;
  }
}

function CharacterPreview({ character }: { character: CampusCharacter }) {
  const motion = useRef<AvatarMotion>({ speed: 0, running: false });

  return (
    <div className="campus-character-preview" aria-hidden="true">
      <PreviewErrorBoundary>
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [1.8, 1.15, 4.6], fov: 28, near: 0.1, far: 20 }}
          fallback={previewUnavailable}
        >
          <ambientLight intensity={1.35} />
          <directionalLight position={[3, 5, 4]} intensity={2.25} />
          <directionalLight position={[-3, 2, -3]} intensity={1.15} />
          <mesh position={[0, -0.935, 0]}>
            <cylinderGeometry args={[0.63, 0.67, 0.09, 40]} />
            <meshStandardMaterial color="#faf7f8" roughness={0.85} />
          </mesh>
          <group position={[0, -0.89, 0]}>
            <CampusAvatar character={character} motion={motion} />
          </group>
        </Canvas>
      </PreviewErrorBoundary>
    </div>
  );
}

export function CampusCharacterSelect({ onEnter }: { onEnter: (character: CampusCharacter) => void }) {
  const page = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<CampusCharacter | null>(null);

  useEffect(() => {
    const section = page.current;
    if (section && section.getBoundingClientRect().top > window.innerHeight / 2) {
      section.scrollIntoView({ block: "start" });
    }
  }, []);

  return (
    <section ref={page} className="campus-3d-page campus-character-page" aria-labelledby="campus-character-title">
      <Link className="campus-3d-back" to="/games">← Danh sách trò chơi</Link>
      <form className="campus-character-select" onSubmit={(event) => {
        event.preventDefault();
        if (selected) onEnter(selected);
      }}>
        <header>
          <p>FPTU Campus 3D</p>
          <h1 id="campus-character-title">Chọn nhân vật</h1>
        </header>
        <div className="campus-character-options" role="radiogroup" aria-labelledby="campus-character-title">
          {choices.map(({ id, label }) => (
            <div className="campus-character-card" key={id} data-character={id} data-selected={selected === id}>
              <CharacterPreview character={id} />
              <label>
                <input
                  type="radio"
                  name="campus-character"
                  value={id}
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                  required
                />
                {label}
              </label>
            </div>
          ))}
        </div>
        <button className="campus-character-enter" type="submit" disabled={!selected}>Vào map</button>
      </form>
    </section>
  );
}
