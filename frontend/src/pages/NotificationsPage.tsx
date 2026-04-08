import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBookmark, FaHome, FaRegCalendarAlt, FaUser, FaUsers } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";

type NotificationItem = {
  referencia: string;
  tipo: "evento" | "recomendacao";
  titulo: string;
  descricao: string;
  destino?: string;
  lida: boolean;
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const naoLidas = notifications.filter((item) => !item.lida).length;

  useEffect(() => {
    api
      .get<NotificationItem[]>("/notificacoes/me")
      .then((res) => {
        setNotifications(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        setNotifications([]);
      });
  }, []);

  async function toggleLida(item: NotificationItem) {
    const previous = notifications;
    const next = previous.map((current) =>
      current.referencia === item.referencia ? { ...current, lida: !current.lida } : current
    );
    setNotifications(next);

    try {
      if (item.lida) {
        await api.delete(`/notificacoes/me/${encodeURIComponent(item.referencia)}`);
      } else {
        await api.post("/notificacoes/me/marcar-lida", { referencia: item.referencia });
      }
    } catch {
      setNotifications(previous);
    }
  }

  function abrirNotificacao(item: NotificationItem) {
    if (item.destino) navigate(item.destino);
    if (!item.lida) {
      void toggleLida(item);
    }
  }

  async function marcarTodasComoLidas() {
    const previous = notifications;
    const next = previous.map((item) => ({ ...item, lida: true }));
    setNotifications(next);

    try {
      await api.post("/notificacoes/me/marcar-todas-lidas");
    } catch {
      setNotifications(previous);
    }
  }

  return (
    <div style={{ background: "#181818", minHeight: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ width: 393, height: 852, position: "relative", background: "#212020", overflow: "hidden", borderRadius: 20, fontFamily: "Poppins, sans-serif", boxShadow: "0 0 32px 0 rgba(0,0,0,0.45)", border: "2px solid #fff" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 393, height: 32, zIndex: 10 }}>
          <div style={{ position: "absolute", left: 35, top: 9, color: "white", fontSize: 13, fontWeight: 500 }}>16:04</div>
          <div style={{ position: "absolute", right: 24, top: 7, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "white" }}>5G</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: 20, top: 70, zIndex: 2, width: 300 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", padding: 0, display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", fontSize: 18, fontWeight: 700, textDecoration: "none", padding: 0, whiteSpace: "nowrap" }}>
              Notificações
            </button>
          </div>
          <div style={{ color: "#E0A443", fontSize: 14, fontWeight: 400, marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Atualizações mais recentes para você.
          </div>
        </div>

        <div style={{ position: "absolute", right: 20, top: 68, display: "flex", alignItems: "center", gap: 14, zIndex: 2001 }}>
          <div style={{ position: "relative" }}>
            <FaBell color="#43E07E" size={22} />
            {naoLidas > 0 && (
              <div style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 99, background: "#d9534f", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {naoLidas > 9 ? "9+" : naoLidas}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <FaUser color="#43E07E" size={22} style={{ cursor: "pointer" }} onClick={() => setShowUserMenu((value) => !value)} />
            {showUserMenu && (
              <div style={{ position: "absolute", top: 30, right: 0, background: "#232323", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.28)", minWidth: 150, zIndex: 3000, padding: "10px 0" }}>
                <button onClick={() => navigate("/perfil")} type="button" style={{ width: "100%", textAlign: "left", background: "transparent", color: "#43E07E", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}>
                  Perfil
                </button>
                <button onClick={logout} type="button" style={{ width: "100%", textAlign: "left", background: "transparent", color: "#d9534f", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modalidades-scroll" style={{ position: "absolute", top: 158, left: 0, right: 0, bottom: 72, overflowY: "auto", padding: "0 20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => void marcarTodasComoLidas()}
              style={{
                background: "#43E07E",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Marcar todas como lidas
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {notifications.length === 0 ? (
              <div style={{ color: "#ddd", fontSize: 13, fontStyle: "italic" }}>Nenhuma notificação por enquanto.</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.referencia}
                  style={{
                    borderRadius: 16,
                    background: item.tipo === "evento" ? "#fff7e9" : "#f7f8fb",
                    padding: "14px 16px",
                    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
                  }}
                >
                  <div style={{ color: item.tipo === "evento" ? "#E0A443" : "#43E07E", fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
                    {item.tipo === "evento" ? "Evento" : "Recomendação"} {item.lida ? "• Lida" : "• Não lida"}
                  </div>
                  <div style={{ color: "#232323", fontSize: 15, fontWeight: 700 }}>{item.titulo}</div>
                  <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4, lineHeight: 1.3 }}>{item.descricao}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => abrirNotificacao(item)}
                      style={{
                        background: item.tipo === "evento" ? "#E0A443" : "#43E07E",
                        color: "white",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleLida(item)}
                      style={{
                        background: "#232323",
                        color: "white",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {item.lida ? "Marcar não lida" : "Marcar lida"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ width: 393, height: 59, left: 0, bottom: 0, position: "absolute", background: "#E0A443", borderRadius: "0 0 20px 20px", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <FaHome color="#fff" size={27} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
          <FaRegCalendarAlt color="#fff" size={29} style={{ cursor: "pointer" }} onClick={() => navigate("/checkin")} />
          <FaBookmark color="#fff" size={28} style={{ cursor: "pointer" }} onClick={() => navigate("/eventos")} />
          <FaUsers color="#fff" size={31} style={{ cursor: "pointer" }} onClick={() => navigate("/modalidades")} />
        </div>
      </div>
    </div>
  );
}
