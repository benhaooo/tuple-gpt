import katex from 'katex';

// 定义 KaTeX 选项类型
interface KatexOptions {
  displayMode?: boolean;
  [key: string]: any;
}

// 定义 Token 类型
interface KatexToken {
  type: string;
  raw: string;
  text: string;
  displayMode: boolean;
}

// 定义渲染器函数类型
type RendererFunction = (token: KatexToken) => string;

// 定义扩展返回类型
interface KatexExtension {
  name: string;
  level: 'inline' | 'block';
  start?: (src: string) => number | undefined;
  tokenizer: (src: string, tokens?: any[]) => KatexToken | undefined;
  renderer: RendererFunction;
}

// 定义插件返回类型
interface KatexPlugin {
  extensions: KatexExtension[];
}

const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:？！。，：]|$)/;
const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

export default function(options: KatexOptions = {}): KatexPlugin {
  return {
    extensions: [
      inlineKatex(options, createRenderer(options, false)),
      blockKatex(options, createRenderer(options, true))
    ]
  };
}

function createRenderer(options: KatexOptions, newlineAfter: boolean): RendererFunction {
  return (token: KatexToken): string => {
    return katex.renderToString(token.text, { ...options, displayMode: token.displayMode }) + (newlineAfter ? '\n' : '');
  };
}

function inlineKatex(options: KatexOptions, renderer: RendererFunction): KatexExtension {
  return {
    name: 'inlineKatex',
    level: 'inline',
    start(src: string): number | undefined {
      let index: number;
      let indexSrc = src;

      while (indexSrc) {
        index = indexSrc.indexOf('$');
        if (index === -1) {
          return undefined;
        }
        if (indexSrc.charAt(index - 1) === ' ') {
          const possibleKatex = indexSrc.substring(index);

          if (possibleKatex.match(inlineRule)) {
            return index;
          }
        }

        indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
      }
      return undefined;
    },
    tokenizer(src: string, tokens?: any[]): KatexToken | undefined {
      const match = src.match(inlineRule);
      if (match) {
        console.log("🚀 ~inline~ tokenizer ~ match:", match);
        return {
          type: 'inlineKatex',
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2
        };
      }
      return undefined;
    },
    renderer
  };
}

function blockKatex(options: KatexOptions, renderer: RendererFunction): KatexExtension {
  return {
    name: 'blockKatex',
    level: 'block',
    tokenizer(src: string, tokens?: any[]): KatexToken | undefined {
      const match = src.match(blockRule);
      if (match) {
        return {
          type: 'blockKatex',
          raw: match[0],
          text: match[2].trim(),
          displayMode: match[1].length === 2
        };
      }
      return undefined;
    },
    renderer
  };
}
