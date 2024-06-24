import { promises as fs } from 'fs';
import path from 'path';

// 定义docs文件夹路径
const docsPath = path.join(process.cwd(), 'src', 'script', 'docs');
// 定义输出文件夹路径
const outputPath = path.join(process.cwd(), 'src', 'script', 'docs', 'output');

async function readMarkdownFiles() {
  const result = {};

  try {
    const files = await fs.readdir(docsPath, { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory()) {
        const category = file.name;
        const categoryPath = path.join(docsPath, category);
        const markdownFiles = await fs.readdir(categoryPath);

        for (const markdownFile of markdownFiles) {
          if (path.extname(markdownFile) === '.md') {
            const filePath = path.join(categoryPath, markdownFile);
            const content = await fs.readFile(filePath, 'utf8');
            // 去掉文件名中的.md后缀
            const fileNameWithoutExt = path.basename(markdownFile, '.md');

            if (!result[category]) {
              result[category] = [];
            }

            result[category].push({
              name: fileNameWithoutExt,
              prompt: content
            });
          }
        }
      }
    }

    // 确保output目录存在
    await fs.mkdir(outputPath, { recursive: true });

    // 将结果写入到一个JSON文件中，文件放在output目录下
    await fs.writeFile(path.join(outputPath, 'result.json'), JSON.stringify(result, null, 2));
    console.log('Markdown files have been successfully processed and saved to result.json in the output directory.');
  } catch (err) {
    console.error('Error processing markdown files:', err);
  }
}

readMarkdownFiles();