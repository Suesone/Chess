#!/bin/zsh
set -e
cd -- "${0:A:h}"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  print '请先安装 Node.js 24 或更新版本：https://nodejs.org/'
  print '安装后，再双击这个文件。'
  read '?按回车关闭…'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  print '首次启动，正在安装依赖（需要联网）…'
  npm ci
fi
npm run prepare:assets
print '正在启动初着。浏览器会自动打开；关闭此终端窗口即可停止服务。'
npm run dev -- --open
