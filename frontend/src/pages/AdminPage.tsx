import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBookmark, FaHome, FaRegCalendarAlt, FaUser, FaUsers } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";

type Treino = {
  id: number;
  data: string;
  hora: string;
  modalidade: string;
  local: string;
  vagas_total: number;
  vagas_disponiveis: number;
};

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  location: string;
};

type Recommendation = {
  id: number;
  title: string;
  description: string | null;
  modalidade: string | null;
  video_url: string;
};

type Athlete = {
  id: number;
  nome: string;
  email: string;
};

type MatriculaTreino = {
  id: number;
  usuario_id: number;
  modalidade: string;
  dia_semana: string;
};

function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const maybeResponse = error as { response?: { data?: { detail?: string } } };
    if (maybeResponse.response?.data?.detail) {
      return maybeResponse.response.data.detail;
    }
  }
  return "Falha ao processar a ação.";
}

export function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string>("");
  const [showModal, setShowModal] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [matriculasTreino, setMatriculasTreino] = useState<MatriculaTreino[]>([]);

  const [editingTreinoId, setEditingTreinoId] = useState<number | null>(null);
  const [treinoForm, setTreinoForm] = useState({
    data: "",
    hora: "",
    modalidade: "",
    local: "",
    vagas_total: "20",
    vagas_disponiveis: "20",
  });

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
  });

  const [editingRecommendationId, setEditingRecommendationId] = useState<number | null>(null);
  const [recommendationForm, setRecommendationForm] = useState({
    title: "",
    description: "",
    modalidade: "",
    video_url: "",
  });

  const [athleteAccessForm, setAthleteAccessForm] = useState({
    email: "",
    nome: "",
    senha_temporaria: "123456",
  });

  const [matriculaForm, setMatriculaForm] = useState({
    usuario_id: "",
    modalidade: "",
    dia_semana: "Segunda",
  });
  const [showUserMenu, setShowUserMenu] = useState(false);

  async function loadAdminData() {
    setLoading(true);
    try {
      const [treinosRes, eventsRes, recsRes, athletesRes, matriculasRes] = await Promise.all([
        api.get<Treino[]>("/admin/treinos").catch(err => { throw new Error(`Treinos: ${toErrorMessage(err)}`); }),
        api.get<EventItem[]>("/admin/events").catch(err => { throw new Error(`Eventos: ${toErrorMessage(err)}`); }),
        api.get<Recommendation[]>("/admin/recomendacoes").catch(err => { throw new Error(`Recomendações: ${toErrorMessage(err)}`); }),
        api.get<Athlete[]>("/admin/atletas").catch(err => { throw new Error(`Atletas: ${toErrorMessage(err)}`); }),
        api.get<MatriculaTreino[]>("/admin/matriculas-treino").catch(err => { throw new Error(`Matrículas: ${toErrorMessage(err)}`); }),
      ]);
      setTreinos(treinosRes.data);
      setEvents(eventsRes.data);
      setRecommendations(recsRes.data);
      setAthletes(athletesRes.data);
      setMatriculasTreino(matriculasRes.data);
      setFeedback("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : toErrorMessage(error);
      setFeedback(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const athleteOptions = useMemo(
    () => athletes.map((athlete) => ({ value: String(athlete.id), label: `${athlete.id} - ${athlete.nome} (${athlete.email})` })),
    [athletes]
  );

  async function submitTreino(event: React.FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        data: treinoForm.data,
        hora: treinoForm.hora,
        modalidade: treinoForm.modalidade,
        local: treinoForm.local,
        vagas_total: Number(treinoForm.vagas_total),
        vagas_disponiveis: Number(treinoForm.vagas_disponiveis),
      };

      if (editingTreinoId) {
        await api.put(`/admin/treinos/${editingTreinoId}`, payload);
        setFeedback("Treino atualizado com sucesso.");
      } else {
        await api.post("/admin/treinos", payload);
        setFeedback("Treino criado com sucesso.");
      }

      setEditingTreinoId(null);
      setTreinoForm({ data: "", hora: "", modalidade: "", local: "", vagas_total: "20", vagas_disponiveis: "20" });
      await loadAdminData();
    } catch (error) {
      setFeedback(toErrorMessage(error));
    }
  }

  async function submitEvent(event: React.FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        location: eventForm.location,
      };

      if (editingEventId) {
        await api.put(`/admin/events/${editingEventId}`, payload);
        setFeedback("Evento atualizado com sucesso.");
      } else {
        await api.post("/admin/events", payload);
        setFeedback("Evento criado com sucesso.");
      }

      setEditingEventId(null);
      setEventForm({ title: "", description: "", date: "", location: "" });
      await loadAdminData();
    } catch (error) {
      setFeedback(toErrorMessage(error));
    }
  }

  async function submitRecommendation(event: React.FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        title: recommendationForm.title,
        description: recommendationForm.description,
        modalidade: recommendationForm.modalidade,
        video_url: recommendationForm.video_url,
      };

      if (editingRecommendationId) {
        await api.put(`/admin/recomendacoes/${editingRecommendationId}`, payload);
        setFeedback("Recomendação atualizada com sucesso.");
      } else {
        await api.post("/admin/recomendacoes", payload);
        setFeedback("Recomendação criada com sucesso.");
      }

      setEditingRecommendationId(null);
      setRecommendationForm({ title: "", description: "", modalidade: "", video_url: "" });
      await loadAdminData();
    } catch (error) {
      setFeedback(toErrorMessage(error));
    }
  }

  async function submitAthleteAccess(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.post("/admin/atletas", athleteAccessForm);
      setFeedback("Acesso de atleta criado com sucesso.");
      setAthleteAccessForm({ email: "", nome: "", senha_temporaria: "123456" });
      await loadAdminData();
    } catch (error) {
      setFeedback(toErrorMessage(error));
    }
  }

  async function submitMatricula(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api.post("/admin/matriculas-treino", {
        usuario_id: Number(matriculaForm.usuario_id),
        modalidade: matriculaForm.modalidade,
        dia_semana: matriculaForm.dia_semana,
      });
      setFeedback("Matrícula adicionada com sucesso.");
      setMatriculaForm({ usuario_id: "", modalidade: "", dia_semana: "Segunda" });
      await loadAdminData();
    } catch (error) {
      setFeedback(toErrorMessage(error));
    }
  }

  async function removeItem(path: string, successMessage: string) {
    try {
      await api.delete(path);
      setFeedback(successMessage);
      await loadAdminData();
    } catch (error) {
      setFeedback(toErrorMessage(error));
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

        <div style={{ position: "absolute", left: 20, top: 70, zIndex: 2, width: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", padding: 0, display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => navigate("/home")} type="button" style={{ background: "transparent", color: "#43E07E", fontSize: 18, fontWeight: 700, textDecoration: "none", padding: 0, whiteSpace: "nowrap" }}>
              Painel Admin
            </button>
          </div>
          <div style={{ color: "#E0A443", fontSize: 13, fontWeight: 400, marginTop: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Gestão completa da operação Vamp.
          </div>
        </div>

        <div style={{ position: "absolute", right: 20, top: 68, display: "flex", alignItems: "center", gap: 14, zIndex: 2001 }}>
          <FaBell color="#43E07E" size={22} style={{ cursor: "pointer" }} onClick={() => navigate("/notificacoes")} />
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
          {feedback && (
            <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: "#fff7e9", color: "#232323", fontSize: 12 }}>{feedback}</div>
          )}

          {showModal ? (
            <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
              <div style={{ textAlign: "center", color: "#E0A443", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>O que deseja adicionar?</h3>
              </div>
              
              <button
                onClick={() => {
                  setSelectedSection("treino");
                  setShowModal(false);
                }}
                style={{ padding: "16px 12px", borderRadius: 12, background: "#fff7e9", border: "2px solid #E0A443", color: "#232323", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.3s" }}
              >
                ➕ Adicionar Treino/Turma
              </button>

              <button
                onClick={() => {
                  setSelectedSection("atleta");
                  setShowModal(false);
                }}
                style={{ padding: "16px 12px", borderRadius: 12, background: "#f7f8fb", border: "2px solid #4b5563", color: "#232323", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.3s" }}
              >
                ➕ Liberar Acesso de Atleta
              </button>

              <button
                onClick={() => {
                  setSelectedSection("matricula");
                  setShowModal(false);
                }}
                style={{ padding: "16px 12px", borderRadius: 12, background: "#fff7e9", border: "2px solid #E0A443", color: "#232323", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.3s" }}
              >
                ➕ Adicionar Matrícula por Dia
              </button>

              <button
                onClick={() => {
                  setSelectedSection("evento");
                  setShowModal(false);
                }}
                style={{ padding: "16px 12px", borderRadius: 12, background: "#f7f8fb", border: "2px solid #4b5563", color: "#232323", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.3s" }}
              >
                ➕ Criar Evento
              </button>

              <button
                onClick={() => {
                  setSelectedSection("recomendacao");
                  setShowModal(false);
                }}
                style={{ padding: "16px 12px", borderRadius: 12, background: "#fff7e9", border: "2px solid #E0A443", color: "#232323", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.3s" }}
              >
                ➕ Adicionar Recomendação
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <button
                onClick={() => setShowModal(true)}
                style={{ padding: "8px 12px", borderRadius: 8, background: "transparent", border: "2px solid #E0A443", color: "#E0A443", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                ◄ Voltar ao menu
              </button>

              {loading && <p style={{ margin: "0 0 10px", color: "#ddd", fontSize: 12 }}>Carregando dados...</p>}

              {selectedSection === "treino" && (
                <section style={{ borderRadius: 16, padding: 12, background: "#fff7e9", boxShadow: "0 8px 18px rgba(0,0,0,0.18)" }}>
                  <h2 style={{ margin: "0 0 8px", color: "#232323", fontSize: 15 }}>Treinos/Turmas</h2>
                  <form onSubmit={submitTreino} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <input type="date" value={treinoForm.data} onChange={(e) => setTreinoForm((p) => ({ ...p, data: e.target.value }))} required />
                    <input type="time" value={treinoForm.hora} onChange={(e) => setTreinoForm((p) => ({ ...p, hora: e.target.value }))} required />
                    <input placeholder="Modalidade" value={treinoForm.modalidade} onChange={(e) => setTreinoForm((p) => ({ ...p, modalidade: e.target.value }))} required />
                    <input placeholder="Local" value={treinoForm.local} onChange={(e) => setTreinoForm((p) => ({ ...p, local: e.target.value }))} required />
                    <input type="number" min={1} placeholder="Vagas totais" value={treinoForm.vagas_total} onChange={(e) => setTreinoForm((p) => ({ ...p, vagas_total: e.target.value }))} required />
                    <input type="number" min={0} placeholder="Vagas disponíveis" value={treinoForm.vagas_disponiveis} onChange={(e) => setTreinoForm((p) => ({ ...p, vagas_disponiveis: e.target.value }))} required />
                    <button type="submit" style={{ gridColumn: "1 / -1", background: "#43E07E", color: "#fff", borderRadius: 8, padding: "10px 12px", fontWeight: 700 }}>{editingTreinoId ? "Atualizar" : "Criar"}</button>
                  </form>
                  <div style={{ display: "grid", gap: 8 }}>
                    {treinos.map((treino) => (
                      <div key={treino.id} style={{ border: "1px solid #ecd8b0", borderRadius: 10, padding: 10, background: "#fff" }}>
                        <div style={{ color: "#232323", fontSize: 12 }}><strong>{treino.modalidade}</strong> | {treino.data} {treino.hora}</div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>{treino.local} | {treino.vagas_disponiveis}/{treino.vagas_total}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTreinoId(treino.id);
                              setTreinoForm({
                                data: treino.data,
                                hora: treino.hora,
                                modalidade: treino.modalidade,
                                local: treino.local,
                                vagas_total: String(treino.vagas_total),
                                vagas_disponiveis: String(treino.vagas_disponiveis),
                              });
                            }}
                            style={{ background: "#0f766e", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
                          >
                            Editar
                          </button>
                          <button type="button" onClick={() => void removeItem(`/admin/treinos/${treino.id}`, "Treino removido com sucesso.")} style={{ background: "#b91c1c", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedSection === "atleta" && (
                <section style={{ borderRadius: 16, padding: 12, background: "#f7f8fb", boxShadow: "0 8px 18px rgba(0,0,0,0.18)" }}>
                  <h2 style={{ margin: "0 0 8px", color: "#232323", fontSize: 15 }}>Liberar Acesso de Atleta</h2>
                  <form onSubmit={submitAthleteAccess} style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <input type="email" placeholder="Email" value={athleteAccessForm.email} onChange={(e) => setAthleteAccessForm((p) => ({ ...p, email: e.target.value }))} required />
                    <input placeholder="Nome inicial (opcional)" value={athleteAccessForm.nome} onChange={(e) => setAthleteAccessForm((p) => ({ ...p, nome: e.target.value }))} />
                    <input placeholder="Senha temporária" value={athleteAccessForm.senha_temporaria} onChange={(e) => setAthleteAccessForm((p) => ({ ...p, senha_temporaria: e.target.value }))} required />
                    <button type="submit" style={{ background: "#43E07E", color: "#fff", borderRadius: 8, padding: "10px 12px", fontWeight: 700 }}>Liberar acesso</button>
                  </form>
                  <div style={{ display: "grid", gap: 6 }}>
                    {athletes.map((athlete) => (
                      <div key={athlete.id} style={{ border: "1px solid #dce0ef", borderRadius: 8, padding: 10, color: "#232323", fontSize: 12 }}>
                        <strong>#{athlete.id}</strong> {athlete.nome} - {athlete.email}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedSection === "matricula" && (
                <section style={{ borderRadius: 16, padding: 12, background: "#fff7e9", boxShadow: "0 8px 18px rgba(0,0,0,0.18)" }}>
                  <h2 style={{ margin: "0 0 8px", color: "#232323", fontSize: 15 }}>Matrículas por Dia</h2>
                  <form onSubmit={submitMatricula} style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <select value={matriculaForm.usuario_id} onChange={(e) => setMatriculaForm((p) => ({ ...p, usuario_id: e.target.value }))} required>
                      <option value="">Selecione o atleta</option>
                      {athleteOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input placeholder="Modalidade" value={matriculaForm.modalidade} onChange={(e) => setMatriculaForm((p) => ({ ...p, modalidade: e.target.value }))} required />
                    <select value={matriculaForm.dia_semana} onChange={(e) => setMatriculaForm((p) => ({ ...p, dia_semana: e.target.value }))}>
                      <option>Segunda</option>
                      <option>Terca</option>
                      <option>Quarta</option>
                      <option>Quinta</option>
                      <option>Sexta</option>
                      <option>Sabado</option>
                      <option>Domingo</option>
                    </select>
                    <button type="submit" style={{ background: "#43E07E", color: "#fff", borderRadius: 8, padding: "10px 12px", fontWeight: 700 }}>Adicionar matrícula</button>
                  </form>
                  <div style={{ display: "grid", gap: 8 }}>
                    {matriculasTreino.map((matricula) => (
                      <div key={matricula.id} style={{ border: "1px solid #ecd8b0", borderRadius: 10, padding: 10, background: "#fff" }}>
                        <div style={{ color: "#232323", fontSize: 12 }}>Atleta #{matricula.usuario_id} | {matricula.modalidade} | {matricula.dia_semana}</div>
                        <button type="button" onClick={() => void removeItem(`/admin/matriculas-treino/${matricula.id}`, "Matrícula removida com sucesso.")} style={{ marginTop: 8, background: "#b91c1c", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>Excluir</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedSection === "evento" && (
                <section style={{ borderRadius: 16, padding: 12, background: "#f7f8fb", boxShadow: "0 8px 18px rgba(0,0,0,0.18)" }}>
                  <h2 style={{ margin: "0 0 8px", color: "#232323", fontSize: 15 }}>Criar Evento</h2>
                  <form onSubmit={submitEvent} style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <input placeholder="Título" value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} required />
                    <input placeholder="Descrição" value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} />
                    <input type="date" value={eventForm.date} onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))} required />
                    <input placeholder="Local" value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} required />
                    <button type="submit" style={{ background: "#43E07E", color: "#fff", borderRadius: 8, padding: "10px 12px", fontWeight: 700 }}>{editingEventId ? "Atualizar" : "Criar"}</button>
                  </form>
                  <div style={{ display: "grid", gap: 8 }}>
                    {events.map((item) => (
                      <div key={item.id} style={{ border: "1px solid #dce0ef", borderRadius: 10, padding: 10, background: "#fff" }}>
                        <div style={{ color: "#232323", fontSize: 12 }}><strong>{item.title}</strong> | {item.date} | {item.location}</div>
                        {item.description ? <div style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>{item.description}</div> : null}
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(item.id);
                              setEventForm({
                                title: item.title,
                                description: item.description ?? "",
                                date: item.date,
                                location: item.location,
                              });
                            }}
                            style={{ background: "#0f766e", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
                          >
                            Editar
                          </button>
                          <button type="button" onClick={() => void removeItem(`/admin/events/${item.id}`, "Evento removido com sucesso.")} style={{ background: "#b91c1c", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selectedSection === "recomendacao" && (
                <section style={{ borderRadius: 16, padding: 12, background: "#fff7e9", boxShadow: "0 8px 18px rgba(0,0,0,0.18)" }}>
                  <h2 style={{ margin: "0 0 8px", color: "#232323", fontSize: 15 }}>Adicionar Recomendação</h2>
                  <form onSubmit={submitRecommendation} style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <input placeholder="Título" value={recommendationForm.title} onChange={(e) => setRecommendationForm((p) => ({ ...p, title: e.target.value }))} required />
                    <input placeholder="Descrição" value={recommendationForm.description} onChange={(e) => setRecommendationForm((p) => ({ ...p, description: e.target.value }))} />
                    <input placeholder="Modalidade" value={recommendationForm.modalidade} onChange={(e) => setRecommendationForm((p) => ({ ...p, modalidade: e.target.value }))} />
                    <input placeholder="URL do vídeo" value={recommendationForm.video_url} onChange={(e) => setRecommendationForm((p) => ({ ...p, video_url: e.target.value }))} required />
                    <button type="submit" style={{ background: "#43E07E", color: "#fff", borderRadius: 8, padding: "10px 12px", fontWeight: 700 }}>{editingRecommendationId ? "Atualizar" : "Criar"}</button>
                  </form>
                  <div style={{ display: "grid", gap: 8 }}>
                    {recommendations.map((item) => (
                      <div key={item.id} style={{ border: "1px solid #ecd8b0", borderRadius: 10, padding: 10, background: "#fff" }}>
                        <div style={{ color: "#232323", fontSize: 12 }}><strong>{item.title}</strong> {item.modalidade ? `| ${item.modalidade}` : ""}</div>
                        <div style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>{item.description ?? "Sem descrição"}</div>
                        <a href={item.video_url} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8", fontSize: 12 }}>{item.video_url}</a>
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecommendationId(item.id);
                              setRecommendationForm({
                                title: item.title,
                                description: item.description ?? "",
                                modalidade: item.modalidade ?? "",
                                video_url: item.video_url,
                              });
                            }}
                            style={{ background: "#0f766e", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
                          >
                            Editar
                          </button>
                          <button type="button" onClick={() => void removeItem(`/admin/recomendacoes/${item.id}`, "Recomendação removida com sucesso.")} style={{ background: "#b91c1c", color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
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
