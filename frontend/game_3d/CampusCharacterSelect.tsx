import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Link } from "react-router-dom";
import { CampusAvatar, type AvatarMotion, type CampusCharacter } from "./CampusAvatar";
import {
  ACCESSORY_OPTIONS,
  HAIR_COLOR_OPTIONS,
  OUTFIT_OPTIONS,
  loadCharacterCustomization,
  saveCharacterCustomization,
  type CharacterAccessory,
  type CharacterCustomization,
  type CharacterHairColor,
  type CharacterOutfit,
} from "./campusCharacterStyles";

const previewUnavailable = (
  <div className="campus-character-preview-notice">
    <span>Không thể tải chế độ xem trước 3D</span>
  </div>
);

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? previewUnavailable : this.props.children;
  }
}

function PedestalAndAvatar({
  character,
  customization,
}: {
  character: CampusCharacter;
  customization: CharacterCustomization;
}) {
  const motion = useRef<AvatarMotion>({ speed: 0, running: false });
  const outfit = OUTFIT_OPTIONS.find((o) => o.id === customization.outfit) ?? OUTFIT_OPTIONS[0];
  const accentColor = outfit.accentColor;

  return (
    <group position={[0, -0.85, 0]}>
      {/* Sci-Fi glowing pedestal base */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.72, 0.78, 0.08, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.7} />
      </mesh>
      {/* Inner glowing ring */}
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.68, 48]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      {/* Outer neon glow ring */}
      <mesh position={[0, -0.01, 0]}>
        <torusGeometry args={[0.73, 0.015, 16, 48]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
      </mesh>
      {/* Avatar with customized outfit & accessories */}
      <CampusAvatar character={character} motion={motion} customization={customization} />
    </group>
  );
}

