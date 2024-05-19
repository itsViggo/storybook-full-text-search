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
      const searchData = files.map((file) => {
        const title = getTitle(file);
        return {
          url: getUrl(title),
          title,
          data: getSearchMetadata(file)
        }
      })
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
      }
      fs.writeFileSync(path.join(publicDir, 'searchData.json'), JSON.stringify(searchData));
    },
  } as any;
}

function getUrl(title: string): string {
  return `/?path=/docs/${title.replace(/[/ ]/g, '-').toLowerCase()}--docs`;
}

function getTitle(filePath: string): string {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const relatedStory = /<Meta of={(.*)}/.exec(fileContent)

  if (relatedStory) {
    const importedFileRegExp = new RegExp(String.raw`import \* as ${relatedStory[1]} from ['"](.*)['"]`);
    const importedFile = importedFileRegExp.exec(fileContent)[1];
    let storyFilePath = path.join(filePath, '..', importedFile)
    const storyFiles = globSync(`${storyFilePath}.*`);
    const storyFileContent = fs.readFileSync(storyFiles[0], 'utf-8');
    const storyTitle = /title: ['"](.*)['"]/.exec(storyFileContent);
    return storyTitle[1];
  } else {
    const title = /<Meta title=["'](.*)["']/.exec(fileContent);
    if (title) {
      return title[1];
    } else {
      return '';
    }
  }
}

function getSearchMetadata(file: string) {
  const fileContent = fs.readFileSync(file, 'utf-8')
  const clean = fileContent
    .replace(/import.*/g, '')
    .replace(/(\r\n|\n|\r)/gm, '')
    .replace(/<style>.*<\/style>/gs, '')
    .replace(/<[^>]*>/gs, '');

  return clean;

}
