import { apiClient } from "../../services/api";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { getStoreCatalog, getStoreItem, redeemItem, type StoreItem } from "../../api/storeApi";
import { getInventory, setEquipment } from "../../api/inventoryApi";
import bannerCat from "../../assets/banner-cat.png";
import "./RewardStorePage.css";

const categories: Record<string, string> = {
  BADGE: "Huy hiệu",
  AVATAR_FRAME: "Khung đại diện",
  THEME: "Giao diện",
  AVATAR: "Ảnh đại diện",
  MATERIAL: "Tài liệu CNTT",
};
const errorText = (e: unknown) =>
  axios.isAxiosError(e) && (e.response?.status ?? 500) < 500
    ? e.response?.data?.message || "Không thể tải dữ liệu. Vui lòng thử lại."
    : "Không thể hoàn tất thao tác. Vui lòng thử lại.";
export function RewardStorePage() {
  const inventoryMode = useLocation().pathname === "/inventory";
  return (
    <RewardView
      key={String(inventoryMode)}
      inventoryMode={inventoryMode}
    />
  );
}
function RewardView({ inventoryMode }: { inventoryMode: boolean }) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<StoreItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("");
  const requestKey = useRef("");
  const detailVersion = useRef(0);
  async function load() {
    setLoading(true);
    setItems([]);
    setError("");
    try {
      if (inventoryMode) setItems(await getInventory());
      else {
        const data = await getStoreCatalog();
        setItems(data.items);
        setBalance(data.balance);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    detailVersion.current++;
    setSelected(null);
    setConfirming(false);
    setCategory("");
    setNotice("");
    void load();
  }, [inventoryMode]);
  async function open(item: StoreItem) {
    const version = ++detailVersion.current;
    setError("");
    setBusy(true);
    setConfirming(false);
    try {
      const detail = inventoryMode ? item : await getStoreItem(item.id);
      if (version === detailVersion.current) setSelected(detail);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function prepare() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const current = await getStoreItem(selected.id);
      setSelected(current);
      if (
        current.owned ||
        current.status !== "ACTIVE" ||
        current.balance == null ||
        current.balance < current.coin_price
      )
        return;
      requestKey.current = crypto.randomUUID();
      setConfirming(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function redeem() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await redeemItem(selected.id, selected.coin_price, requestKey.current);
      setNotice(
        `Đổi ${selected.name} thành công! Đã dùng ${result.amount.toLocaleString("vi-VN")} xu. Còn lại ${result.balance.toLocaleString("vi-VN")} xu. Mã giao dịch: ${result.reference}.`,
      );
      setSelected(null);
      setConfirming(false);
      await load();
    } catch (e) {
      setError(errorText(e));
      // Preserve the key after uncertain network/server failures so Retry recovers the same exchange.
      if (axios.isAxiosError(e) && e.response && e.response.status < 500) {
        setConfirming(false);
        try {
          setSelected(await getStoreItem(selected.id));
        } catch {
          setSelected(null);
        }
      }
    } finally {
      setBusy(false);
    }
  }
  async function equip() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      if (selected.item_type === "MATERIAL") {
        const { data } = await apiClient.get<{ url: string }>(`/inventory/${selected.id}/material`);
        const url = new URL(data.url);
        if (!["https:", "http:"].includes(url.protocol)) throw new Error("URL");
        window.location.assign(url.href);
      } else {
        const updated = await setEquipment(selected.id, !selected.is_equipped);
        setItems(updated);
        setSelected(updated.find((i) => i.id === selected.id) || null);
        window.dispatchEvent(new Event("equipment-changed"));
        setNotice("Đã cập nhật trang bị.");
      }
    } catch (e) {
      setError(errorText(e));
      try {
        setItems(await getInventory());
      } catch {
        /* Keep the previous equipment on retrieval failure. */
      }
    } finally {
      setBusy(false);
    }
  }
  const owned = selected?.owned;
  const reason =
    selected && !inventoryMode
      ? owned
        ? "Bạn đã sở hữu vật phẩm này."
        : selected.status !== "ACTIVE"
          ? "Vật phẩm hiện không được mở bán."
          : selected.balance == null
            ? "Chưa lấy được số dư xu. Vui lòng thử lại trước khi đổi."
            : selected.balance < selected.coin_price
              ? `Bạn cần thêm ${(selected.coin_price - selected.balance).toLocaleString("vi-VN")} xu để đổi vật phẩm này.`
              : ""
      : "";
  return (
    <section className="reward-store">
      <header className="reward-heading">
        <div>
          <Link
            to="/home"
            className="reward-back"
          >
            ← Trang chủ
          </Link>
          <h1>{inventoryMode ? "Kho vật phẩm" : "Cửa hàng đổi quà"}</h1>
        </div>
        {!inventoryMode && (
          <div className="reward-balance">
            🪙{" "}
            <strong>
              {balance == null ? "Chưa có số dư" : `${balance.toLocaleString("vi-VN")} xu`}
            </strong>
          </div>
        )}
      </header>
      <nav
        className="reward-tabs"
        aria-label="Cửa hàng và kho vật phẩm"
      >
        <Link
          className={!inventoryMode ? "active" : ""}
          to="/store"
        >
          Cửa hàng
        </Link>
        <Link
          className={inventoryMode ? "active" : ""}
          to="/inventory"
        >
          Vật phẩm của tôi
        </Link>
      </nav>
      <Link to="/coins">Lịch sử xu</Link>
      {!inventoryMode && (
        <div className="reward-banner">
          <div>
            <span className="reward-eyebrow">CỬA HÀNG J-TECH</span>
            <h2>Góc quà tặng của bạn</h2>
            <p>
              Dùng xu tích lũy để đổi vật phẩm yêu thích
              <br />
              và làm mới góc học tập của bạn.
            </p>
            <Link to="/inventory">Xem kho vật phẩm →</Link>
          </div>
          <img
            src={bannerCat}
            alt="Mèo đồng hành J-Tech"
          />
        </div>
      )}
      {notice && (
        <div
          className="reward-notice"
          role="status"
        >
          {notice} <Link to="/inventory">Mở kho vật phẩm →</Link>
        </div>
      )}
      {error && (
        <div
          className="reward-error"
          role="alert"
        >
          {error}{" "}
          <button
            onClick={() => void load()}
            disabled={busy}
          >
            Thử lại
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Đang tải vật phẩm...</p>
      ) : items.length === 0 && error ? null : (
        <>
          {items.length === 0 ? (
            <div className="reward-empty">
              <span>🎁</span>
              <h2>
                {inventoryMode ? "Kho vật phẩm của bạn đang trống" : "Chưa có vật phẩm được mở bán"}
              </h2>
              <p>
                {inventoryMode
                  ? "Ghé cửa hàng để chọn vật phẩm bạn yêu thích."
                  : "Vui lòng quay lại sau."}
              </p>
              {inventoryMode && <Link to="/store">Đến cửa hàng →</Link>}
            </div>
          ) : (
            <>
              <div
                className="reward-filters"
                aria-label="Loại vật phẩm"
              >
                <button
                  className={!category ? "active" : ""}
                  onClick={() => setCategory("")}
                >
                  Tất cả
                </button>
                {Object.entries(categories)
                  .filter(([key]) => items.some((i) => i.item_type === key))
                  .map(([key, label]) => (
                    <button
                      key={key}
                      className={category === key ? "active" : ""}
                      onClick={() => setCategory(key)}
                    >
                      {label}
                    </button>
                  ))}
              </div>
              {Object.entries(categories)
                .filter(
                  ([key]) =>
                    (!category || category === key) && items.some((i) => i.item_type === key),
                )
                .map(([key, label]) => (
                  <section
                    className="reward-collection"
                    key={key}
                  >
                    <h2>{label}</h2>
                    <div className="reward-grid">
                      {items
                        .filter((i) => i.item_type === key)
                        .map((item) => (
                          <button
                            key={item.id}
                            className={`reward-card ${item.is_equipped ? "equipped" : ""}`}
                            onClick={() => void open(item)}
                            disabled={busy}
                          >
                            <div className={`reward-preview reward-type-${key}`}>
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="lazy"
                              />
                              {!inventoryMode && (
                                <span
                                  className="reward-lock"
                                  aria-label="Xem chi tiết"
                                >
                                  ⌕
                                </span>
                              )}
                            </div>
                            <h3>{item.name}</h3>
                            <span className="reward-price">
                              {inventoryMode
                                ? item.is_equipped
                                  ? "✓ Đang sử dụng"
                                  : "Đã sở hữu"
                                : item.owned
                                  ? "Đã sở hữu"
                                  : `🪙 ${item.coin_price.toLocaleString("vi-VN")} xu`}
                            </span>
                            {inventoryMode && item.status !== "ACTIVE" && (
                              <small>Đã ẩn khỏi cửa hàng</small>
                            )}
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
            </>
          )}
        </>
      )}
      {selected && (
        <div
          className="reward-overlay"
          onClick={() => {
            if (!busy) {
              setSelected(null);
              setConfirming(false);
            }
          }}
        >
          <section
            className="reward-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setSelected(null);
            }}
          >
            <button
              autoFocus
              className="reward-close"
              aria-label="Đóng"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <img
              className="reward-detail-image"
              src={selected.image_url}
              alt={selected.name}
            />
            <span className="reward-eyebrow">{categories[selected.item_type]}</span>
            <h2 id="reward-title">{confirming ? "Xác nhận đổi vật phẩm" : selected.name}</h2>
            {confirming && <h3>{selected.name}</h3>}
            <p>{selected.description}</p>
            {!inventoryMode && (
              <p className="reward-detail-price">
                🪙 {selected.coin_price.toLocaleString("vi-VN")} xu
              </p>
            )}
            {reason && <p role="status">{reason}</p>}
            {confirming && (
              <p>
                Số dư sau khi đổi:{" "}
                <strong>
                  {((selected.balance ?? 0) - selected.coin_price).toLocaleString("vi-VN")} xu
                </strong>
              </p>
            )}
            {error && (
              <p
                className="reward-error"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="reward-actions">
              <button
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setConfirming(false);
                }}
              >
                {" "}
                {confirming ? "Hủy" : "Đóng"}
              </button>
              {inventoryMode ? (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void equip()}
                >
                  {busy
                    ? "Đang xử lý..."
                    : selected.item_type === "MATERIAL"
                      ? "Mở tài liệu"
                      : selected.is_equipped
                        ? "Tháo vật phẩm"
                        : "Trang bị"}
                </button>
              ) : owned ? (
                <Link to="/inventory">Đến kho vật phẩm</Link>
              ) : (
                <button
                  className="primary"
                  disabled={busy || (!!reason && !reason.startsWith("Chưa lấy"))}
                  onClick={() => void (confirming ? redeem() : prepare())}
                >
                  {busy ? "Đang xử lý..." : confirming ? "Xác nhận đổi" : "Đổi vật phẩm"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

