module.exports = {
  extends: '@ethereumjs/eslint-config-defaults',
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  env: {
    mocha: true,
    es2020: true
  },
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
  },
}
