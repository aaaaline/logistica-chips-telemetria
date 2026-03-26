from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client, Client
import pandas as pd
import os
import io
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# ==========================================
# CONFIGURAÇÃO DO SUPABASE
# ==========================================
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("SUPABASE_URL e SUPABASE_KEY não foram configuradas nas variáveis de ambiente.")
    supabase = None

def obter_status(uc, motivo):
    if uc and str(uc).strip() != '': return 'Reaproveitado'
    if motivo and str(motivo).strip() != '': return 'Indisponível'
    return 'Disponível'

def obter_data_hora_atual():
    return datetime.now(timezone.utc).isoformat()

# ==========================================
# ROTA 1: Buscar SSN específico
# ==========================================
@app.route('/api/busca', methods=['GET'])
def buscar():
    ssn_query = request.args.get('ssn')
    if not ssn_query: return jsonify({"erro": "O parâmetro 'ssn' é obrigatório"}), 400
        
    ssn_query = ssn_query.strip()
    
    res = supabase.table('bd_chips').select('*').ilike('ssn', f"%{ssn_query}%").execute()
    
    if not res.data:
        return jsonify({"erro": "SSN não encontrado"}), 404

    linha = res.data[0]
    uc = linha.get('uc') or ''
    motivo = linha.get('motivo_devolucao') or ''
    
    return jsonify({
        "ssn": linha.get('ssn', ''),
        "operadora": linha.get('operadora', ''),
        "uc": uc,
        "motivo_devolucao": motivo,
        "colaborador": linha.get('colaborador') or '', 
        "data_adicionado": linha.get('data_adicionado') or '', 
        "data_ultima_alteracao": linha.get('data_ultima_alteracao') or '', 
        "status": obter_status(uc, motivo),
        "bloqueado": True if uc != '' or motivo != '' else False 
    }), 200

# ==========================================
# ROTA 2: Contagens
# ==========================================
@app.route('/api/contagem', methods=['GET'])
def obter_contadores():
    try:
        f_uc = 'uc.is.null,uc.eq.'
        f_motivo = 'motivo_devolucao.is.null,motivo_devolucao.eq.'
        
        vivo = supabase.table('bd_chips').select('ssn', count='exact').eq('operadora', 'VIVO').or_(f_uc).or_(f_motivo).execute()
        claro = supabase.table('bd_chips').select('ssn', count='exact').eq('operadora', 'CLARO').or_(f_uc).or_(f_motivo).execute()
        tim = supabase.table('bd_chips').select('ssn', count='exact').eq('operadora', 'TIM').or_(f_uc).or_(f_motivo).execute()
        algar = supabase.table('bd_chips').select('ssn', count='exact').eq('operadora', 'ALGAR').or_(f_uc).or_(f_motivo).execute()

        reaproveitados = supabase.table('bd_chips').select('ssn', count='exact').neq('uc', '').execute()

        indisponiveis = supabase.table('bd_chips').select('ssn', count='exact').or_(f_uc).neq('motivo_devolucao', '').execute()
        
        return jsonify({
            "vivo": vivo.count or 0,
            "claro": claro.count or 0,
            "tim": tim.count or 0,
            "algar": algar.count or 0,
            "indisponiveis": indisponiveis.count or 0,
            "reaproveitados": reaproveitados.count or 0
        }), 200

    except Exception as e:
        print(f"Erro ao buscar contagens: {e}")
        return jsonify({"erro": "Falha interna ao contar chips"}), 500

# ==========================================
# ROTA 3: Listar todos (Com Limite)
# ==========================================
@app.route('/api/todos', methods=['GET'])
def listar_todos():
    limite = request.args.get('limite', default=100, type=int)
    
    res = supabase.table('bd_chips').select('*').limit(limite).execute()
    registros = res.data
    
    for req in registros:
        req['status'] = obter_status(req.get('uc', ''), req.get('motivo_devolucao', ''))
        req['SSN'] = req.pop('ssn', '')
        req['OPERADORA'] = req.pop('operadora', '')
        req['COLABORADOR'] = req.get('colaborador', '')

    return jsonify(registros), 200

# ==========================================
# ROTA 4: Atualizar Chip Existente (Eletricista)
# ==========================================
@app.route('/api/atualizar', methods=['POST'])
def atualizar():
    dados = request.json
    ssn = dados.get('ssn', '').strip()
    uc = dados.get('uc', '').strip()
    motivo = dados.get('motivo_devolucao', '').strip()
    colaborador = dados.get('colaborador', '').strip()

    if not ssn: return jsonify({"erro": "SSN é obrigatório"}), 400

    if uc != '':
        colaborador = ''

    if motivo != '' and colaborador == '':
        return jsonify({"erro": "Para colocar o chip como Indisponível (Motivo preenchido), selecione seu nome no campo Colaborador."}), 400

    res = supabase.table('bd_chips').select('*').eq('ssn', ssn).execute()
    if not res.data: return jsonify({"erro": "SSN não encontrado"}), 404
    
    chip_atual = res.data[0]
    
    if chip_atual.get('uc') != '' or chip_atual.get('motivo_devolucao') != '':
        return jsonify({"erro": "Este chip já foi alterado anteriormente e está BLOQUEADO."}), 403

    # ADICIONADO: Atualiza o campo data_ultima_alteracao
    supabase.table('bd_chips').update({
        'uc': uc,
        'motivo_devolucao': motivo,
        'colaborador': colaborador,
        'data_ultima_alteracao': obter_data_hora_atual() 
    }).eq('ssn', ssn).execute()

    return jsonify({"mensagem": "Status do chip atualizado com sucesso!"}), 200

