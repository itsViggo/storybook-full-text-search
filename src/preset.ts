// You can use presets to augment the Storybook configuration
// You rarely want to do this in addons,
// so often you want to delete this file and remove the reference to it in package.json#exports and package.json#bunder.nodeEntries
// Read more about presets at https://storybook.js.org/docs/addons/writing-presets
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';

export function previewAnnotations(entry: any[] = []) {
  return [...entry, require.resolve("../dist/preview.js")];
}

export function managerEntries(entry: any[] = []) {
  return [...entry, require.resolve("../dist/manager.js")];
}


export const viteFinal = async (config: any) => {
  config.plugins = config.plugins || [];
  config.plugins.push(viteStorybookFullTextSearchPlugin(config));

  return config;
};

export const webpack = async (config: any) => {
  console.log("This addon is augmenting the Webpack config");
  return config;
};

function viteStorybookFullTextSearchPlugin(options: any) {
  let publicDir: string;
  let rootDir: string;
  let files: string[];

  return {
    name: "vite-storybook-full-text-search-plugin",
    configResolved(resolvedConfig: any) {
      publicDir = resolvedConfig.publicDir;
      rootDir = resolvedConfig.root;
    },
    transform: async function () {
      const files = globSync('**/*.mdx', { ignore: ['**/node_modules/**', '**/storybook-static/**', '**/*.chunk.*'] });
      const searchData = files.map((file) => ({
        url: getUrl(file),
        data: fs.readFileSync(file, 'utf-8')
      }))
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      fs.writeFileSync(path.join(publicDir, 'searchData.json'), JSON.stringify(searchData));
    },
  } as any;
}

function getUrl(filePath: string): string {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const relatedStory = /<Meta of={(.*)}/.exec(fileContent)

  if (relatedStory) {
    const importedFileRegExp = new RegExp(String.raw`import \* as ${relatedStory[1]} from ['"](.*)['"]`);
    const importedFile = importedFileRegExp.exec(fileContent)[1];
    let storyFilePath = path.join(filePath, '..', importedFile)
    const storyFiles = globSync(`${storyFilePath}.*`);
    const storyFileContent = fs.readFileSync(storyFiles[0], 'utf-8');
    const storyTitle = /title: ['"](.*)['"]/.exec(storyFileContent);
    return `/?path=/docs/${storyTitle[1].replace(/[/ ]/g, '-').toLowerCase()}--docs`;
  } else {
    const title = /<Meta title=["'](.*)["']/.exec(fileContent);
    if (title) {
      return `/?path=/docs/${title[1].replace(/[/ ]/g, '-').toLowerCase()}--docs`;
    } else {
      return '';
    }
  }
}
