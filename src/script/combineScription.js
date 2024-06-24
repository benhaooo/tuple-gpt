import { promises as fs } from 'fs';
import path from 'path';

const promptsPath = path.join(process.cwd(), 'src', 'script', 'output', 'result.json');
const pjson = await fs.readFile(promptsPath, 'utf8')
const promptsData = JSON.parse(pjson);

const scriptsPath = path.join(process.cwd(), 'src', 'script', 'other', 'scription.txt');
const sjson = await fs.readFile(scriptsPath, 'utf8')
sjson.split('\n\n').forEach(line => {
    let parts = line.split(':');
    let key = parts[0].trim();
    let value = parts[1].trim().replace(/"/g, '');
    promptsData["写作"].find(item => item.name === key).scription = value;
})
const outputPath = path.join(process.cwd(), 'src', 'script', 'output');
fs.writeFile(path.join(outputPath, 'combine.json'), JSON.stringify(promptsData, null, 2));
