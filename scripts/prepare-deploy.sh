#!/bin/bash

# Script para preparar o repositório para deploy no Amplify
# Remove referências locais e reinstala versões do npm

set -e

echo "🔄 Preparando repositório para deploy..."

# Navegar para o diretório do bako-predicate-connector
cd packages/bako-predicate-connector

echo "📦 Removendo bakosafe local..."
pnpm remove bakosafe

echo "📥 Instalando bakosafe do npm..."
pnpm add bakosafe@0.2.0-beta.9

# Voltar para a raiz
cd ../..

echo "🔨 Fazendo rebuild dos pacotes..."
pnpm --filter @fuel-connectors/bako-predicate-connector build

echo "✅ Preparação concluída!"
echo ""
echo "⚠️  IMPORTANTE: Não esqueça de commitar as mudanças:"
echo "   git add -A"
echo "   git commit -m 'chore: prepare for amplify deployment'"
echo ""

