import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building project for production...');
execSync('npm run build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(distDir, '404.html'));

console.log('📦 Pushing to gh-pages branch...');
const commands = [
  'git init',
  'git checkout -b gh-pages',
  'git add .',
  'git commit -m "deploy: update live site"',
  'git remote add origin https://github.com/MrRebrik28/zazozh.git',
  'git push -f origin gh-pages'
];

execSync(commands.join(' && '), { cwd: distDir, stdio: 'inherit' });
console.log('✅ Deployed successfully to https://mrrebrik28.github.io/zazozh/');
