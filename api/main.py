from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

base_path = os.path.dirname(__file__)
file_path = os.path.join(base_path, 'dados.csv') 

df = None
load_error = None

try:
    cols = ['SSN', 'OPERADORA', 'UC', 'MOTIVO_DEVOLUCAO']
    df = pd.read_csv(file_path, sep=';', dtype=str, low_memory=False, usecols=cols)
    df['SSN'] = df['SSN'].str.strip()
    df = df.fillna('')
except Exception as e:
    load_error = str(e)
    print(f"Erro ao carregar CSV principal: {load_error}")
    
    
# ==========================================
# ROTA 1: Busca de SSN específico
# ==========================================
@app.route('/api/busca', methods=['GET'])
def buscar():
    if df is None:
        return jsonify({"erro": f"Erro interno no banco de dados: {load_error}"}), 500
    
    ssn_query = request.args.get('ssn')
    
    if not ssn_query:
        return jsonify({"erro": "O parâmetro 'ssn' é obrigatório"}), 400
        
    ssn_query = ssn_query.strip()
    resultado = df[df['SSN'] == ssn_query]
    
    if resultado.empty:
        return jsonify({"erro": "SSN não encontrado"}), 404
        
    linha = resultado.iloc[0]
    uc = linha['UC']
    motivo = linha['MOTIVO_DEVOLUCAO']
    disponivel = True if not uc and not motivo else False
    
    return jsonify({
        "ssn": linha['SSN'],
        "operadora": linha['OPERADORA'],
        "uc": uc,
        "motivo_devolucao": motivo,
        "disponivel": disponivel
    }), 200

# ==========================================
# ROTA 2: Contagem de chips disponíveis
# ==========================================
@app.route('/api/contagem', methods=['GET'])
def obter_contadores():
    if df is None:
        return jsonify({"erro": f"Erro interno no banco de dados: {load_error}"}), 500
    
    df_disponiveis = df[(df['UC'] == '') & (df['MOTIVO_DEVOLUCAO'] == '')]

    total_indisponiveis = len(df[(df['UC'] != '') | (df['MOTIVO_DEVOLUCAO'] != '')])
    
    contagem_bruta = df_disponiveis['OPERADORA'].str.upper().value_counts().to_dict()
    
    resultado = {
        "vivo": contagem_bruta.get("VIVO", 0),
        "claro": contagem_bruta.get("CLARO", 0),
        "tim": contagem_bruta.get("TIM", 0),
        "algar": contagem_bruta.get("ALGAR", 0),
        "indisponiveis": total_indisponiveis 
    }
    
    return jsonify(resultado), 200

# ==========================================
# ROTA 3: Listar todos os chips (para a tabela)
# ==========================================
@app.route('/api/todos', methods=['GET'])
def listar_todos():
    if df is None:
        return jsonify({"erro": f"Erro interno no banco de dados: {load_error}"}), 500

    df_view = df[['SSN', 'OPERADORA', 'UC', 'MOTIVO_DEVOLUCAO']].copy()

    df_view['disponivel'] = (df_view['UC'] == '') & (df_view['MOTIVO_DEVOLUCAO'] == '')
    
    # Retorna os primeiros 100 resultados para não travar o front
    limite = request.args.get('limite', default=100, type=int)
    registros = df_view.head(limite).to_dict(orient='records')
    
    return jsonify(registros), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)