export function CampusCharacterSelect({
  onEnter,
}: {
  onEnter: (character: CampusCharacter, customization: CharacterCustomization) => void;
}) {
  const page = useRef<HTMLElement>(null);
  const [character, setCharacter] = useState<CampusCharacter>("male");
  const [customization, setCustomization] = useState<CharacterCustomization>(() => loadCharacterCustomization("male"));
  const [activeTab, setActiveTab] = useState<"outfit" | "accessory" | "hair">("outfit");
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  // Sync customization when switching gender
  const handleSelectCharacter = (newChar: CampusCharacter) => {
    setCharacter(newChar);
    const loaded = loadCharacterCustomization(newChar);
    setCustomization(loaded);
  };

  const handleOutfitChange = (outfit: CharacterOutfit) => {
    const updated = { ...customization, outfit };
    setCustomization(updated);
    saveCharacterCustomization(updated);
  };

  const handleAccessoryChange = (accessory: CharacterAccessory) => {
    const updated = { ...customization, accessory };
    setCustomization(updated);
    saveCharacterCustomization(updated);
  };

  const handleHairColorChange = (hairColor: CharacterHairColor) => {
    const updated = { ...customization, hairColor };
    setCustomization(updated);
    saveCharacterCustomization(updated);
  };

  // Click-to-rotate actions
  const rotateLeft = () => {
    if (controlsRef.current) {
      setAutoRotate(false);
      const current = controlsRef.current.getAzimuthalAngle();
      controlsRef.current.setAzimuthalAngle(current - Math.PI / 4);
      controlsRef.current.update();
    }
  };

  const rotateRight = () => {
    if (controlsRef.current) {
      setAutoRotate(false);
      const current = controlsRef.current.getAzimuthalAngle();
      controlsRef.current.setAzimuthalAngle(current + Math.PI / 4);
      controlsRef.current.update();
    }
  };

  const viewFront = () => {
    if (controlsRef.current) {
      setAutoRotate(false);
      controlsRef.current.setAzimuthalAngle(0);
      controlsRef.current.update();
    }
  };

  const viewBack = () => {
    if (controlsRef.current) {
      setAutoRotate(false);
      controlsRef.current.setAzimuthalAngle(Math.PI);
      controlsRef.current.update();
    }
  };

  const toggleAutoRotate = () => {
    setAutoRotate((prev) => !prev);
  };

  useEffect(() => {
    const section = page.current;
    if (section && section.getBoundingClientRect().top > window.innerHeight / 2) {
      section.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, []);

  return (
    <section ref={page} className="campus-3d-page campus-select-v2-container" aria-labelledby="campus-character-title">
      {/* Top Bar Navigation */}
      <div className="campus-select-v2-topbar">
        <Link className="campus-3d-back-modern" to="/games">
          <span className="back-arrow">←</span> Danh sách trò chơi
        </Link>
        <div className="campus-badge-metaverse">
          <span className="campus-pulse-dot" />
          <span>FPTU METAVERSE 3D</span>
        </div>
      </div>

      <header className="campus-select-v2-header">
        <p className="campus-select-sub">FPT UNIVERSITY CAMPUS</p>
        <h1 id="campus-character-title">Chọn &amp; Tùy Biến Nhân Vật</h1>
        <p className="campus-select-desc">
          Tạo hình phong cách sinh viên FPT mang đậm dấu ấn của bạn trước khi bước vào khuôn viên ảo.
        </p>
      </header>

      {/* Main Studio Arena */}
      <div className="campus-select-v2-arena">
        {/* Left: 3D Interactive Stage */}
        <div className="campus-stage-wrapper">
          <div
            className="campus-stage-canvas-box"
            title="Kéo chuột hoặc vuốt để xoay 360°"
          >
            <PreviewErrorBoundary>
              <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [0, 0.35, 4.2], fov: 28, near: 0.1, far: 30 }}
                fallback={previewUnavailable}
              >
                <ambientLight intensity={1.5} />
                <directionalLight position={[4, 5, 4]} intensity={2.2} />
                <directionalLight position={[-4, 3, -3]} intensity={1.4} />
                <pointLight position={[0, -0.6, 1.5]} intensity={0.8} color="#ea580c" />
                
                <PedestalAndAvatar
                  character={character}
                  customization={customization}
                />

                <OrbitControls
                  ref={controlsRef}
                  target={[0, 0.2, 0]}
                  enableZoom={false}
                  enablePan={false}
                  minPolarAngle={Math.PI / 2.4}
                  maxPolarAngle={Math.PI / 1.95}
                  autoRotate={autoRotate}
                  autoRotateSpeed={2.5}
                  onStart={() => setAutoRotate(false)}
                />
              </Canvas>
            </PreviewErrorBoundary>

            {/* 3D Control Hints & Actions */}
            <div className="campus-stage-overlay-tools">
              <div className="campus-stage-rotate-group">
                <button
                  type="button"
                  className="stage-action-btn"
                  onClick={rotateLeft}
                  title="Xoay sang trái 45°"
                >
                  ⟲ Trái
                </button>
                <button
                  type="button"
                  className="stage-action-btn"
                  onClick={rotateRight}
                  title="Xoay sang phải 45°"
                >
                  ⟳ Phải
                </button>
              </div>

              <div className="campus-stage-actions">
                <button
                  type="button"
                  className={`stage-action-btn ${autoRotate ? "active" : ""}`}
                  onClick={toggleAutoRotate}
                  title={autoRotate ? "Dừng tự xoay" : "Bật tự xoay 360°"}
                >
                  {autoRotate ? "⏸ Dừng xoay" : "▶ Tự xoay"}
                </button>
                <button
                  type="button"
                  className="stage-action-btn"
                  onClick={viewFront}
                  title="Xem mặt trước"
                >
                  Mặt trước
                </button>
                <button
                  type="button"
                  className="stage-action-btn"
                  onClick={viewBack}
                  title="Xem mặt sau (balo, tóc)"
                >
                  Mặt sau
                </button>
              </div>
            </div>

            {/* Current Character Floating Tag */}
            <div className="campus-stage-char-tag">
              <span className="char-tag-gender">Nhân vật</span>
              <strong className="char-tag-name">{character === "male" ? "Nam" : "Nữ"}</strong>
            </div>
          </div>
        </div>

        {/* Right: Customization & Character Details Panel */}
        <div className="campus-custom-panel">
          {/* Gender Selector Cards */}
          <div className="campus-gender-selector">
            <span className="custom-section-label">1. Chọn giới tính</span>
            <div className="gender-cards-grid">
              <button
                type="button"
                className={`gender-card-btn ${character === "male" ? "selected" : ""}`}
                onClick={() => handleSelectCharacter("male")}
              >
                <div className="gender-card-icon">👦</div>
                <div className="gender-card-info">
                  <strong>Nam</strong>
                </div>
                {character === "male" && <span className="gender-card-check">✓</span>}
              </button>

              <button
                type="button"
                className={`gender-card-btn ${character === "female" ? "selected" : ""}`}
                onClick={() => handleSelectCharacter("female")}
              >
                <div className="gender-card-icon">👧</div>
                <div className="gender-card-info">
                  <strong>Nữ</strong>
                </div>
                {character === "female" && <span className="gender-card-check">✓</span>}
              </button>
            </div>
          </div>

          {/* Wardrobe Customization Box */}
          <div className="campus-wardrobe-box">
            <div className="wardrobe-header">
              <span className="custom-section-label">2. Tùy biến diện mạo</span>
              <div className="wardrobe-tabs">
                <button
                  type="button"
                  className={`wardrobe-tab-btn ${activeTab === "outfit" ? "active" : ""}`}
                  onClick={() => setActiveTab("outfit")}
                >
                  👕 Trang phục
                </button>
                <button
                  type="button"
                  className={`wardrobe-tab-btn ${activeTab === "accessory" ? "active" : ""}`}
                  onClick={() => setActiveTab("accessory")}
                >
                  👓 Phụ kiện
                </button>
                <button
                  type="button"
                  className={`wardrobe-tab-btn ${activeTab === "hair" ? "active" : ""}`}
                  onClick={() => setActiveTab("hair")}
                >
                  💇 Màu tóc
                </button>
              </div>
            </div>

            {/* TAB: OUTFIT */}
            {activeTab === "outfit" && (
              <div className="wardrobe-content-grid">
                {OUTFIT_OPTIONS.map((outfit) => {
                  const isSelected = customization.outfit === outfit.id;
                  return (
                    <button
                      key={outfit.id}
                      type="button"
                      className={`outfit-option-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => handleOutfitChange(outfit.id)}
                    >
                      <div
                        className="outfit-swatch"
                        style={{
                          background: `linear-gradient(135deg, ${
                            character === "female" ? outfit.jacketColorFemale : outfit.jacketColorMale
                          } 60%, ${outfit.accentColor})`,
                        }}
                      />
                      <div className="outfit-meta">
                        <strong>{outfit.name}</strong>
                        <small>{outfit.desc}</small>
                      </div>
                      {isSelected && <span className="option-badge">Đang mặc</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB: ACCESSORIES */}
            {activeTab === "accessory" && (
              <div className="wardrobe-content-grid accessory-grid">
                {ACCESSORY_OPTIONS.map((acc) => {
                  const isSelected = customization.accessory === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      className={`accessory-option-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => handleAccessoryChange(acc.id)}
                    >
                      <span className="acc-icon">{acc.icon}</span>
                      <div className="acc-meta">
                        <strong>{acc.name}</strong>
                        <small>{acc.desc}</small>
                      </div>
                      {isSelected && <span className="option-badge">Đã gắn</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* TAB: HAIR COLOR */}
            {activeTab === "hair" && (
              <div className="wardrobe-content-grid hair-grid">
                {HAIR_COLOR_OPTIONS.map((hair) => {
                  const isSelected = customization.hairColor === hair.id;
                  return (
                    <button
                      key={hair.id}
                      type="button"
                      className={`hair-option-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => handleHairColorChange(hair.id)}
                    >
                      <span className="hair-color-pill" style={{ backgroundColor: hair.hex }} />
                      <span className="hair-name">{hair.name}</span>
                      {isSelected && <span className="option-badge">Chọn</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enter Map Action Button */}
          <button
            type="button"
            className="campus-enter-v2-btn"
            onClick={() => onEnter(character, customization)}
          >
            <span>VÀO KHUÔN VIÊN 3D</span>
            <span className="enter-btn-arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
