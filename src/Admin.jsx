import { useState, useEffect } from 'react';
import './App.css';
import editIcon from './assets/edit_square_icon.png';

const listaColaboradores = [
  "Allan Moreira Santana",
  "Carlos Eduardo Lima Da Silva",
  "Cristiano Silva Do Nascimento",
  "Daniel De Oliveira Freitas",
  "Diogenes Pereira De Oliveira",
  "Divino Mendanha Borges",
  "Elvis Henrique Pereira Da Silva",
  "Fabricio Pereira Da Silva",
  "Firmino Prado Uchoa",
  "Helder Queiroz De Oliveira",
  "Ivan Galdino Da Silva",
  "Joao Paulo Vicente De Carvalho",
  "Jose Marcos Pereira De Brito",
  "Josenilio Barros Almeida",
  "Leo Moreira", 
  "Leyvson Felipe De Aquino Guimaraes",
  "Marcos Antonio Pereira Da Silva",
  "Mauro Sergio Ferreira Cardoso",
  "Murilo Andriel Alves Cota",
  "Pedro Ermirio De Faria",
  "Rafael Vieira Dos Santos",
  "Ricardo Francisco Marques",
  "Roberto Parreira Carvalho",
  "Romildo dos Santos Da Conceicao",
  "Werles Borges"
];

function Admin() {
  const [allChips, setAllChips] = useState([]);
  const [file, setFile] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [formData, setFormData] = useState({ ssn_original: '', ssn: '', operadora: 'VIVO', uc: '', motivo: '', colaborador: '' });

  const loadData = () => {
    fetch('https://logistica-chips-telemetria.onrender.com/api/todos?limite=5000')  
      .then(res => res.json())
      .then(data => setAllChips(data))
      .catch(err => console.error("Erro ao buscar lista de chips:", err));
  };

  useEffect(() => { loadData(); }, []);

  // --- FUNÇÕES DE UPLOAD DE CSV ---
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUploadCSV = async () => {
    if (!file) {
      setErro('Selecione um arquivo CSV primeiro.');
      setMensagem('');
      return;
    }
    
    setErro('');
    setMensagem('Enviando...');
    const formDataCSV = new FormData();
    formDataCSV.append('file', file);

    try {
      const response = await fetch('https://logistica-chips-telemetria.onrender.com/api/admin/upload_csv', {
        method: 'POST',
        body: formDataCSV
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.erro);
      
      setMensagem(data.mensagem);
      setFile(null);
      document.getElementById('csvInput').value = ''; 
      loadData();
    } catch (err) {
      setErro(err.message);
      setMensagem('');
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setMensagem('Gerando arquivo para download...');
      setErro('');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/download_csv`);
      
      if (!response.ok) throw new Error('Falha ao baixar o arquivo.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Nome + data atual (ex: relatorio_chips_telemetria_2026-03-25.csv)
      a.download = `relatorio_chips_telemetria${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setMensagem('Download concluído com sucesso!');
    } catch (err) {
      setErro(err.message);
      setMensagem('');
    }
  };

  const abrirModalEdicao = (chip) => {
    setFormData({
      ssn_original: chip.SSN, 
      ssn: chip.SSN,
      operadora: chip.OPERADORA || 'VIVO',
      uc: chip.UC || '',
      motivo: chip.MOTIVO_DEVOLUCAO || '',
      colaborador: chip.COLABORADOR || '' 
    });
    setIsUpdateModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://logistica-chips-telemetria.onrender.com/api/admin/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ssn_original: formData.ssn_original,
          ssn: formData.ssn,
          operadora: formData.operadora,
          uc: formData.uc,
          motivo_devolucao: formData.motivo, 
          colaborador: formData.colaborador
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro);
      
      setIsUpdateModalOpen(false);
      setMensagem('Chip corrigido com sucesso!');
      setErro('');
      loadData(); 
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="left-column" style={{flex: 1}}>
          
          <div className="card">
            <h2 style={{color: '#e74c3c', borderBottomColor: '#fadbd8'}}>Página Restrita à Gestão</h2>
            
            <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#eef5f9', borderRadius: '8px', border: '1px solid #e0e6ed'}}>
              <h3>Upload Massivo (CSV)</h3>
              <p className="alerta-texto" style={{marginBottom: '10px'}}>
                O CSV deve ser separado por ponto e vírgula (;) e conter as colunas: <strong>SSN;OPERADORA;UC;MOTIVO_DEVOLUCAO</strong>
              </p>
              
              <div className="search-controls">
                <input id="csvInput" type="file" accept=".csv" onChange={handleFileChange} className="input-text" style={{padding: '8px'}}/>
                <button className="btn-salvar" onClick={handleUploadCSV}>Enviar CSV</button>
              </div>
              
              {erro && <span className="error-text">{erro}</span>}
              {mensagem && <span style={{color: '#2ecc71', fontWeight: 'bold', display: 'block', marginTop: '10px'}}>{mensagem}</span>}
            </div>
          </div>

          <div className="card table-card">
            <div className="table-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Chips Cadastrados</h3>
              <button 
                className="btn-salvar" 
                onClick={handleDownloadCSV} 
                style={{ backgroundColor: '#2ecc71', fontSize: '0.9rem', padding: '8px 15px', display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <span style={{ fontSize: '1.2rem' }}></span>Baixar CSV
              </button>
            </div>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>SSN</th>
                    <th>Operadora</th>
                    <th>Status</th>
                    <th>Colaborador</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allChips.map((chip, index) => (
                    <tr key={index}>
                      <td>{chip.SSN}</td>
                      <td>{chip.OPERADORA}</td>
                      <td>{chip.status}</td>
                      <td>{chip.COLABORADOR}</td>
                      <td>
                        <button className="btn-editar" onClick={() => abrirModalEdicao(chip)} style={{padding: '5px 10px', fontSize: '0.8rem'}}>
                          <img src={editIcon} alt="Editar" className="icon-editar" style={{width: '14px', height: '14px'}}/>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Modal: ATUALIZAR STATUS DO CHIP (ADMIN - SEM BLOQUEIOS) */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{color: '#0a3d54'}}>Atualizar Dados</h3>
            <form onSubmit={handleUpdateAdmin}>
              <div className="form-group">
                <label>SSN do Chip</label>
                <input type="text" name="ssn" value={formData.ssn} onChange={handleInputChange} className="input-text" required />
              </div>
              <div className="form-group">
                <label>Operadora</label>
                <select name="operadora" value={formData.operadora} onChange={handleInputChange} className="input-text">
                  <option value="ALGAR">ALGAR</option>
                  <option value="CLARO">CLARO</option>
                  <option value="OI">OI</option>
                  <option value="TIM">TIM</option>
                  <option value="VIVO">VIVO</option>
                </select>
              </div>
              <div className="form-group">
                <label>Protocolo/UC/SS (Instalado)</label>
                <input type="text" name="uc" value={formData.uc} onChange={handleInputChange} className="input-text" />
              </div>
              <div className="form-group">
                <label>Motivo da Devolução (Indisponível)</label>
                <input type="text" name="motivo" value={formData.motivo} onChange={handleInputChange} className="input-text" />
              </div>
              <div className="form-group">
                <label>Colaborador Responsável</label>
                <select name="colaborador" value={formData.colaborador} onChange={handleInputChange} className="input-text">
                  <option value="">(Nenhum)</option>
                  {listaColaboradores.map((nome, idx) => (
                    <option key={idx} value={nome}>{nome}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancelar" onClick={() => setIsUpdateModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-salvar" style={{backgroundColor: '#2ecc71'}}>Atualizar Dados</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Admin;
