import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaClipboardList } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/http';

interface Treino {
  id: number;
  data: string;
  hora: string;
  modalidade: string;
  local: string;
  vagas_total: number;
  vagas_disponiveis: number;
}

interface Aluno {
  usuario_id: number;
  nome: string;
  email: string;
  presente?: boolean;
}

interface TreinoCheckinsResponse {
  treino_id: number;
  data: string;
  hora: string;
  modalidade: string;
  usuarios: Aluno[];
}

export const PresencaPage: React.FC = () => {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const [selectedTreino, setSelectedTreino] = useState<Treino | null>(null);
  const [checkins, setCheckins] = useState<Aluno[]>([]);
  const [presencas, setPresencas] = useState<{
    [key: number]: boolean;
  }>({});
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'marcar' | 'historico'>('marcar');

  useEffect(() => {
    carregarTreinos();
    carregarHistorico();
  }, []);

  const carregarTreinos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/professor/treinos');
      setTreinos(response.data);
    } catch (error) {
      console.error('Erro ao carregar treinos:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      const response = await api.get('/professor/presenca/historico');
      setHistorico(response.data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const selecionarTreino = async (treino: Treino) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/professor/treinos/${treino.id}/checkins`
      );
      setSelectedTreino(treino);
      setCheckins(response.data.usuarios);
      setPresencas(
        response.data.usuarios.reduce(
          (acc: any, aluno: Aluno) => {
            acc[aluno.usuario_id] = true;
            return acc;
          },
          {}
        )
      );
    } catch (error) {
      console.error('Erro ao carregar checkins:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarPresencas = async () => {
    if (!selectedTreino) return;

    if (checkins.length === 0) {
      alert('Este treino não possui alunos com check-in para registrar presença.');
      return;
    }

    try {
      setLoading(true);
      const presencasArray = checkins.map((aluno) => ({
        usuario_id: aluno.usuario_id,
        treino_id: selectedTreino.id,
        presente: presencas[aluno.usuario_id] ?? true,
        observacoes: null,
      }));

      await api.post('/professor/presenca', presencasArray);
      alert('Presenças registradas com sucesso!');
      setSelectedTreino(null);
      carregarHistorico();
    } catch (error) {
      console.error('Erro ao salvar presenças:', error);
      alert('Erro ao registrar presenças');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatarHora = (hora: string) => {
    return hora.slice(0, 5);
  };

  if (!principal || principal.role !== 'PROFESSOR') {
    return <div style={{ background: '#181818', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Acesso restrito a professores.</div>;
  }

  return (
    <div style={{ background: '#181818', minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 24, paddingBottom: 24 }}>
      <div style={{ width: 393, height: 852, position: 'relative', background: '#212020', overflow: 'hidden', borderRadius: 20, fontFamily: 'Poppins, sans-serif', boxShadow: '0 0 32px 0 rgba(0,0,0,0.45)', border: '2px solid #fff' }}>

        {/* Status bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 393, height: 32, zIndex: 10 }}>
          <div style={{ position: 'absolute', left: 35, top: 9, color: 'white', fontSize: 13, fontWeight: 500 }}>16:04</div>
          <div style={{ position: 'absolute', right: 24, top: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>5G</span>
          </div>
        </div>

        {/* Header */}
        <div style={{ position: 'absolute', left: 20, top: 70, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/home')}
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#FFB84D', padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button
              onClick={() => navigate('/home')}
              type="button"
              style={{ background: 'transparent', border: 'none', color: '#FFB84D', fontSize: 20, fontWeight: 700, padding: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Presença
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ position: 'absolute', top: 110, left: 0, right: 0, display: 'flex', background: '#232323', borderBottom: '1px solid #2e2e2e', zIndex: 9 }}>
          <button
            onClick={() => setActiveTab('marcar')}
            type="button"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'marcar' ? '3px solid #FFB84D' : '3px solid transparent',
              color: activeTab === 'marcar' ? '#FFB84D' : '#888',
              fontSize: 14,
              fontWeight: activeTab === 'marcar' ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Marcar Presença
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            type="button"
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'historico' ? '3px solid #FFB84D' : '3px solid transparent',
              color: activeTab === 'historico' ? '#FFB84D' : '#888',
              fontSize: 14,
              fontWeight: activeTab === 'historico' ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Histórico
          </button>
        </div>

        {/* Content */}
        <div style={{ position: 'absolute', top: 158, left: 0, right: 0, bottom: 59, overflowY: 'auto', padding: '16px 20px', background: '#1a1a1a' }}>

          {activeTab === 'marcar' && (
            <>
              {!selectedTreino ? (
                <div>
                  <div style={{ color: '#aaa', fontSize: 13, marginBottom: 14 }}>Selecione o treino para marcar presença</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {loading ? (
                      <p style={{ color: '#888' }}>Carregando...</p>
                    ) : treinos.length === 0 ? (
                      <p style={{ color: '#888' }}>Nenhum treino encontrado</p>
                    ) : (
                      treinos.map((treino) => (
                        <div
                          key={treino.id}
                          onClick={() => selecionarTreino(treino)}
                          style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', background: '#232323', border: '1px solid #2e2e2e' }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{treino.modalidade}</div>
                          <div style={{ fontSize: 13, color: '#aaa' }}>{formatarData(treino.data)} · {formatarHora(treino.hora)}</div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{treino.local}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setSelectedTreino(null)}
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#FFB84D', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 16, fontSize: 14, fontFamily: 'Poppins, sans-serif' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Voltar
                  </button>

                  <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{selectedTreino.modalidade}</div>
                  <div style={{ color: '#aaa', fontSize: 13, marginBottom: 4 }}>{formatarData(selectedTreino.data)} · {formatarHora(selectedTreino.hora)} · {selectedTreino.local}</div>
                  <div style={{ color: '#FFB84D', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                    Presentes: {Object.values(presencas).filter(Boolean).length}/{checkins.length}
                  </div>

                  {checkins.length === 0 ? (
                    <p style={{ color: '#888', fontSize: 13 }}>Nenhum aluno fez check-in neste treino.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {checkins.map((aluno) => (
                        <div
                          key={aluno.usuario_id}
                          onClick={() => setPresencas({ ...presencas, [aluno.usuario_id]: !presencas[aluno.usuario_id] })}
                          style={{
                            display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                            background: presencas[aluno.usuario_id] ? '#1b3a2a' : '#2a1a1a',
                            border: `1px solid ${presencas[aluno.usuario_id] ? '#43E07E' : '#4a2020'}`,
                          }}
                        >
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginRight: 12,
                            background: presencas[aluno.usuario_id] ? '#43E07E' : 'transparent',
                            border: `2px solid ${presencas[aluno.usuario_id] ? '#43E07E' : '#666'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {presencas[aluno.usuario_id] && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{aluno.nome}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{aluno.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={salvarPresencas}
                    disabled={loading}
                    type="button"
                    style={{
                      width: '100%', padding: 14, border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
                      fontFamily: 'Poppins, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading ? '#444' : '#FFB84D', color: loading ? '#888' : '#1a1a1a',
                    }}
                  >
                    {loading ? 'Salvando...' : 'Salvar Presenças'}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'historico' && (
            <div>
              <div style={{ color: '#aaa', fontSize: 13, marginBottom: 14 }}>Treinos dos últimos 7 dias</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historico.length === 0 ? (
                  <p style={{ color: '#888' }}>Nenhum treino com presença registrada</p>
                ) : (
                  historico.map((item, idx) => (
                    <div key={idx} style={{ padding: '14px 16px', borderRadius: 12, background: '#232323', border: '1px solid #2e2e2e' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{item.modalidade}</div>
                      <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>{formatarData(item.data)} · {formatarHora(item.hora)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: '#2e2e2e', borderRadius: 2 }}>
                          <div style={{ width: `${item.percentual}%`, height: '100%', background: '#FFB84D', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 13, color: '#FFB84D', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {item.presentes}/{item.total_alunos} ({item.percentual}%)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 393, height: 59, background: '#FFB84D', borderRadius: '0 0 18px 18px', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <FaHome color="#fff" size={27} style={{ cursor: 'pointer' }} onClick={() => navigate('/home')} />
          <FaClipboardList color="#fff" size={26} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('marcar')} />
        </div>

      </div>
    </div>
  );
};
