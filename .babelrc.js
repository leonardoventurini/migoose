const { resolve } = require('path')

module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
        },
      },
    ],
    [
      'mock-imports',
      {
        redirects: [
          {
            pattern: 'migoose',
            location: resolve(process.cwd(), './src/index.ts'),
          },
        ],
      },
    ],
  ],
}
