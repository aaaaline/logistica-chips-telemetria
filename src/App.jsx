import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [counters, setCounters] = useState({ vivo: 0, claro: 0, tim: 0, algar: 0, indisponiveis: 0 });
  const [allChips, setAllChips] = useState([]); 
  const [ssnInput, setSsnInput] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  useEffect(() => {
    fetch('http://localhost:5000/api/contagem')
      .then(res => res.json())
      .then(data => setCounters(data))
      .catch(err => console.error("Erro ao buscar contagens:", err));

    fetch('http://localhost:5000/api/todos?limite=100') 
      .then(res => res.json())
      .then(data => setAllChips(data))
      .catch(err => console.error("Erro ao buscar lista de chips:", err));
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
        setError(data.erro || 'Erro ao buscar o SSN.');
      } else {
        setSearchResult(data);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const filteredChips = allChips.filter((chip) => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'disponivel') return chip.disponivel === true;
    if (statusFilter === 'indisponivel') return chip.disponivel === false;
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
                <label>Número do SSN</label>
                <div className="search-controls">
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="Digite o SSN para buscar"
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
              <h3>Detalhes da busca:</h3>
              <div className="details-grid">
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
                  <span className={searchResult.disponivel ? 'badge disponivel' : 'badge indisponivel'}>
                    {searchResult.disponivel ? 'Disponível' : 'Em Uso / Indisponível'}
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
                        <td>{chip.disponivel ? 'Disponível' : 'Indisponível'}</td>
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
          
          {/* Botões para adicionar novo chip e informar indisponibilidade do chip */}
          <div className="action-buttons-container">
            <button className="btn-primary">
              Novo Chip
            </button>
            <button className="btn-primary">
              Informar Indisponibilidade
            </button>
          </div>

          {/* Card 1: CHIPS DISPONÍVEIS */}
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

          {/* Card 1: CHIPS INDISPONÍVEIS */}
          <div className="card unavailable-card">
            <h2>Indisponíveis</h2>
            <p className="alerta-texto">
              Chips com UC ou motivo de devolução preenchidos.
            </p>
            
            <div className="counter-box indisponiveis-box">
              <span className="counter-label">Total Indisponíveis</span>
              <div className="counter-value">{counters.indisponiveis}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default App;