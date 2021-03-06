import "monaco-editor";

import IRichLanguageConfiguration = monaco.languages.LanguageConfiguration;
import ILanguage = monaco.languages.IMonarchLanguage;
import IModel = monaco.editor.IModel;
import IPosition = monaco.IPosition;

let completionItems: monaco.languages.CompletionItem[] = null;
function getCompletionItems() {
  const keyword = monaco.languages.CompletionItemKind.Keyword;
  if (completionItems) {
    return completionItems;
  }
  return completionItems = [
    
  ];
}

const LanguageConfiguration: IRichLanguageConfiguration = {
  // the default separators except `@$`
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  // comments: {
  //   lineComment: '//',
  //   blockComment: ['/*', '*/'],
  // },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' },
    { open: '<', close: '>' },
  ]
};

const MonarchDefinitions = {
  // Set defaultToken to invalid to see what you do not tokenize yet
  // defaultToken: 'invalid',

  keywords: [
    'function', 'jump'
  ],

  typeKeywords: [
    'i32', 'i64', 'f32', 'f64'
  ],

  operators: [
    // '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    // '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    // '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    // '%=', '<<=', '>>=', '>>>='
  ] as any,

  // brackets: [
  //   ['(', ')', 'bracket.parenthesis'],
  //   ['{', '}', 'bracket.curly'],
  //   ['[', ']', 'bracket.square']
  // ],

  // we include these common regular expressions
  // symbols: /[=><!~?:&|+\-*\/\^%]+/,
  symbols:  /[=><~&|+\-*\/%@#]+/,

  // C# style strings
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer for our languages
  tokenizer: {
    root: [
      // identifiers and keywords
      [/[a-z_$][\w$\.]*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@default': 'type.identifier'
        }
      }],
      // [/[A-Z][\w\$]*/, 'type.identifier' ],  // to show class names nicely

      // // whitespace
      // { include: '@whitespace' },

      // // delimiters and operators
      // [/[{}()\[\]]/, '@brackets'],
      // [/[<>](?!@symbols)/, '@brackets'],
      // [/@symbols/, { cases: { '@operators': 'operator',
      //                         '@default'  : '' } } ],

      // // @ annotations.
      // // As an example, we emit a debugging log message on these tokens.
      // // Note: message are supressed during the first load -- change some lines to see them.
      // [/@\s*[a-zA-Z_\$][\w\$]*/, { token: 'annotation', log: 'annotation token: $0' }],

      // // numbers
      // [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      // [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      // // delimiter: after number because of .\d floats
      // [/[;,.]/, 'delimiter'],

      // strings
      // [/"([^"\\]|\\.)*$/, 'string.invalid' ],  // non-teminated string
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

      // // characters
      // [/'[^\\']'/, 'string'],
      // [/(')(@escapes)(')/, ['string','string.escape','string']],
      // [/'/, 'string.invalid']

      [/[{}()\[\]]/, '@brackets']
    ] as any,

    // comment: [
    //   [/[^\/*]+/, 'comment'],
    //   // [/[^\/*]+/, 'comment'],
    //   // [/\/\*/, 'comment', '@push'],    // nested comment
    //   // ["\\*/", 'comment', '@pop'],
    //   // [/[\/*]/, 'comment']
    // ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/;.*$/,    'comment']
      // [/\/\*/, 'comment', '@comment'],
      // [/\/\/.*$/, 'comment'],
    ],
  },
};

export const Cton = {
  MonarchDefinitions,
  LanguageConfiguration,
  CompletionItemProvider: {
    provideCompletionItems: function (model: IModel, position: IPosition) {
      return getCompletionItems();
    }
  },
  HoverProvider: {
    provideHover: function (model: IModel, position: IPosition) {
      return {
        range: new monaco.Range(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount())),
        contents: [
          '**DETAILS**',
          { language: 'html', value: "TODO" }
        ]
      }
    }
  }
}