# Gestão de Chips Utilizados em Telemetria

Este é um projeto full-stack desenvolvido para o controle, rastreio e gestão da logística de chips (SIM cards) utilizados em leituras remotas de consumo de energia. A aplicação permite realizar consultas, via SSN (SIM Serial Number), atualizar status de chips e realizar o cadastro de novos chips.    

Além da interface de consulta utilizada em operações em campo, a aplicação conta com um painel administrativo para gestão em massa, geração de relatórios e controle de estoque.  

## Funcionalidades

### Página Inicial 

- **Busca por SSN**: O usuário pode buscar um chip informando o código SSN completo ou seus últimos 8 dígitos para verificar seu status atual (Disponível, Em mãos, Instalado ou Indisponível);
- **Painel de Contagens (Dashboard)**: Exibição em tempo real do volume de chips disponíveis separados por operadora (VIVO, CLARO, TIM, ALGAR e OI), além dos totais de chips instalados, indisponíveis e em mãos;
- **Cadastro de Chip**: Permite adicionar um chip que ainda não consta na base de dados. É necessário informar o SSN, a operadora e, opcionalmente, a UC/SS/Protocolo (caso o chip esteja instalado), o motivo da devolução e o colaborador responsável por receber o chip;
- **Atualização de Status e Bloqueio de Segurança**: O colaborador pode atualizar o chip informando a UC de instalação ou o motivo de devolução. Uma vez atualizado para "Instalado" ou "Indisponível", o chip é bloqueado para novas alterações, garantindo a integridade do histórico.

### Área Administrativa

- **Tabela de Chips**: Visão completa em formato de tabela de todos os chips cadastrados no sistema;
- **Edição sem Bloqueios**: Administradores podem corrigir dados de qualquer chip (SSN, Operadora, UC, Motivo, Colaborador) ilimitadamente, sem os bloqueios aplicados na página inicial;
- **Upload Massivo via CSV**: Ferramenta para importação de vários chips de uma só vez através de um arquivo .csv, com verificação automática para ignorar chips já existentes;
- **Download de Relatório**: Geração e exportação da base de dados completa em formato .csv para análises externas.

## Tecnologias Utilizadas

### Frontend

- **React.js (Vite)**: Biblioteca principal para a construção da interface de usuário interativa e componentizada;
- **CSS Puro**: Estilização desenvolvida do zero (App.css e index.css) com design responsivo, modais customizados e feedback visual de status (cores em formato de badges).

### Backend

- **Python**: Linguagem base do servidor;
- **Flask**: Framework micro-web utilizado para criação e roteamento da API RESTful;
- **Pandas**: Biblioteca de manipulação de dados utilizada ativamente nas rotas administrativas para leitura, filtragem e geração dos relatórios CSV;
- **Supabase**: Banco de dados PostgreSQL utilizado para persistência dos registros na tabela bd_chips.
