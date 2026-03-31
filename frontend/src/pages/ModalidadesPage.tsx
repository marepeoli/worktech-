import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBookmark, FaHome, FaRegCalendarAlt, FaUser, FaUsers } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";

type ModalidadeInfo = {
  modalidade: string;
  dias_semana: string[];
  horarios: string[];
  locais: string[];
  descricao: string;
};

type ModalidadeBase = {
  modalidade: string;
  descricao: string;
  image: string;
};

type NotificationSummary = {
  nao_lidas: number;
};

const MODALIDADES_BASE: ModalidadeBase[] = [
  {
    modalidade: "Basquete",
    descricao: "Treinos e jogos voltados para fundamentos, movimentação e trabalho em equipe.",
    image: "/basquete_modalidades.png",
  },
  {
    modalidade: "Futsal",
    descricao: "Turmas com foco em passe, finalização, posicionamento e ritmo de jogo.",
    image: "/futsal_modalidades.png",
  },
  {
    modalidade: "Vôlei",
    descricao: "Atividades para saque, recepção, distribuição e leitura de quadra.",
    image: "/volei_modalidades.png",
  },
  {
    modalidade: "Volei de Praia",
    descricao: "Treinos para areia com foco em resistência, controle e dinâmica em dupla.",
    image: "/voleipraia_modalidades.png",
  },
  {
    modalidade: "Performance",
    descricao: "Sessões físicas para força, mobilidade, preparo e evolução esportiva.",
    image: "/performance_modalidades.png",
  },
];

const IMAGE_BY_MODALIDADE: Record<string, string> = {
  Futsal: "/futsal_modalidades.png",
  "Futsal Masculino": "/futsal_modalidades.png",
  "Futsal Feminino": "/futsal_modalidades.png",
  Vôlei: "/volei_modalidades.png",
  Volei: "/volei_modalidades.png",
  "Vôlei Quadra": "/volei_modalidades.png",
  "Volei Quadra": "/volei_modalidades.png",
  "Volei de Praia": "/voleipraia_modalidades.png",
  "Vôlei de Praia": "/voleipraia_modalidades.png",
  "Alta Performance": "/performance_modalidades.png",
};

const COLOR_BY_MODALIDADE: Record<string, string> = {
  Basquete: "linear-gradient(135deg, #fff3d8 0%, #f4d697 100%)",
  Futsal: "linear-gradient(135deg, #f6f7fb 0%, #e7eaf6 100%)",
  Vôlei: "linear-gradient(135deg, #f2f6ff 0%, #dae8ff 100%)",
  Volei: "linear-gradient(135deg, #f2f6ff 0%, #dae8ff 100%)",
  "Volei de Praia": "linear-gradient(135deg, #eef7ff 0%, #d9ebff 100%)",
  "Vôlei de Praia": "linear-gradient(135deg, #eef7ff 0%, #d9ebff 100%)",
  Performance: "linear-gradient(135deg, #f4f4f4 0%, #ddd4c5 100%)",
  "Vôlei Quadra": "linear-gradient(135deg, #f2f6ff 0%, #dae8ff 100%)",
  "Volei Quadra": "linear-gradient(135deg, #f2f6ff 0%, #dae8ff 100%)",
  "Alta Performance": "linear-gradient(135deg, #f4f4f4 0%, #ddd4c5 100%)",
  "Futsal Feminino": "linear-gradient(135deg, #f6f7fb 0%, #e7eaf6 100%)",
  "Futsal Masculino": "linear-gradient(135deg, #f6f7fb 0%, #e7eaf6 100%)",
};

