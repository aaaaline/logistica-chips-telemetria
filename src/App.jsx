import { useState, useEffect } from 'react';
import './App.css';
import editIcon from './assets/edit_square_icon.png';

function App() {
  const [counters, setCounters] = useState({ vivo: 0, claro: 0, tim: 0, algar: 0, indisponiveis: 0, reaproveitados: 0 });
  const [allChips, setAllChips] = useState([]); 
  const [searchResult, setSearchResult] = useState(null);

  const [ssnInput, setSsnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [formData, setFormData] = useState({ ssn: '', operadora: 'VIVO', uc: '', motivo: '' });

  const loadData = () => {
    fetch('http://localhost:5000/api/contagem')
      .then(res => res.json())
      .then(data => setCounters(data))
      .catch(err => console.error("Erro ao buscar contagens:", err));

    fetch('http://localhost:5000/api/todos?limite=100') 
      .then(res => res.json())
      .then(data => setAllChips(data))
      .catch(err => console.error("Erro ao buscar lista de chips:", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async () => {
    if (!ssnInput.trim()) {
      setError('Por favor, digite um SSN para buscar.');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResult(null);

    try {
      const response = await fetch(`http://localhost:5000/api/busca?ssn=${ssnInput.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setIsAddModalOpen(true);
          setError('SSN não cadastrado. Preencha o formulário para adicioná-lo.');
        } else {
          setError(data.erro || 'Erro ao buscar o SSN.');
        }
      } else {
        setSearchResult(data);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsUpdateModalOpen(false);
    setFormData({ ssn: '', operadora: 'VIVO', uc: '', motivo: '' });
  };

  const handleAddChip = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/adicionar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssn: formData.ssn,
          operadora: formData.operadora,
          uc: formData.uc,
          motivo_devolucao: formData.motivo
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro);
      
      closeModals();
      loadData(); 
      setSsnInput('');
      setError('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateChip = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssn: formData.ssn,
          uc: formData.uc,
          motivo_devolucao: formData.motivo
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro);
      
      closeModals();
      loadData(); 
      setSearchResult(null);
      setSsnInput('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Botão de Editar do Card
  const abrirModalEdicao = () => {
    setFormData(prev => ({ ...prev, ssn: searchResult.ssn }));
    setIsUpdateModalOpen(true);
  };

  // Filtro da Tabela
  const filteredChips = allChips.filter((chip) => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'disponivel') return chip.status === 'Disponível';
    if (statusFilter === 'indisponivel') return chip.status === 'Indisponível';
    if (statusFilter === 'reaproveitado') return chip.status === 'Reaproveitado';
    return true;
  });

  return (
    <div className="app-container">
      <div className="main-layout">
        
        {/* COLUNA ESQUERDA */}
        <div className="left-column">
          <div className="card search-card">
            <h2>Buscar SSN</h2>
            <div className="search-box">
              <div className="input-group">
                <div className="search-controls">
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="Informe o número do SSN ou os últimos 8 dígitos"
                    value={ssnInput}
                    onChange={(e) => setSsnInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button 
                    className="btn-buscar" 
                    onClick={handleSearch} 
                    disabled={loading}
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
                {error && <span className="error-text">{error}</span>}
              </div>
            </div>
          </div>

          {searchResult && (
            <div className="card details-card">
              <div className="card-header-flex">
                <h3>SSN Encontrado:</h3>

                {!searchResult.bloqueado && (
                  <button className="btn-editar" onClick={abrirModalEdicao}>
                    <img src={editIcon} alt="Editar" className="icon-editar" />
                    Editar
                  </button>
                )}
              </div>

              <div className="details-grid">

                <div className="detail-item full-width">
                  <span className="ssn-destaque">{searchResult.ssn}</span>
                </div>

                <div className="detail-item">
                  <label>Protocolo/UC:</label>
                  <span>{searchResult.uc || 'Nenhum'}</span>
                </div>
                <div className="detail-item">
                  <label>Motivo Devolução:</label>
                  <span>{searchResult.motivo_devolucao || 'Nenhum'}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`badge ${searchResult.status === 'Disponível' ? 'disponivel' : searchResult.status === 'Reaproveitado' ? 'reaproveitado' : 'indisponivel'}`}>
                    {searchResult.status} {searchResult.bloqueado}
                  </span>
                </div>
                
              </div>
            </div>
          )}

          {/* Tabela de Chips */}
          <div className="card table-card">
            <div className="table-header-flex">
              <h3>Chips Cadastrados</h3>
              <select 
                className="status-filter" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="disponivel">Disponíveis</option>
                <option value="indisponivel">Indisponíveis</option>
                <option value="reaproveitado">Reaproveitados</option>
              </select>
            </div>

            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>SSN</th>
                    <th>Operadora</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChips && filteredChips.length > 0 ? (
                    filteredChips.map((chip, index) => (
                      <tr key={index}>
                        <td>{chip.SSN}</td>
                        <td>{chip.OPERADORA}</td>
                        <td>{chip.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="empty-state">
                        Nenhum chip encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="right-column">
          
          <div className="card counters-card">
            <h2>Disponíveis</h2>
            <p className="alerta-texto">
              Chips sem UC e sem motivo de devolução.
            </p>
            
            <div className="counters-grid">
              <div className="counter-box">
                <span className="counter-label">Vivo</span>
                <div className="counter-value">{counters.vivo}</div>
              </div>
              <div className="counter-box">
                <span className="counter-label">Claro</span>
                <div className="counter-value">{counters.claro}</div>
              </div>
              <div className="counter-box">
                <span className="counter-label">Tim</span>
                <div className="counter-value">{counters.tim}</div>
              </div>
              <div className="counter-box">
                <span className="counter-label">Algar</span>
                <div className="counter-value">{counters.algar}</div>
              </div>
            </div>
          </div>

          <div className="card reinstalled-card">
            <h2>Reaproveitados</h2>
            <div className="counter-box reaproveitados-box">
              <span className="counter-label">Total Reaproveitados</span>
              <div className="counter-value">{counters.reaproveitados || 0}</div>
            </div>
          </div>

          <div className="card unavailable-card">
            <h2>Indisponíveis</h2>
            <div className="counter-box indisponiveis-box">
              <span className="counter-label">Total Indisponíveis</span>
              <div className="counter-value">{counters.indisponiveis}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal: CADASTRAR CHIP */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Adicionar Novo Chip</h3>
            <form onSubmit={handleAddChip}>
              <div className="form-group">
                <label>SSN do Chip *</label>
                <input type="text" name="ssn" required value={formData.ssn} onChange={handleInputChange} className="input-text" />
              </div>
              <div className="form-group">
                <label>Operadora *</label>
                <select name="operadora" value={formData.operadora} onChange={handleInputChange} className="input-text">
                  <option value="VIVO">VIVO</option>
                  <option value="CLARO">CLARO</option>
                  <option value="TIM">TIM</option>
                  <option value="ALGAR">ALGAR</option>
                </select>
              </div>
              <p className="alerta-texto" style={{marginBottom: "10px"}}>
                Preencha uma das opções abaixo caso o chip já não esteja disponível:
              </p>
              <div className="form-group">
                <label>Protocolo/UC (Reaproveitado)</label>
                <input type="text" name="uc" value={formData.uc} onChange={handleInputChange} className="input-text" placeholder="Se foi instalado novamente" />
              </div>
              <div className="form-group">
                <label>Motivo da Devolução (Indisponível)</label>
                <input type="text" name="motivo" value={formData.motivo} onChange={handleInputChange} className="input-text" placeholder="Se foi descartado" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-salvar">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: ATUALIZAR STATUS DO CHIP */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Informar Indisponibilidade (Atualizar)</h3>
            <p className="alerta-texto">O chip será bloqueado para novas alterações após salvar.</p>
            <form onSubmit={handleUpdateChip}>
              <div className="form-group">
                <label>SSN do Chip</label>
                <input type="text" name="ssn" disabled value={formData.ssn} className="input-text" style={{backgroundColor: '#f1f1f1'}} />
              </div>
              <div className="form-group">
                <label>Protocolo/UC (Reaproveitado)</label>
                <input type="text" name="uc" value={formData.uc} onChange={handleInputChange} className="input-text" placeholder="Se foi instalado novamente"/>
              </div>
              <div className="form-group">
                <label>Motivo da Devolução (Indisponível)</label>
                <input type="text" name="motivo" value={formData.motivo} onChange={handleInputChange} className="input-text" placeholder="Se foi descartado"/>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={closeModals}>Cancelar</button>
                <button type="submit" className="btn-salvar">Atualizar Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default App;