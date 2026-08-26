const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), filter, fileList);
    } else if (filter.test(file)) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = findFiles(directoryPath, /\.(ts|tsx)$/);

const replacements = [
  { from: /@\/types\/task/g, to: '@/features/tasks/types/task' },
  { from: /@\/api\/taskApi/g, to: '@/features/tasks/api/taskApi' },
  { from: /@\/hooks\/useTaskMutations/g, to: '@/features/tasks/hooks/useTaskMutations' },
  { from: /@\/hooks\/useTasks/g, to: '@/features/tasks/hooks/useTasks' },
  { from: /@\/hooks\/useTask"/g, to: '@/features/tasks/hooks/useTask"' },
  { from: /@\/components\/tasks\//g, to: '@/features/tasks/components/' },
  { from: /@\/components\/common\/RaceLabPanel/g, to: '@/components/common/RaceLabPanel' },
  { from: /\.\/apiClient/g, to: '../../api/apiClient' }, // taskApi is in features/tasks/api, apiClient is in src/api/apiClient
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  for (const r of replacements) {
    if (content.match(r.from)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
