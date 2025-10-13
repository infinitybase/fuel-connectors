# 🚀 Deployment Guide - React App

Este guia explica como fazer o deploy do `react-app` no AWS Amplify.

## 📋 Pré-requisitos

Este app é parte de um **monorepo pnpm** e depende de pacotes do workspace:
- `@fuels/connectors`
- `@fuel-connectors/bako-predicate-connector`
- `@fuels/react`

## ⚙️ Configuração do Amplify

### 1. Preparar o Repositório

Antes do primeiro deploy, execute:

```bash
# Da raiz do repositório fuel-connectors
./scripts/prepare-deploy.sh
```

Este script:
- Remove a referência local do `bakosafe` (desenvolvimento)
- Instala a versão do npm do `bakosafe`
- Rebuilda os pacotes necessários

Depois, commite as mudanças:
```bash
git add -A
git commit -m "chore: prepare for amplify deployment"
git push
```

### 2. Configuração no Console do Amplify

#### Build Settings
- **Build image**: Amazon Linux 2023
- **Node.js version**: 22.x

#### Environment Variables
```
NODE_VERSION=22
PNPM_VERSION=9.5.0
CI=true

# Dynamic Labs (obrigatório)
VITE_DYNAMIC_ENVIRONMENT_ID=your_environment_id_here

# Fuel Network
VITE_FUEL_PROVIDER_URL=https://mainnet.fuel.network
VITE_FUEL_CHAIN_ID=9889
VITE_FUEL_CHAIN_NAME=Fuel Mainnet

# WalletConnect (opcional)
VITE_APP_WC_PROJECT_ID=your_project_id_here

# Contracts (opcional, para testar funcionalidades)
VITE_COUNTER_CONTRACT_ID=your_contract_id
VITE_CUSTOM_ASSET_ID=your_asset_id
VITE_CUSTOM_ASSET_SYMBOL=SYMBOL
```

#### App Settings
- **App root directory**: (deixe vazio)
- **Build command**: (usa o amplify.yml)
- **Output directory**: `examples/react-app/dist`

### 3. Build Specification

O arquivo `amplify.yml` na raiz do repositório já está configurado:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm@9.5.0
        - pnpm install --frozen-lockfile
        
    build:
      commands:
        - pnpm --filter @fuels/connectors build
        - pnpm --filter @fuel-connectors/bako-predicate-connector build
        - pnpm --filter @fuels/react build
        - pnpm --filter react-app build
        
  artifacts:
    baseDirectory: examples/react-app/dist
    files:
      - '**/*'
```

## 🔄 Workflow de Deploy

### Para Deploy de Produção:
1. Fazer mudanças no código
2. Testar localmente: `pnpm --filter react-app dev`
3. Testar build: `pnpm --filter react-app build`
4. Commit e push para a branch principal
5. Amplify faz deploy automaticamente

### Para Desenvolvimento Local com bako-safe:
Se você precisa desenvolver com logs de debug do bako-safe:

```bash
# Instalar versão local
cd packages/bako-predicate-connector
pnpm remove bakosafe
pnpm add file:../../../../../bsafe/bako-safe/packages/sdk

# Build local
pnpm build

# Testar
cd ../../examples/react-app
pnpm dev
```

⚠️ **Importante**: Não commite com a versão local instalada!

## 🐛 Troubleshooting

### Build Falha: "bakosafe not found"
- Verifique se rodou o script `prepare-deploy.sh`
- Verifique o `package.json` do `bako-predicate-connector`
- Não deve ter `file:` na especificação do bakosafe

### Build Falha: "workspace packages not found"
- O build dos pacotes workspace deve vir antes do react-app
- Ordem correta no `amplify.yml`:
  1. @fuels/connectors
  2. @fuel-connectors/bako-predicate-connector
  3. @fuels/react
  4. react-app

### Runtime Error: Dynamic Labs
- Verifique se `VITE_DYNAMIC_ENVIRONMENT_ID` está configurado
- Verifique se o domínio do Amplify está configurado no Dynamic Labs

## 📚 Recursos

- [AWS Amplify Docs](https://docs.amplify.aws/)
- [pnpm Workspace](https://pnpm.io/workspaces)
- [Dynamic Labs](https://docs.dynamic.xyz/)

