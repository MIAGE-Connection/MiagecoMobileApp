// Tests unitaires de la logique pure (règles des jeux, calcul de fin d'adhésion) : aucun rendu React Native.
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: { module: 'commonjs', target: 'es2019', strict: true, esModuleInterop: true, skipLibCheck: true },
        diagnostics: true,
      },
    ],
  },
};
