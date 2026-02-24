# LeadHelper

Aplicação de gestão de equipes para Tech Leads desenvolvida em Electron.

## 🛠️ Tecnologias

- **Electron** - Framework para aplicações desktop
- **React** - Biblioteca para interface do usuário
- **Vite** - Build tool e dev server
- **TypeORM** - ORM para banco de dados
- **Better SQLite3** - Banco de dados local
- **Material-UI** - Biblioteca de componentes
- **Redux Toolkit** - Gerenciamento de estado
- **React Hook Form** - Gerenciamento de formulários

## 📋 Funcionalidades

- Gestão de equipes
- Gestão de membros da equipe
- Alocação de membros em equipes com período
- Gestão de cargos/posições
- Gestão de sprints
- Gestão de tarefas
- Alocação de membros em tarefas
- Visualização em Gantt
- Integração com Azure DevOps
- Dashboard com resumo das equipes

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm (geralmente vem com o Node.js)

## 🚀 Configuração do Ambiente de Desenvolvimento

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd leadhelper
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

## 🏗️ Build para Produção

### Build para Windows

```bash
npm run build:win
```

### Build para Linux

```bash
npm run build:linux
```

### Build para macOS

```bash
npm run build:mac
```

## 📁 Estrutura do Projeto

```
leadhelper/
├── src/
│   ├── main/          # Processo principal do Electron
│   ├── preload/       # Scripts de preload
│   ├── renderer/      # Interface React (processo de renderização)
│   └── shared/        # Código compartilhado
├── out/               # Arquivos compilados
├── dist/              # Executáveis gerados
└── package.json
```

## 📝 Licença

Versão: 1.0.0
