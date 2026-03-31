import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaBookmark, FaHome, FaRegCalendarAlt, FaUser, FaUsers } from "react-icons/fa";

import { api } from "../api/http";
import { useAuth } from "../auth/AuthContext";

type CalendarioCheckinItem = {
  id: number;
  data: string;
  hora: string;
  modalidade: string;
  local: string;
  vagas_total: number;
  vagas_disponiveis: number;
  checkin_confirmado: boolean;
  pode_cancelar: boolean;
  limite_cancelamento: string;
  cancelado: boolean;
};

type ConfirmadoItem = {
  usuario_id: number;
  nome: string;
  email: string | null;
  treino_id: number;
};

type TreinoProfessor = {
  id: number;
  data: string;
  hora: string;
  modalidade: string;
  local: string;
  vagas_total: number;
  vagas_disponiveis: number;
};

type PresencaItem = {
  usuario_id: number;
  nome: string;
  email: string | null;
  status_presenca: "PENDENTE" | "PRESENTE" | "AUSENTE";
};

type NotificacaoProfessor = {
  id: number;
  acao: "checkin" | "cancelamento";
  justificativa: string | null;
  created_at: string | null;
  treino: {
    id: number;
    data?: string;
    hora?: string;
    modalidade?: string;
    local?: string;
  };
  aluno: {
    id: number;
    nome: string;
    email: string | null;
  };
};

function toErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const maybeResponse = error as { response?: { data?: { detail?: string } } };
    if (maybeResponse.response?.data?.detail) return maybeResponse.response.data.detail;
  }
  return "Falha ao processar a ação.";
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  const jsDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getWeekdayIndex(dateStr: string) {
  const jsDay = new Date(`${dateStr}T00:00:00`).getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatMonthYear(date: Date) {
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return months[date.getMonth()];
}

export function CheckinPage() {
  const navigate = useNavigate();
  const { principal, logout } = useAuth();

  const canUseCalendarView = principal?.role === "USER" || principal?.role === "ADMIN";
  const isAdminCalendarView = principal?.role === "ADMIN";
  const isProfessorView = principal?.role === "PROFESSOR";

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [calendarItems, setCalendarItems] = useState<CalendarioCheckinItem[]>([]);
  const [selectedTreino, setSelectedTreino] = useState<CalendarioCheckinItem | null>(null);
  const [selectedTreinoId, setSelectedTreinoId] = useState<number | null>(null);
  const [confirmados, setConfirmados] = useState<ConfirmadoItem[]>([]);
  const [modalConfirmar, setModalConfirmar] = useState<CalendarioCheckinItem | null>(null);
  const [modalCancelar, setModalCancelar] = useState<CalendarioCheckinItem | null>(null);
  const [justificativaCancelamento, setJustificativaCancelamento] = useState("");

  const [treinosProfessor, setTreinosProfessor] = useState<TreinoProfessor[]>([]);
  const [professorTreinoId, setProfessorTreinoId] = useState<number | null>(null);
  const [presencas, setPresencas] = useState<PresencaItem[]>([]);
  const [notificacoesProfessor, setNotificacoesProfessor] = useState<NotificacaoProfessor[]>([]);

  // Estado para calendário
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedModalidade, setSelectedModalidade] = useState<string | null>(null);

  useEffect(() => {
    if (!principal) return;

    if (canUseCalendarView) {
      void loadAlunoCalendar();
      return;
    }

    if (isProfessorView) {
      void loadProfessorData();
    }
  }, [principal?.role]);

  useEffect(() => {
    if (!canUseCalendarView || selectedTreinoId == null) return;
    void loadConfirmados(selectedTreinoId);
  }, [selectedTreinoId, canUseCalendarView]);

  useEffect(() => {
    if (!isProfessorView || professorTreinoId == null) return;
    void loadPresencas(professorTreinoId);
  }, [professorTreinoId, isProfessorView]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, CalendarioCheckinItem[]>();
    for (const item of calendarItems) {
      const [year, month] = item.data.split("-");
      const key = `${month}/${year}`;
      const current = groups.get(key) ?? [];
      current.push(item);
      groups.set(key, current);
    }
    return Array.from(groups.entries());
  }, [calendarItems]);

  // Extrair modalidades únicas
  const modalidades = useMemo(() => {
    const unique = new Set(calendarItems.map((item) => item.modalidade));
    return Array.from(unique).sort();
  }, [calendarItems]);

  // Filtrar treinos por data e modalidade selecionadas
  const treinosDoDia = useMemo(() => {
    if (!selectedDate) return [];
    return calendarItems.filter((item) => item.data === selectedDate && item.modalidade === selectedModalidade);
  }, [selectedDate, selectedModalidade, calendarItems]);

  const treinosDisponiveisModalidade = useMemo(() => {
    if (!selectedModalidade) return [];

    return calendarItems
      .filter((item) => {
        if (item.modalidade !== selectedModalidade) return false;
        const [year, month] = item.data.split("-").map(Number);
        if (Number.isNaN(year) || Number.isNaN(month)) return false;
        return year === currentMonth.getFullYear() && month === currentMonth.getMonth() + 1;
      })
      .sort((a, b) => {
        const left = `${a.data}T${a.hora}`;
        const right = `${b.data}T${b.hora}`;
        return left.localeCompare(right);
      });
  }, [calendarItems, currentMonth, selectedModalidade]);

  const treinosMesSelecionado = useMemo(() => {
    return calendarItems.filter((item) => {
      const [year, month] = item.data.split("-").map(Number);
      if (Number.isNaN(year) || Number.isNaN(month)) return false;
      const sameMonth = year === currentMonth.getFullYear() && month === currentMonth.getMonth() + 1;
      const sameModalidade = selectedModalidade ? item.modalidade === selectedModalidade : true;
      return sameMonth && sameModalidade;
    });
  }, [calendarItems, currentMonth, selectedModalidade]);

  const datasComTreino = useMemo(() => {
    return new Set(treinosMesSelecionado.map((item) => item.data));
  }, [treinosMesSelecionado]);

  const weekdaysDaModalidade = useMemo(() => {
    const dias = new Set<number>();
    if (!selectedModalidade) return dias;

    for (const item of calendarItems) {
      if (item.modalidade !== selectedModalidade) continue;
      dias.add(getWeekdayIndex(item.data));
    }

    return dias;
  }, [calendarItems, selectedModalidade]);

  const ultimosCheckins = useMemo(() => {
    return calendarItems.filter((item) => item.checkin_confirmado && !item.cancelado).slice(0, 3);
  }, [calendarItems]);

  async function loadAlunoCalendar() {
    try {
      const res = await api.get<CalendarioCheckinItem[]>("/checkins/calendario-me");
      const items = Array.isArray(res.data) ? res.data : [];
      setCalendarItems(items);
      if (items.length > 0) {
        setSelectedTreino(items[0]);
        setSelectedTreinoId(items[0].id);
        setSelectedModalidade(items[0].modalidade);
        setSelectedDate(items[0].data);
        setCurrentMonth(new Date(`${items[0].data}T00:00:00`));
      }
      setFeedback("");
    } catch (error) {
      setFeedback(toErrorMessage(error));
      setCalendarItems([]);
    }
  }

  async function loadConfirmados(treinoId: number) {
    try {
      const res = await api.get<ConfirmadoItem[]>(`/checkins/treinos/${treinoId}/confirmados`);
      setConfirmados(Array.isArray(res.data) ? res.data : []);
    } catch {
      setConfirmados([]);
    }
  }

  async function loadProfessorData() {
    try {
      const [treinosRes, notificacoesRes] = await Promise.all([
        api.get<TreinoProfessor[]>("/professor/treinos"),
        api.get<NotificacaoProfessor[]>("/professor/notificacoes"),
      ]);

      const treinos = Array.isArray(treinosRes.data) ? treinosRes.data : [];
      setTreinosProfessor(treinos);
      if (treinos.length > 0) setProfessorTreinoId(treinos[0].id);
      setNotificacoesProfessor(Array.isArray(notificacoesRes.data) ? notificacoesRes.data : []);
      setFeedback("");
    } catch (error) {
      setFeedback(toErrorMessage(error));
      setTreinosProfessor([]);
      setNotificacoesProfessor([]);
    }
  }

  async function loadPresencas(treinoId: number) {
    try {
      const res = await api.get<PresencaItem[]>(`/professor/treinos/${treinoId}/presenca`);
      setPresencas(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPresencas([]);
    }
  }

  async function confirmarCheckin(item: CalendarioCheckinItem) {
    try {
      await api.post("/checkins/me", { treino_id: item.id });
      await loadAlunoCalendar();
      await loadConfirmados(item.id);
      setFeedback("Check-in confirmado com sucesso.");
    } catch (error) {
      setFeedback(toErrorMessage(error));
    } finally {
      setModalConfirmar(null);
    }
  }

  async function cancelarCheckin(item: CalendarioCheckinItem) {
    try {
      await api.post(`/checkins/me/${item.id}/cancelar`, { justificativa: justificativaCancelamento });
      await loadAlunoCalendar();
      await loadConfirmados(item.id);
      setFeedback("Check-in cancelado com sucesso.");
    } catch (error) {
      setFeedback(toErrorMessage(error));
    } finally {
      setModalCancelar(null);
      setJustificativaCancelamento("");
    }
  }

  async function marcarPresenca(treinoId: number, usuarioId: number, status: "PRESENTE" | "AUSENTE") {
    try {
      await api.put(`/professor/treinos/${treinoId}/presenca/${usuarioId}`, { status });
      await loadPresencas(treinoId);
      setFeedback("Presença atualizada.");
    } catch (error) {
      setFeedback(toErrorMessage(error));
    }
  }

  function handleSelectModalidade(value: string) {
    setSelectedModalidade(value);
    const primeiroTreinoDaModalidade = calendarItems.find((item) => item.modalidade === value);
    if (!primeiroTreinoDaModalidade) {
      setSelectedDate(null);
      setSelectedTreino(null);
      setSelectedTreinoId(null);
      return;
    }

    setSelectedDate(primeiroTreinoDaModalidade.data);
    setSelectedTreino(primeiroTreinoDaModalidade);
    setSelectedTreinoId(primeiroTreinoDaModalidade.id);
    setCurrentMonth(new Date(`${primeiroTreinoDaModalidade.data}T00:00:00`));
  }

  function handleSelectDia(dateStr: string) {
    const treinosNoDia = calendarItems.filter((item) => item.data === dateStr && item.modalidade === selectedModalidade);
    if (treinosNoDia.length === 0) return;

    setSelectedDate(dateStr);
    setSelectedTreino(treinosNoDia[0]);
    setSelectedTreinoId(treinosNoDia[0].id);
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

        <div style={{ position: "absolute", left: 20, top: 70, zIndex: 2, width: 250 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => navigate("/home")}
              type="button"
              style={{ background: "transparent", color: "#43E07E", padding: 0, display: "flex", alignItems: "center" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              onClick={() => navigate("/home")}
              type="button"
              style={{ background: "transparent", color: "#43E07E", fontSize: 20, fontWeight: 700, padding: 0, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Check-in
            </button>
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

        <div style={{ position: "absolute", top: 156, left: 0, right: 0, bottom: 72, overflowY: "auto", padding: "16px 20px", background: "#1a1a1a" }}>
          {feedback && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#fff7e9", color: "#232323", fontSize: 12 }}>{feedback}</div>}

          {canUseCalendarView && (
            <>
              {/* Dropdown de Modalidade */}
              <div style={{ marginBottom: 16 }}>
                <select
                  value={selectedModalidade ?? ""}
                  onChange={(event) => handleSelectModalidade(event.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "12px 16px",
                    background: "#E0A443",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                    backgroundSize: "20px",
                    paddingRight: "40px",
                  }}
                >
                  <option value="">Selecione uma modalidade</option>
                  {modalidades.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seletor de Mês/Ano */}
              <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  style={{ border: "1px solid #E0A443", background: "transparent", color: "#E0A443", borderRadius: 10, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}
                >
                  {'<'}
                </button>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, flex: 1, textAlign: "center" }}>
                  <span style={{ background: "#E0A443", padding: "4px 12px", borderRadius: 12, marginRight: 8, color: "#fff" }}>{formatMonthYear(currentMonth)}</span>
                  <span style={{ background: "#E0A443", padding: "4px 12px", borderRadius: 12, color: "#fff" }}>{currentMonth.getFullYear()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  style={{ border: "1px solid #E0A443", background: "transparent", color: "#E0A443", borderRadius: 10, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}
                >
                  {'>'}
                </button>
              </div>

              {/* Calendário em Grid */}
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                {/* Dias da semana */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 12 }}>
                  {["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"].map((day) => (
                    <div key={day} style={{ textAlign: "center", color: "#43E07E", fontSize: 11, fontWeight: 700 }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Números dos dias */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                  {Array(getFirstDayOfMonth(currentMonth))
                    .fill(null)
                    .map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}

                  {Array(getDaysInMonth(currentMonth))
                    .fill(null)
                    .map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const treinosNoDia = treinosMesSelecionado.filter((item) => item.data === dateStr);
                      const temTreino = datasComTreino.has(dateStr);
                      const weekday = getWeekdayIndex(dateStr);
                      const diaRecorrenteModalidade = weekdaysDaModalidade.has(weekday);
                      const isConfirmed = treinosNoDia.some((item) => item.checkin_confirmado && !item.cancelado);
                      const isSelected = selectedDate === dateStr;
                      const isToday = new Date().toDateString() === new Date(`${dateStr}T00:00:00`).toDateString();

                      return (
                        <div
                          key={day}
                          onClick={() => handleSelectDia(dateStr)}
                          style={{
                            textAlign: "center",
                            padding: "8px",
                            borderRadius: 8,
                            background: isConfirmed ? "#43E07E" : diaRecorrenteModalidade ? "#fff7e9" : isToday ? "#e5e7eb" : "#f3f4f6",
                            border: temTreino ? "1.5px solid #E0A443" : diaRecorrenteModalidade ? "1.5px solid #f3d18b" : "1.5px solid transparent",
                            boxShadow: isSelected ? "0 0 0 2px #232323 inset" : "none",
                            color: isConfirmed ? "#fff" : "#232323",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: temTreino ? "pointer" : "default",
                            opacity: temTreino || isToday ? 1 : 0.7,
                          }}
                        >
                          {day}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, color: "#d1d5db", fontSize: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#fff7e9", border: "1.5px solid #f3d18b", display: "inline-block" }} />
                  Dia da modalidade
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid #E0A443", background: "#f3f4f6", display: "inline-block" }} />
                  Treino disponivel
                </div>
              </div>


                {/* Treinos da modalidade no mês selecionado */}
                {selectedModalidade && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: "#43E07E", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                        Treinos disponíveis de {selectedModalidade} em {formatMonthYear(currentMonth)}:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {treinosDisponiveisModalidade.map((treino) => (
                          <div
                            key={treino.id}
                            onClick={() => {
                              setSelectedDate(treino.data);
                              setSelectedTreino(treino);
                              setSelectedTreinoId(treino.id);
                            }}
                            style={{
                              background: "#fff7e9",
                              borderRadius: 12,
                              padding: 12,
                              border: selectedDate === treino.data ? "2px solid #E0A443" : "2px solid transparent",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ color: "#232323", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                              {formatDate(treino.data)} - {treino.hora}
                            </div>
                            <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8 }}>Local: {treino.local}</div>
                            <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 12 }}>
                              Vagas: {treino.vagas_disponiveis}/{treino.vagas_total}
                            </div>
                            {isAdminCalendarView ? (
                              <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 600 }}>
                                Visualização ADMIN: todos os treinos disponíveis.
                              </div>
                            ) : (
                              <button
                                onClick={() => setModalConfirmar(treino)}
                                disabled={treino.checkin_confirmado}
                                style={{
                                  width: "100%",
                                  padding: "8px",
                                  background: treino.checkin_confirmado ? "#ccc" : "#E0A443",
                                  color: "#fff",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  border: "none",
                                  cursor: treino.checkin_confirmado ? "default" : "pointer",
                                }}
                              >
                                {treino.checkin_confirmado ? "✓ Check-in Confirmado" : "Fazer Check-in"}
                              </button>
                            )}
                          </div>
                        ))}
                        {treinosDisponiveisModalidade.length === 0 && (
                          <div style={{ color: "#6b7280", fontSize: 12 }}>Sem treinos disponiveis para essa modalidade neste mês.</div>
                        )}
                      </div>
                    </div>
                  </>
                )}

              {/* Últimos Check-ins */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: "#43E07E", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Seus últimos checkins</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ultimosCheckins.map((item) => (
                    <div key={item.id} style={{ background: "#fff7e9", borderRadius: 12, padding: 12 }}>
                      <div style={{ color: "#232323", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                        {formatDate(item.data)} - {item.hora}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8 }}>Local: {item.local}</div>
                      <div style={{ color: "#43E07E", fontSize: 11, fontWeight: 700 }}>✓ Status: Confirmado</div>
                    </div>
                  ))}
                  {ultimosCheckins.length === 0 && <div style={{ color: "#6b7280", fontSize: 12 }}>Nenhum check-in realizado ainda</div>}
                </div>
              </div>
            </>
          )}

          {isProfessorView && (
            <>
              {/* Turmas para chamada */}
              <div style={{ marginBottom: 16 }}>
                <select
                  value={professorTreinoId ?? ""}
                  onChange={(event) => setProfessorTreinoId(Number(event.target.value))}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "12px 16px",
                    background: "#E0A443",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 10px center",
                    backgroundSize: "20px",
                    paddingRight: "40px",
                  }}
                >
                  {treinosProfessor.map((treino) => (
                    <option key={treino.id} value={treino.id}>
                      {formatDate(treino.data)} {treino.hora} - {treino.modalidade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista de presença */}
              <section style={{ marginBottom: 20 }}>
                <div style={{ color: "#43E07E", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Lista de presença</div>
                {presencas.length === 0 ? (
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Nenhum aluno confirmado.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {presencas.map((item) => (
                      <div key={item.usuario_id} style={{ background: "#fff7e9", borderRadius: 12, padding: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E0A443", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                            {item.nome.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#232323", fontSize: 12, fontWeight: 700 }}>{item.nome}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => professorTreinoId && marcarPresenca(professorTreinoId, item.usuario_id, "PRESENTE")}
                            style={{
                              flex: 1,
                              background: item.status_presenca === "PRESENTE" ? "#16a34a" : "#d1d5db",
                              color: "#fff",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "6px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            ✓ Presente
                          </button>
                          <button
                            type="button"
                            onClick={() => professorTreinoId && marcarPresenca(professorTreinoId, item.usuario_id, "AUSENTE")}
                            style={{
                              flex: 1,
                              background: item.status_presenca === "AUSENTE" ? "#dc2626" : "#d1d5db",
                              color: "#fff",
                              borderRadius: 6,
                              fontSize: 11,
                              padding: "6px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            ✕ Ausente
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Notificações para professor */}
              <section>
                <div style={{ color: "#43E07E", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Notificações para professor</div>
                {notificacoesProfessor.length === 0 ? (
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Sem novas atividades de check-in.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {notificacoesProfessor.map((item) => (
                      <div key={item.id} style={{ background: "#eef2ff", borderRadius: 12, padding: 12 }}>
                        <div style={{ color: "#232323", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          {item.aluno.nome} - {item.acao === "checkin" ? "Check-in" : "Cancelamento"}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 11 }}>{item.treino.modalidade ?? "Treino"}</div>
                        {item.justificativa && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>Motivo: {item.justificativa}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div style={{ width: 393, height: 59, left: 0, bottom: 0, position: "absolute", background: "#E0A443", borderRadius: "0 0 20px 20px", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <FaHome color="#fff" size={27} style={{ cursor: "pointer" }} onClick={() => navigate("/home")} />
          <FaRegCalendarAlt color="#fff" size={29} style={{ cursor: "pointer" }} onClick={() => navigate("/checkin")} />
          <FaBookmark color="#fff" size={28} style={{ cursor: "pointer" }} onClick={() => navigate("/eventos")} />
          <FaUsers color="#fff" size={31} style={{ cursor: "pointer" }} onClick={() => navigate("/modalidades")} />
        </div>

        {modalConfirmar && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#232323", borderRadius: 16, padding: "26px 24px 20px", minWidth: 300, color: "#fff", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#E0A443" }}>Confirmar check-in</div>
              <div>Data: <strong>{formatDate(modalConfirmar.data)}</strong></div>
              <div>Horário: <strong>{modalConfirmar.hora}</strong></div>
              <div>Local: <strong>{modalConfirmar.local}</strong></div>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setModalConfirmar(null)} style={{ background: "#E0A443", color: "#232323", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}>Voltar</button>
                <button type="button" onClick={() => void confirmarCheckin(modalConfirmar)} style={{ background: "#43E07E", color: "#fff", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {modalCancelar && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#232323", borderRadius: 16, padding: "26px 24px 20px", minWidth: 300, color: "#fff", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#E0A443" }}>Cancelar check-in</div>
              <div>Informe a justificativa:</div>
              <textarea
                value={justificativaCancelamento}
                onChange={(event) => setJustificativaCancelamento(event.target.value)}
                rows={4}
                style={{ width: "100%", borderRadius: 8, padding: 8, resize: "none" }}
                placeholder="Ex: consulta médica no horário da aula"
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setModalCancelar(null)} style={{ background: "#E0A443", color: "#232323", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}>Voltar</button>
                <button
                  type="button"
                  disabled={justificativaCancelamento.trim().length < 5}
                  onClick={() => void cancelarCheckin(modalCancelar)}
                  style={{ background: "#b91c1c", color: "#fff", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}
                >
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
