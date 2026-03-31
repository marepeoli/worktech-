import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBookmark, FaHome, FaRegCalendarAlt, FaUser, FaUsers } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";

type MeResponse = {
  sub: string;
  role: "ADMIN" | "USER";
  nome?: string;
};

type NotificationSummary = {
  nao_lidas: number;
};

export function ProfilePage() {
  const navigate = useNavigate();
  const { principal, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha_atual: "",
    nova_senha: "",
  });

  const isAthlete = principal?.role === "USER";

  useEffect(() => {
    api
      .get<MeResponse>("/auth/me")
      .then((res) => {
        setForm((prev) => ({
          ...prev,
          nome: res.data.nome ?? "",
          email: res.data.sub.startsWith("user:") ? "" : prev.email,
        }));
      })
      .catch(() => {
        setFeedback("Não foi possível carregar seus dados agora.");
      });
  }, []);

  useEffect(() => {
    api
      .get<NotificationSummary>("/notificacoes/me/resumo")
      .then((response) => setNaoLidas(typeof response.data?.nao_lidas === "number" ? response.data.nao_lidas : 0))
      .catch(() => setNaoLidas(0));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAthlete) {
      setFeedback("A atualização cadastral direta está disponível apenas para atletas.");
      return;
    }

    try {
      setSaving(true);
      const payload: Record<string, string> = {};
      if (form.nome.trim()) payload.nome = form.nome.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.nova_senha.trim()) {
        payload.senha_atual = form.senha_atual;
        payload.nova_senha = form.nova_senha;
      }

      await api.put("/atletas/me", payload);
      setFeedback("Dados atualizados com sucesso.");
      setForm((prev) => ({ ...prev, senha_atual: "", nova_senha: "" }));
    } catch {
      setFeedback("Não foi possível atualizar seus dados. Confira os campos e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "#181818", minHeight: "100vh", width: "100vw", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ width: 393, height: 852, position: "relative", background: "#212020", overflow: "hidden", borderRadius: 20, fontFamily: "Poppins, sans-serif", boxShadow: "0 0 32px 0 rgba(0,0,0,0.45)", border: "2px solid #fff" }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 393, height: 32, zIndex: 10 }}>
          <div style={{ position: "absolute", left: 35, top: 9, color: "white", fontSize: 13, fontWeight: 500 }}>16:04</div>
          <div style={{ position: "absolute", right: 24, top: 7, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "white" }}>5G</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: 20, top: 70, zIndex: 2, width: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", padding: 0, display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", fontSize: 18, fontWeight: 700, textDecoration: "underline", padding: 0, whiteSpace: "nowrap" }}>
              Perfil
            </button>
          </div>
          <div style={{ color: "#E0A443", fontSize: 14, fontWeight: 400, marginTop: 10 }}>
            Atualize seus dados cadastrais.
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
                <button onClick={logout} type="button" style={{ width: "100%", textAlign: "left", background: "transparent", color: "#d9534f", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modalidades-scroll" style={{ position: "absolute", top: 158, left: 0, right: 0, bottom: 72, overflowY: "auto", padding: "0 20px 24px" }}>
          <form onSubmit={submit} style={{ background: "#fff7e9", borderRadius: 20, padding: 18, display: "grid", gap: 10 }}>
            <label style={{ color: "#232323", fontSize: 13, fontWeight: 700 }}>
              Nome
              <input value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} style={{ marginTop: 6 }} />
            </label>

            <label style={{ color: "#232323", fontSize: 13, fontWeight: 700 }}>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} style={{ marginTop: 6 }} />
            </label>

            <label style={{ color: "#232323", fontSize: 13, fontWeight: 700 }}>
              Senha atual
              <input type="password" value={form.senha_atual} onChange={(e) => setForm((prev) => ({ ...prev, senha_atual: e.target.value }))} style={{ marginTop: 6 }} placeholder="Preencha para trocar senha" />
            </label>

            <label style={{ color: "#232323", fontSize: 13, fontWeight: 700 }}>
              Nova senha
              <input type="password" value={form.nova_senha} onChange={(e) => setForm((prev) => ({ ...prev, nova_senha: e.target.value }))} style={{ marginTop: 6 }} placeholder="Opcional" />
            </label>

            {feedback && <div style={{ color: "#6b7280", fontSize: 12 }}>{feedback}</div>}

            <button type="submit" disabled={saving} style={{ marginTop: 6, background: "#43E07E", color: "#fff", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 700 }}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
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