# ==========================================
# ROTA 5: Cadastrar Novo Chip (Eletricista)
# ==========================================
@app.route('/api/adicionar', methods=['POST'])
def adicionar():
    dados = request.json
    ssn = dados.get('ssn', '').strip()
    operadora = dados.get('operadora', '').strip().upper()
    uc = dados.get('uc', '').strip()
    motivo = dados.get('motivo_devolucao', '').strip()
    colaborador = dados.get('colaborador', '').strip()

    if not ssn or not operadora: return jsonify({"erro": "SSN e Operadora são obrigatórios."}), 400

    if uc != '':
        colaborador = ''

    if motivo != '' and colaborador == '':
        return jsonify({"erro": "Para colocar o chip como Indisponível, selecione seu nome."}), 400
    if uc == '' and motivo == '' and colaborador == '':
        return jsonify({"erro": "Para cadastrar um novo chip Disponível, selecione seu nome."}), 400

    res = supabase.table('bd_chips').select('ssn').eq('ssn', ssn).execute()
    if res.data:
        return jsonify({"erro": f"O chip com SSN {ssn} já está cadastrado no sistema!"}), 409

    agora = obter_data_hora_atual()

    supabase.table('bd_chips').insert({
        'ssn': ssn,
        'operadora': operadora,
        'uc': uc,
        'motivo_devolucao': motivo,
        'colaborador': colaborador,
        'data_adicionado': agora,
        'data_ultima_alteracao': agora
    }).execute()

    return jsonify({"mensagem": "Novo chip cadastrado com sucesso!"}), 201

# ==========================================
# ROTAS DE ADMINISTRADORES
# ==========================================

@app.route('/api/admin/atualizar', methods=['POST'])
def admin_atualizar():
    dados = request.json
    ssn_original = dados.get('ssn_original', '').strip()
    novo_ssn = dados.get('ssn', '').strip()
    operadora = dados.get('operadora', '').strip().upper()
    uc = dados.get('uc', '').strip()
    motivo = dados.get('motivo_devolucao', '').strip()
    colaborador = dados.get('colaborador', '').strip()

    if not ssn_original: return jsonify({"erro": "SSN original é obrigatório"}), 400

    if uc != '':
        colaborador = ''

    try:
        supabase.table('bd_chips').update({
            'ssn': novo_ssn if novo_ssn else ssn_original,
            'operadora': operadora,
            'uc': uc,
            'motivo_devolucao': motivo,
            'colaborador': colaborador,
            'data_ultima_alteracao': obter_data_hora_atual()
        }).eq('ssn', ssn_original).execute()
        
        return jsonify({"mensagem": "Informações atualizadas com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": f"Erro ao atualizar: SSN não encontrado ou duplicado. Detalhes: {str(e)}"}), 400

@app.route('/api/admin/upload_csv', methods=['POST'])
def admin_upload_csv():
    if 'file' not in request.files:
        return jsonify({"erro": "Nenhum arquivo enviado"}), 400
    
    file = request.files['file']
    if file.filename == '' or not file.filename.endswith('.csv'):
        return jsonify({"erro": "O arquivo deve ser um CSV"}), 400

    try:
        conteudo_arquivo = file.stream.read().decode("utf-8-sig")
        stream = io.StringIO(conteudo_arquivo, newline=None)
        df_novo = pd.read_csv(stream, sep=';', dtype=str)
        
        df_novo.columns = df_novo.columns.str.strip().str.lower()
        df_novo.fillna('', inplace=True)
        
        colunas_esperadas = ['ssn', 'operadora', 'uc', 'motivo_devolucao']
        for col in colunas_esperadas:
            if col not in df_novo.columns:
                return jsonify({"erro": f"O CSV enviado está sem a coluna obrigatória: {col.upper()}"}), 400
        
        df_novo['ssn'] = df_novo['ssn'].str.strip()
        df_novo['operadora'] = df_novo['operadora'].str.upper()
        
        if 'colaborador' not in df_novo.columns:
            df_novo['colaborador'] = ''

        df_novo.loc[df_novo['uc'] != '', 'colaborador'] = ''

        ssns_no_csv = df_novo['ssn'].tolist()
        ssns_existentes = set()
        
        for i in range(0, len(ssns_no_csv), 200):
            chunk = ssns_no_csv[i:i+200]
            res = supabase.table('bd_chips').select('ssn').in_('ssn', chunk).execute()
            for row in res.data:
                ssns_existentes.add(row['ssn'])
        df_inserir = df_novo[~df_novo['ssn'].isin(ssns_existentes)][colunas_esperadas + ['colaborador']].copy()
        
        agora = obter_data_hora_atual()
        df_inserir['data_adicionado'] = agora
        df_inserir['data_ultima_alteracao'] = agora
        
        records = df_inserir.to_dict(orient='records')
        qtd_inserida = len(records)
        qtd_ignorada = len(df_novo) - qtd_inserida
        
        if qtd_inserida == 0:
            return jsonify({"mensagem": f"Nenhum chip novo inserido. Todos os {qtd_ignorada} chips já existiam no sistema."}), 200

        for i in range(0, len(records), 1000):
            supabase.table('bd_chips').insert(records[i:i+1000]).execute()
        
        return jsonify({
            "mensagem": f"Operação realizada com sucesso! {qtd_inserida} chips adicionados ({qtd_ignorada} já existem na base de dados)."
        }), 200

    except Exception as e:
        return jsonify({"erro": f"Erro ao processar arquivo: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
