import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser, FaBell, FaPlay, FaHome, FaBookmark,
  FaRegCalendarAlt, FaUsers, FaSignOutAlt,
} from "react-icons/fa";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/http";

type DiaSabado = {
  id: number;
  dia: number;
  mes: number;
  ano: number;
  local: string;
  horario: string;
  modalidade: string;
  vagas_disponiveis: number;
};

type CheckinItem = {
  id: number;
  usuario_id: number;
  treino_id: number;
  cancelado?: boolean;
};

type NotificationSummary = {
  nao_lidas: number;
};

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const maybeResponse = error as { response?: { data?: { detail?: string } } };
    if (maybeResponse.response?.data?.detail) return maybeResponse.response.data.detail;
  }
  return "Não foi possível concluir a ação. Tente novamente.";
}

const DICAS = [
  {
    id: 1,
    title: "Técnicas de Futsal",
    duration: "12 min",
    thumbnail: "https://img.youtube.com/vi/_fEriKJHunc/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=_fEriKJHunc",
  },
  {
    id: 2,
    title: "Fundamentos do Vôlei",
    duration: "8 min",
    thumbnail: "https://img.youtube.com/vi/OG3fQFegdZA/maxresdefault.jpg",
    url: "https://www.youtube.com/watch?v=OG3fQFegdZA&pp=ygULdm9sZWkgcGFzc2U%3D",
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { principal, logout } = useAuth();
  const isAdmin = principal?.role === "ADMIN";
  const isProfessor = principal?.role === "PROFESSOR";
  const nomeExibicao = principal?.nome ?? (principal?.role === "ADMIN" ? "Admin" : "Atleta");

  const [diasCheckin, setDiasCheckin] = useState<DiaSabado[]>([]);
  const [checkinFeitos, setCheckinFeitos] = useState<number[]>([]);
  const [modalCheckin, setModalCheckin] = useState<DiaSabado | null>(null);
  const [modalCancelar, setModalCancelar] = useState<DiaSabado | null>(null);
  const [zoomCardId, setZoomCardId] = useState<number | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);

  const checkinScrollRef = useRef<HTMLDivElement>(null);

  async function refreshCheckinsFromApi(): Promise<void> {
    const checkinsRes = await api.get<CheckinItem[]>("/checkins/me");
    setCheckinFeitos(
      Array.isArray(checkinsRes.data)
        ? checkinsRes.data.filter((item) => !item.cancelado).map((item) => item.treino_id)
        : []
    );
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      api.get<DiaSabado[]>("/admin/dias-checkin"),
      api.get<CheckinItem[]>("/checkins/me").catch(() => ({ data: [] as CheckinItem[] })),
      api.get<NotificationSummary>("/notificacoes/me/resumo").catch(() => ({ data: { nao_lidas: 0 } as NotificationSummary })),
    ])
      .then(([diasRes, checkinsRes, notificacoesRes]) => {
        if (!isMounted) return;

        setDiasCheckin(Array.isArray(diasRes.data) ? diasRes.data : []);
        setCheckinFeitos(
          Array.isArray(checkinsRes.data)
            ? checkinsRes.data.filter((item) => !item.cancelado).map((item) => item.treino_id)
            : []
        );
        setNaoLidas(typeof notificacoesRes.data?.nao_lidas === "number" ? notificacoesRes.data.nao_lidas : 0);
      })
      .catch(() => {
        if (!isMounted) return;
        setDiasCheckin([]);
        setCheckinFeitos([]);
        setNaoLidas(0);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Drag-to-scroll
  useEffect(() => {
    const el = checkinScrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    const onDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add("dragging");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onLeave = () => { isDown = false; el.classList.remove("dragging"); };
    const onUp = () => { isDown = false; el.classList.remove("dragging"); };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.2;
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mousemove", onMove);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mousemove", onMove);
    };
  }, []);

  async function confirmarCheckin(sabado: DiaSabado) {
    if (checkinFeitos.includes(sabado.id)) {
      setModalCheckin(null);
      return;
    }

    try {
      await api.post("/checkins/me", { treino_id: sabado.id });
      setCheckinFeitos((prev) => (prev.includes(sabado.id) ? prev : [...prev, sabado.id]));
      await refreshCheckinsFromApi();
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setModalCheckin(null);
    }
  }

  async function cancelarCheckin(sabado: DiaSabado) {
    try {
      await api.delete(`/checkins/me/${sabado.id}`);
      setCheckinFeitos((prev) => prev.filter((id) => id !== sabado.id));
      await refreshCheckinsFromApi();
    } catch (error) {
      window.alert(getErrorMessage(error));
    } finally {
      setModalCancelar(null);
    }
  }

  function handleCardCheckinClick(sabado: DiaSabado, feito: boolean) {
    setZoomCardId(sabado.id);
    window.setTimeout(() => {
      setZoomCardId(null);
      if (!feito) {
        setModalCheckin(sabado);
      } else {
        setModalCancelar(sabado);
      }
    }, 140);
  }

  return (
    <div style={{ background: "#181818", minHeight: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ width: 393, height: 852, position: "relative", background: "#212020", overflow: "hidden", borderRadius: 20, fontFamily: "Poppins, sans-serif", boxShadow: "0 0 32px 0 rgba(0,0,0,0.45)", border: "2px solid #fff" }}>

        {/* Status bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 393, height: 32, zIndex: 10 }}>
          <div style={{ position: "absolute", left: 35, top: 9, color: "white", fontSize: 13, fontWeight: 500 }}>16:04</div>
          <div style={{ position: "absolute", right: 24, top: 7, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "white" }}>5G</span>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 7C5 4 13 4 16 7" stroke="white" strokeWidth="1.5" fill="none"/><path d="M5 10C7 8 11 8 13 10" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="9" cy="13" r="1.5" fill="white"/></svg>
            <svg width="22" height="12" viewBox="0 0 22 12"><rect x="1" y="2" width="18" height="8" rx="2" fill="none" stroke="white" strokeWidth="1.5"/><rect x="19.5" y="4.5" width="2" height="3" rx="0.5" fill="white"/></svg>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ position: "absolute", left: 20, top: 70, zIndex: 2, width: 300 }}>
          <div style={{ fontSize: 18, color: "#43E07E", fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
            Olá, {nomeExibicao}
          </div>
          <div style={{ color: "white", fontSize: 12, fontWeight: 500, marginTop: 10, whiteSpace: "nowrap" }}>
            Fique por dentro do que acontece na Vamp!
          </div>
        </div>

        {/* Bell + User icons */}
        <div style={{ position: "absolute", right: 20, top: 68, display: "flex", alignItems: "center", gap: 14, zIndex: 2001 }}>
          <div style={{ position: "relative" }}>
            <FaBell color="#43E07E" size={22} style={{ cursor: "pointer" }} onClick={() => navigate("/notificacoes")} />
            {naoLidas > 0 && (
              <div style={{ position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 99, background: "#d9534f", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {naoLidas > 9 ? "9+" : naoLidas}
              </div>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <FaUser color="#43E07E" size={22} style={{ cursor: "pointer" }} onClick={() => setShowUserMenu((v) => !v)} />
            {showUserMenu && (
              <div style={{ position: "absolute", top: 30, right: 0, background: "#232323", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.28)", minWidth: 180, zIndex: 3000, padding: "10px 0", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "12px 20px", color: "#43E07E", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15 }}
                  onClick={() => { setShowUserMenu(false); navigate("/perfil"); }}>
                  Perfil
                </div>
                {isAdmin && (
                  <div style={{ padding: "12px 20px", color: "#E0A443", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15 }}
                    onClick={() => { setShowUserMenu(false); navigate("/admin"); }}>
                    Admin
                  </div>
                )}
                {isProfessor && (
                  <div style={{ padding: "12px 20px", color: "#FFB84D", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15 }}
                    onClick={() => { setShowUserMenu(false); navigate("/presenca"); }}>
                    Presença
                  </div>
                )}
                <div style={{ padding: "12px 20px", color: "#d9534f", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15 }}
                  onClick={logout}>
                  <FaSignOutAlt /> Sair
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Shortcuts: Check In | Modalidades | Eventos */}
        <div style={{ width: 323, left: 35, top: 150, position: "absolute", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div onClick={() => navigate("/checkin")} style={{ width: 33, height: 33, background: "#43E07E", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, cursor: "pointer" }}>
              <FaRegCalendarAlt color="#fff" size={18} />
            </div>
            <div style={{ color: "#43E07E", fontSize: 13, fontWeight: 500 }}>Check In</div>
          </div>
          <div style={{ width: 1, height: 55, background: "#43E07E", margin: "0 6px" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div onClick={() => navigate("/modalidades")} style={{ width: 33, height: 33, background: "#43E07E", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 35 35" fill="none"><rect x="3" y="3" width="29" height="29" rx="6" stroke="#fff" strokeWidth="2.5" fill="none"/><line x1="17.5" y1="3" x2="17.5" y2="32" stroke="#fff" strokeWidth="2"/><circle cx="17.5" cy="17.5" r="4" stroke="#fff" strokeWidth="2" fill="none"/></svg>
            </div>
            <div onClick={() => navigate("/modalidades")} style={{ color: "#43E07E", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Modalidades</div>
          </div>
          <div style={{ width: 1, height: 55, background: "#43E07E", margin: "0 6px" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div onClick={() => navigate("/eventos")} style={{ width: 33, height: 33, background: "#43E07E", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, cursor: "pointer" }}>
              <FaBookmark color="#fff" size={18} />
            </div>
            <div onClick={() => navigate("/eventos")} style={{ color: "#43E07E", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Eventos</div>
          </div>
        </div>

        {/* Próximos Treinos */}
        <div style={{ position: "absolute", left: 0, top: 220, width: 393, height: 170, background: "#fffbe9", borderTop: "1.5px solid #E0A443", borderBottom: "1.5px solid #E0A443", zIndex: 1, padding: "14px 0 0 0" }} />
        <div style={{ position: "absolute", left: 20, top: 228, width: "calc(100% - 20px)", zIndex: 2 }}>
          <div style={{ color: "#E0A443", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Próximos Treinos</div>
          <div ref={checkinScrollRef} className="checkin-rapido-scroll">
            {diasCheckin.length === 0 ? (
              <div style={{ color: "#999", fontSize: 12, fontStyle: "italic", paddingTop: 8 }}>Nenhum treino disponível</div>
            ) : (
              diasCheckin.map((sabado, idx) => {
                const feito = checkinFeitos.includes(sabado.id);
                return (
                  <div key={idx} style={{ minWidth: 126, maxWidth: 126, background: "linear-gradient(180deg, #fff7eb 0%, #ffeed6 100%)", borderRadius: 12, padding: "8px", display: "flex", flexDirection: "column", gap: 4, borderLeft: "4px solid #D79A2C", border: zoomCardId === sabado.id ? "1px solid rgba(176, 118, 27, 0.5)" : "1px solid rgba(176, 118, 27, 0.28)", fontFamily: "Poppins, sans-serif", alignItems: "flex-start", justifyContent: "center", boxShadow: zoomCardId === sabado.id ? "0 4px 10px rgba(119, 72, 13, 0.16)" : "0 2px 6px rgba(119, 72, 13, 0.10)", transform: zoomCardId === sabado.id ? "scale(1.04)" : "scale(1)", transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#232323" }}>{String(sabado.dia).padStart(2, "0")}/{String(sabado.mes).padStart(2, "0")}/{sabado.ano}</div>
                    <div style={{ fontSize: 9, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{sabado.local}</div>
                    <div style={{ fontSize: 9, color: "#E0A443", fontWeight: 700 }}>{sabado.horario}</div>
                    <div style={{ fontSize: 9, color: "#43E07E", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{sabado.modalidade}</div>
                    <button
                      style={{ marginTop: 4, background: feito ? "#d9534f" : "#43E07E", color: "#fff", border: "none", borderRadius: 7, padding: "5px 0", width: "100%", fontWeight: 700, fontSize: 10, cursor: "pointer", opacity: 1, fontFamily: "Poppins, sans-serif" }}
                      onClick={() => handleCardCheckinClick(sabado, feito)}
                    >
                      {feito ? "Cancelar check-in" : "Check-in"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Desafio GymRats */}
        <a href="https://www.gymrats.app/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
          <div style={{ position: "absolute", top: 409, left: 0, width: 393, height: 150, background: "#E0A443", zIndex: 1 }} />
          <div style={{ position: "absolute", top: 422, left: 28, width: 235, height: 126, background: "#1f1f23", borderRadius: 28, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
            <div style={{ transform: "translateX(-20px)" }}>
              <div style={{ color: "#E0A443", fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>
                <div>Desafio Bimestral</div>
                <div>GymRats</div>
              </div>
              <div style={{ marginTop: 10, color: "#f6f7fb", fontSize: 11, fontWeight: 500, lineHeight: 1 }}>Clique Aqui</div>
            </div>
          </div>
          <img src="/gymrats-logo.png" alt="Desafio GymRats" style={{ position: "absolute", top: 422, left: 214, width: 142, height: 126, borderRadius: 34, border: "3px solid #1F8DFF", objectFit: "cover", zIndex: 3, boxShadow: "0 12px 28px rgba(31, 141, 255, 0.22)" }} />
        </a>

        {/* Recomendações */}
        <button onClick={() => navigate("/recomendacoes")} type="button" style={{ position: "absolute", left: 20, top: 578, color: "#E0A443", fontSize: 15, fontWeight: 500, background: "transparent", padding: 0 }}>
          Recomendações
        </button>
        <button onClick={() => navigate("/recomendacoes")} type="button" style={{ position: "absolute", left: 280, top: 581, color: "white", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, background: "transparent", padding: 0 }}>
          Ver tudo <FaPlay color="#FBC343" size={10} />
        </button>
        <div style={{ position: "absolute", left: 18, top: 606, display: "flex", gap: 14 }}>
          {DICAS.map((dica) => (
            <a
              key={dica.id}
              href={dica.url}
              target="_blank"
              rel="noreferrer"
              style={{ width: 157, height: 134, borderRadius: 16, border: "1px solid white", overflow: "hidden", position: "relative", background: "#111", cursor: "pointer", textDecoration: "none", display: "block" }}
            >
              <img src={dica.thumbnail} alt={dica.title} style={{ width: "100%", height: 92, objectFit: "cover" }} />
              <div style={{ position: "absolute", left: 11, top: 96, color: "#E0A443", fontSize: 11, fontWeight: 500 }}>{dica.title}</div>
              <div style={{ position: "absolute", left: 11, top: 114, color: "white", fontSize: 11, fontWeight: 300, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ display: "inline-block", width: 9, height: 9, background: "#43E07E", borderRadius: "50%" }} />
                {dica.duration}
              </div>
            </a>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{ width: 393, height: 59, left: 0, top: 793, position: "absolute", background: "#E0A443", borderRadius: "0 0 20px 20px", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <FaHome color="#fff" size={27} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
          <FaRegCalendarAlt color="#fff" size={29} style={{ cursor: "pointer" }} onClick={() => navigate("/checkin")} />
          <FaBookmark color="#fff" size={28} style={{ cursor: "pointer" }} onClick={() => navigate("/eventos")} />
          <FaUsers color="#fff" size={31} style={{ cursor: "pointer" }} onClick={() => navigate("/modalidades")} />
        </div>

        {/* Modal confirmar check-in */}
        {modalCheckin && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#232323", borderRadius: 16, padding: "32px 28px 24px", minWidth: 300, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Poppins, sans-serif" }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#E0A443", marginBottom: 12 }}>Confirmar Check-in</div>
              <div style={{ marginBottom: 8 }}>Dia: <span style={{ color: "#43E07E", fontWeight: 700 }}>{String(modalCheckin.dia).padStart(2, "0")}/{String(modalCheckin.mes).padStart(2, "0")}/{modalCheckin.ano}</span></div>
              <div style={{ marginBottom: 8 }}>Local: <span style={{ color: "#43E07E" }}>{modalCheckin.local}</span></div>
              <div style={{ marginBottom: 18 }}>Horário: <span style={{ color: "#43E07E" }}>{modalCheckin.horario}</span></div>
              <div style={{ display: "flex", gap: 16 }}>
                <button onClick={() => setModalCheckin(null)} style={{ background: "#E0A443", color: "#232323", fontWeight: 700, border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 15, cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => confirmarCheckin(modalCheckin)} style={{ background: "#43E07E", color: "#fff", fontWeight: 700, border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 15, cursor: "pointer" }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal cancelar check-in */}
        {modalCancelar && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#232323", borderRadius: 16, padding: "32px 28px 24px", minWidth: 300, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Poppins, sans-serif" }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#E0A443", marginBottom: 12 }}>Cancelar Check-in</div>
              <div style={{ marginBottom: 18 }}>Cancelar check-in do dia <span style={{ color: "#43E07E", fontWeight: 700 }}>{String(modalCancelar.dia).padStart(2, "0")}/{String(modalCancelar.mes).padStart(2, "0")}/{modalCancelar.ano}</span>?</div>
              <div style={{ display: "flex", gap: 16 }}>
                <button onClick={() => setModalCancelar(null)} style={{ background: "#E0A443", color: "#232323", fontWeight: 700, border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 15, cursor: "pointer" }}>Voltar</button>
                <button onClick={() => cancelarCheckin(modalCancelar)} style={{ background: "#d9534f", color: "#fff", fontWeight: 700, border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 15, cursor: "pointer" }}>Cancelar Check-in</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
