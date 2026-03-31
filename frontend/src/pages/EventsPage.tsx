import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBookmark, FaHome, FaInstagram, FaRegCalendarAlt, FaUser, FaUsers } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  location: string;
};

type EventCard = EventItem & {
  image: string;
};

type EventCardBase = {
  title: string;
  description: string;
  date: string;
  location: string;
  image: string;
};

type NotificationSummary = {
  nao_lidas: number;
};

const INSTAGRAM_URL = "https://www.instagram.com/vampperformance?igsh=dmwyZTNwM3pheGcy";

const EVENT_CARD_BASES: EventCardBase[] = [
  {
    title: "Próximo Intervamp XII",
    description: "Acompanhe a próxima edição do Intervamp e fique de olho nas inscrições.",
    date: "2026-09-14",
    location: "Vamp Performance",
    image: "/XIintervamp.png",
  },
  {
    title: "XI Intervamp",
    description: "Evento tradicional da Vamp com integração, jogos e desafios esportivos.",
    date: "2025-12-14",
    location: "Quadras A e B",
    image: "/XIintervamp.png",
  },
  {
    title: "X Intervamp",
    description: "Edição histórica com muita disputa e participação das modalidades da casa.",
    date: "2025-07-14",
    location: "Quadra Central",
    image: "/intervampx.png",
  },
  {
    title: "IX Intervamp",
    description: "Mais um encontro entre atletas da Vamp com clima de festival esportivo.",
    date: "2025-05-15",
    location: "Arena VAMP",
    image: "/eventos1.png",
  },
  {
    title: "VIII Intervamp",
    description: "Edição especial com participação ampliada e atividades para toda a comunidade.",
    date: "2025-03-10",
    location: "Centro Esportivo",
    image: "/viiiintervamp.png",
  },
  {
    title: "Basquete Experience",
    description: "Vivência especial com foco em integração, técnica e jogos amistosos.",
    date: "2025-02-01",
    location: "Quadra de Basquete",
    image: "/basquete-card.png",
  },
  {
    title: "Evento Especial Vamp",
    description: "Programação sazonal com novidades, ativações e experiências da comunidade.",
    date: "2025-01-10",
    location: "Vamp Performance",
    image: "/eventos2.png",
  },
];

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function EventsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    api
      .get<EventItem[]>("/events")
      .then((response) => setEvents(Array.isArray(response.data) ? response.data : []))
      .catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    api
      .get<NotificationSummary>("/notificacoes/me/resumo")
      .then((response) => setNaoLidas(typeof response.data?.nao_lidas === "number" ? response.data.nao_lidas : 0))
      .catch(() => setNaoLidas(0));
  }, []);

  const cards = useMemo<EventCard[]>(
    () =>
      EVENT_CARD_BASES.map((base, index) => {
        const event = events[index];
        return {
          id: event?.id ?? index + 1000,
          title: event?.title ?? base.title,
          description: event?.description ?? base.description,
          date: event?.date ?? base.date,
          location: event?.location ?? base.location,
          image: base.image,
        };
      }),
    [events]
  );

  return (
    <div style={{ background: "#181818", minHeight: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ width: 393, height: 852, position: "relative", background: "#212020", overflow: "hidden", borderRadius: 20, fontFamily: "Poppins, sans-serif", boxShadow: "0 0 32px 0 rgba(0,0,0,0.45)", border: "2px solid #fff" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 393, height: 32, zIndex: 10 }}>
          <div style={{ position: "absolute", left: 35, top: 9, color: "white", fontSize: 13, fontWeight: 500 }}>16:04</div>
          <div style={{ position: "absolute", right: 24, top: 7, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "white" }}>5G</span>
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M2 7C5 4 13 4 16 7" stroke="white" strokeWidth="1.5" fill="none" /><path d="M5 10C7 8 11 8 13 10" stroke="white" strokeWidth="1.5" fill="none" /><circle cx="9" cy="13" r="1.5" fill="white" /></svg>
            <svg width="22" height="12" viewBox="0 0 22 12"><rect x="1" y="2" width="18" height="8" rx="2" fill="none" stroke="white" strokeWidth="1.5" /><rect x="19.5" y="4.5" width="2" height="3" rx="0.5" fill="white" /></svg>
          </div>
        </div>

        <div style={{ position: "absolute", left: 20, top: 70, zIndex: 2, width: 250 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", padding: 0, display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", fontSize: 18, fontWeight: 700, textDecoration: "underline", padding: 0, textTransform: "capitalize", whiteSpace: "nowrap" }}>
              Eventos
            </button>
          </div>
          <div style={{ color: "#E0A443", fontSize: 16, fontWeight: 400, marginTop: 10 }}>
            Se liga no Intervamp!
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8, color: "#E0A443", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
          >
            <FaInstagram size={14} /> Instagram da Vamp
          </a>
        </div>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 22, paddingTop: 2 }}>
            {cards.map((card, index) => (
              <article key={card.id} style={{ width: 323, minHeight: 108, borderRadius: 24, background: index === 0 ? "#fff7e9" : "#f7f8fb", boxShadow: "0 8px 24px rgba(0,0,0,0.22)", display: "grid", gridTemplateColumns: "1.18fr 1fr", overflow: "hidden", alignSelf: "center" }}>
                <div style={{ padding: "16px 18px 14px" }}>
                  <h2 style={{ margin: 0, color: "#232323", fontSize: 17, fontWeight: 700, lineHeight: 1.05 }}>{card.title}</h2>
                  <p style={{ margin: "10px 0 4px", color: index === 0 ? "#E0A443" : "#6b7280", fontSize: 11, lineHeight: 1.2 }}>{formatDate(card.date)} • {card.location}</p>
                  <p style={{ margin: 0, color: "#7b7b7b", fontSize: 10.5, lineHeight: 1.2 }}>{card.description || "Evento especial da Vamp Performance."}</p>
                </div>
                <div style={{ position: "relative", minHeight: 108, background: "#d8d8d8" }}>
                  <img
                    src={card.image}
                    alt={card.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(33,32,32,0.04) 0%, rgba(33,32,32,0.18) 100%)" }} />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div style={{ width: 393, height: 59, left: 0, bottom: 0, position: "absolute", background: "#E0A443", borderRadius: "0 0 20px 20px", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <FaHome color="#fff" size={27} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
          <FaRegCalendarAlt color="#fff" size={29} style={{ cursor: "pointer" }} />
          <FaBookmark color="#fff" size={28} style={{ cursor: "pointer" }} onClick={() => navigate("/eventos")} />
          <FaUsers color="#fff" size={31} style={{ cursor: "pointer" }} onClick={() => navigate("/modalidades")} />
        </div>
      </div>
    </div>
  );
}