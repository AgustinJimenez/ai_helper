/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.interview-helper',
  productName: 'Interview Helper',
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
