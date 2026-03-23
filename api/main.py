from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

base_path = os.path.dirname(__file__)
file_path = os.path.join(base_path, 'dados.csv') 

df = None
load_error = None

def carregar_dados():
    global df, load_error
    try:
        cols = ['SSN', 'OPERADORA', 'UC', 'MOTIVO_DEVOLUCAO']
        df_temp = pd.read_csv(file_path, sep=';', dtype=str, low_memory=False)
        
        for col in cols:
            if col not in df_temp.columns:
                df_temp[col] = ''
                
        df_temp = df_temp[cols]
        df_temp['SSN'] = df_temp['SSN'].str.strip()
        df = df_temp.fillna('')
    except Exception as e:
        load_error = str(e)
        print(f"Erro ao carregar CSV principal: {load_error}")

def salvar_csv():
    df.to_csv(file_path, sep=';', index=False)

def obter_status(uc, motivo):
    if uc != '': return 'Reaproveitado'
    if motivo != '': return 'Indisponível'
    return 'Disponível'

carregar_dados()

# ==========================================
# ROTA 1: Buscar SSN específico
# ==========================================
@app.route('/api/busca', methods=['GET'])
def buscar():
    if df is None: return jsonify({"erro": f"Erro interno: {load_error}"}), 500
    
    ssn_query = request.args.get('ssn')
    if not ssn_query: return jsonify({"erro": "O parâmetro 'ssn' é obrigatório"}), 400
        
    ssn_query = ssn_query.strip()
    resultado = df[df['SSN'].str.contains(ssn_query, na=False)]
    
    if resultado.empty: return jsonify({"erro": "SSN não encontrado"}), 404

    linha = resultado.iloc[0]
    uc = linha['UC']
    motivo = linha['MOTIVO_DEVOLUCAO']
    
    return jsonify({
        "ssn": linha['SSN'],
        "operadora": linha['OPERADORA'],
        "uc": uc,
        "motivo_devolucao": motivo,
        "status": obter_status(uc, motivo),
        "bloqueado": True if uc != '' or motivo != '' else False # Se tiver UC ou motivo preenchido, a edição é bloqueada
    }), 200

# ==========================================
# ROTA 2: Contagens
# ==========================================
@app.route('/api/contagem', methods=['GET'])
def obter_contadores():
    if df is None: return jsonify({"erro": f"Erro interno: {load_error}"}), 500
    
    df_disponiveis = df[(df['UC'] == '') & (df['MOTIVO_DEVOLUCAO'] == '')]
    
    total_reaproveitados = len(df[df['UC'] != ''])
    total_indisponiveis = len(df[(df['MOTIVO_DEVOLUCAO'] != '') & (df['UC'] == '')])
    
    contagem_bruta = df_disponiveis['OPERADORA'].str.upper().value_counts().to_dict()
    
    return jsonify({
        "vivo": contagem_bruta.get("VIVO", 0),
        "claro": contagem_bruta.get("CLARO", 0),
        "tim": contagem_bruta.get("TIM", 0),
        "algar": contagem_bruta.get("ALGAR", 0),
        "indisponiveis": total_indisponiveis,
        "reaproveitados": total_reaproveitados
    }), 200

# ==========================================
# ROTA 3: Listar todos
# ==========================================
@app.route('/api/todos', methods=['GET'])
def listar_todos():
    if df is None: return jsonify({"erro": f"Erro interno: {load_error}"}), 500

    df_view = df[['SSN', 'OPERADORA', 'UC', 'MOTIVO_DEVOLUCAO']].copy()

    df_view['status'] = df_view.apply(lambda row: obter_status(row['UC'], row['MOTIVO_DEVOLUCAO']), axis=1)
    
    limite = request.args.get('limite', default=100, type=int)
    registros = df_view.head(limite).to_dict(orient='records')
    
    return jsonify(registros), 200

# ==========================================
# ROTA 4: Atualizar Chip Existente (Eletricista)
# ==========================================
@app.route('/api/atualizar', methods=['POST'])
def atualizar():
    if df is None: return jsonify({"erro": "Banco de dados indisponível"}), 500
    
    dados = request.json
    ssn = dados.get('ssn', '').strip()
    uc = dados.get('uc', '').strip()
    motivo = dados.get('motivo_devolucao', '').strip()

    if not ssn: return jsonify({"erro": "SSN é obrigatório"}), 400

    indices = df.index[df['SSN'] == ssn].tolist()
    if not indices: return jsonify({"erro": "SSN não encontrado"}), 404
    
    idx = indices[0]
    
    # Verifica a regra de bloqueio: se já tem UC ou motivo, a alteração não é permitida
    if df.at[idx, 'UC'] != '' or df.at[idx, 'MOTIVO_DEVOLUCAO'] != '':
        return jsonify({"erro": "Este chip já foi alterado anteriormente e está BLOQUEADO."}), 403

    df.at[idx, 'UC'] = uc
    df.at[idx, 'MOTIVO_DEVOLUCAO'] = motivo
    salvar_csv()

    return jsonify({"mensagem": "Status do chip atualizado com sucesso!"}), 200

# ==========================================
# ROTA 5: Cadastrar Novo Chip (Eletricista)
# ==========================================
@app.route('/api/adicionar', methods=['POST'])
def adicionar():
    global df
    if df is None: return jsonify({"erro": "Banco de dados indisponível"}), 500
    
    dados = request.json
    ssn = dados.get('ssn', '').strip()
    operadora = dados.get('operadora', '').strip().upper()
    uc = dados.get('uc', '').strip()
    motivo = dados.get('motivo_devolucao', '').strip()

    if not ssn or not operadora:
        return jsonify({"erro": "SSN e Operadora são obrigatórios."}), 400

    if ssn in df['SSN'].values:
        return jsonify({"erro": "Este SSN já está cadastrado no sistema."}), 409

    nova_linha = pd.DataFrame([{
        'SSN': ssn, 'OPERADORA': operadora, 
        'UC': uc, 'MOTIVO_DEVOLUCAO': motivo
    }])
    
    df = pd.concat([df, nova_linha], ignore_index=True)
    salvar_csv()

    return jsonify({"mensagem": "Novo chip cadastrado com sucesso!"}), 201

if __name__ == '__main__':
    app.run(debug=True, port=5000)