const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Adiciona a raiz do monorepo aos diretórios monitorados pelo Metro
config.watchFolders = [workspaceRoot];

// Informa ao Metro onde buscar pacotes do node_modules (na pasta do app e na raiz do monorepo)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Opcional, mas recomendado em monorepos para evitar dependências cruzadas acidentais
// config.resolver.disableHierarchicalLookup = true;

module.exports = config;
