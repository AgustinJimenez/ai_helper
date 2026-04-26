/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.agustinjimenez.aihelper',
  productName: 'AI Helper',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: ['out/**/*'],
  mac: {
    category: 'public.app-category.productivity',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }]
  }
}
