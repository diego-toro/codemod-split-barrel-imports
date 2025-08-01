import babylon from "@babel/parser";

// These are the options that were the default of the Babel5 parse function
// see https://github.com/babel/babel/blob/5.x/packages/babel/src/api/node.js#L81
const options = {
  sourceType: "module",
  allowHashBang: true,
  ecmaVersion: Infinity,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  startLine: 1,
  tokens: true,
  plugins: [
    "estree",
    "jsx",
    "asyncGenerators",
    "classProperties",
    "doExpressions",
    "exportExtensions",
    "functionBind",
    "functionSent",
    "objectRestSpread",
    "dynamicImport",
    "nullishCoalescingOperator",
    "optionalChaining",
    ["decorators", { decoratorsBeforeExport: false }],
    "flow",
  ],
};

/**
 * Wrapper to set default options. Doesn't accept custom options because in that
 * case babylon should be used instead.
 */
export default function () {
  return {
    parse(code) {
      return babylon.parse(code, options);
    },
  };
}