function normalizarModalidade(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarLista(lista: string[]): string {
  if (lista.length <= 1) {
    return lista[0] ?? "";
  }
  if (lista.length === 2) {
    return `${lista[0]} e ${lista[1]}`;
  }
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

export function ModalidadesPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [modalidades, setModalidades] = useState<ModalidadeInfo[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    api
      .get<ModalidadeInfo[]>("/modalidades")
      .then((response) => setModalidades(Array.isArray(response.data) ? response.data : []))
      .catch(() => setModalidades([]));
  }, []);

  useEffect(() => {
    api
      .get<NotificationSummary>("/notificacoes/me/resumo")
      .then((response) => setNaoLidas(typeof response.data?.nao_lidas === "number" ? response.data.nao_lidas : 0))
      .catch(() => setNaoLidas(0));
  }, []);

  const cards = useMemo(
    () => {
      const baseByKey = new Map(
        MODALIDADES_BASE.map((base) => [normalizarModalidade(base.modalidade), base] as const)
      );

      const extras = modalidades
        .filter((item) => !baseByKey.has(normalizarModalidade(item.modalidade)))
        .map((item) => ({
          modalidade: item.modalidade,
          descricao: item.descricao,
          image: IMAGE_BY_MODALIDADE[item.modalidade] ?? "/vamp_logo.png",
        }));

      const allModalidades = [...MODALIDADES_BASE, ...extras];

      return allModalidades.map((base) => {
      const modalidadeApi = modalidades.find(
        (item) => normalizarModalidade(item.modalidade) === normalizarModalidade(base.modalidade)
      );

      const modalidadeNome = modalidadeApi?.modalidade ?? base.modalidade;
      const image = IMAGE_BY_MODALIDADE[modalidadeNome] ?? base.image;
      const background = COLOR_BY_MODALIDADE[modalidadeNome] ?? COLOR_BY_MODALIDADE[base.modalidade] ?? "linear-gradient(135deg, #f7f7f7 0%, #e6e6e6 100%)";
      const dias = modalidadeApi?.dias_semana?.length ? formatarLista(modalidadeApi.dias_semana) : "Dias em atualização";
      const horarios = modalidadeApi?.horarios?.length ? modalidadeApi.horarios.join(" • ") : "Horários em atualização";
      const locais = modalidadeApi?.locais?.length ? formatarLista(modalidadeApi.locais) : "Consulte a equipe VAMP";

      return {
        modalidade: base.modalidade,
        descricao: modalidadeApi?.descricao ?? base.descricao,
        image,
        background,
        resumo: `${dias} • ${horarios}`,
        localTexto: locais,
      };
    });
    },
    [modalidades]
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
              Modalidades
            </button>
          </div>
          <div style={{ color: "#E0A443", fontSize: 16, fontWeight: 400, marginTop: 10 }}>
            Esporte é para todos!
          </div>
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
            {cards.map((card) => (
              <article key={card.modalidade} style={{ width: 323, minHeight: 108, borderRadius: 24, background: card.background, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", display: "grid", gridTemplateColumns: "1.25fr 1fr", overflow: "hidden", alignSelf: "center" }}>
                <div style={{ padding: "16px 18px 14px" }}>
                  <h2 style={{ margin: 0, color: "#232323", fontSize: 17, fontWeight: 700 }}>{card.modalidade}</h2>
                  <p style={{ margin: "10px 0 4px", color: "#555", fontSize: 11, lineHeight: 1.2 }}>{card.resumo}</p>
                  <p style={{ margin: "0 0 4px", color: "#6c6c6c", fontSize: 11, lineHeight: 1.2 }}>Local: {card.localTexto}</p>
                  <p style={{ margin: 0, color: "#7b7b7b", fontSize: 10.5, lineHeight: 1.2 }}>{card.descricao}</p>
                </div>
                <div style={{ position: "relative", minHeight: 108, background: "#d8d8d8" }}>
                  <img src={card.image} alt={card.modalidade} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(33,32,32,0.04) 0%, rgba(33,32,32,0.18) 100%)" }} />
                </div>
              </article>
            ))}
          </div>
        </div>

        <div style={{ width: 393, height: 59, left: 0, bottom: 0, position: "absolute", background: "#E0A443", borderRadius: "0 0 20px 20px", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <FaHome color="#fff" size={27} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
          <FaRegCalendarAlt color="#fff" size={29} style={{ cursor: "pointer" }} />
          <FaBookmark color="#fff" size={28} style={{ cursor: "pointer" }} />
          <FaUsers color="#fff" size={31} style={{ cursor: "pointer" }} onClick={() => navigate("/modalidades")} />
        </div>
      </div>
    </div>
  );
}