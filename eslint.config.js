import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import stylistic from "@stylistic/eslint-plugin";
import eslintImport from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(`ESLint config directory: ${__dirname}`);

export default [
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],

    settings: {
      react: {
        version: "detect",
      },
    },

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: (() => {
          const tsconfigPath = path.resolve(__dirname, "tsconfig.eslint.json");
          console.log(`ESLint using tsconfig at: ${tsconfigPath}`);
          return [tsconfigPath];
        })(),
        warnOnUnsupportedTypeScriptVersion: false,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    plugins: {
      tseslint,
      "@stylistic": stylistic,
      import: eslintImport,
    },

    rules: {
      "array-bracket-spacing": ["error", "never"],
      "comma-dangle": ["error", {
        arrays: "always-multiline",
        objects: "always-multiline",
        imports: "always-multiline",
        exports: "always-multiline",
        functions: "always-multiline",
      }],
      "comma-spacing": ["error", { before: false, after: true }],
      "comma-style": ["error", "last"],
      "dot-location": ["error", "property"],
      "eol-last": ["error", "always"],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "max-len": [2, 160, 2, { ignoreUrls: true }],
      "no-async-promise-executor": "off",
      "no-console": "off",
      "no-debugger": "warn",
      "no-implicit-globals": "error",
      "no-implied-eval": "error",
      "no-labels": "error",
      "no-loop-func": "error",
      "no-multiple-empty-lines": ["error", { max: 1, maxEOF: 1 }],
      "no-nested-ternary": "off",
      "no-param-reassign": ["warn", { props: false }],
      "no-plusplus": "off",
      "no-trailing-spaces": "error",
      "no-underscore-dangle": ["error", { allow: ["__dirname"], allowAfterThis: true }],
      "no-var": "error",
      "object-curly-newline": ["error", { multiline: true, minProperties: 8, consistent: true }],
      "prefer-const": "error",
      "space-in-parens": ["error", "never"],
      "space-infix-ops": ["error", { int32Hint: true }],
      "space-unary-ops": "error",

      "no-unused-vars": "off",
      "tseslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "no-array-constructor": "off",
      "tseslint/no-array-constructor": "error",
      "no-useless-constructor": "off",
      "tseslint/no-useless-constructor": "error",
      "no-dupe-class-members": "off",
      "tseslint/no-dupe-class-members": "error",
      "default-param-last": "off",
      "tseslint/default-param-last": "error",
      "dot-notation": "off",
      "tseslint/dot-notation": ["error", { allowKeywords: true }],
      "no-empty-function": "off",
      "tseslint/no-empty-function": ["error", { allow: ["arrowFunctions", "functions", "methods"] }],
      "no-magic-numbers": "off",
      "tseslint/no-magic-numbers": ["off", { ignore: [], ignoreArrayIndexes: true, enforceConst: true, detectObjects: false }],
      "no-redeclare": "off",
      "tseslint/no-redeclare": "error",
      "no-unused-expressions": "off",
      "tseslint/no-unused-expressions": ["error", { allowShortCircuit: false, allowTernary: false, allowTaggedTemplates: false }],
      "no-return-await": "off",
      "tseslint/return-await": "error",
      "naming-convention": "off",
      "tseslint/naming-convention": "off",
      "no-return-await": "off",
      "tseslint/return-await": "off",

      "@stylistic/indent": ["error", 2, {
        SwitchCase: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 1,
        FunctionDeclaration: {
          parameters: 1,
          body: 1,
        },
        FunctionExpression: {
          parameters: 1,
          body: 1,
        },
        CallExpression: {
          arguments: 1,
        },
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        flatTernaryExpressions: false,
        ignoredNodes: [
          "JSXElement",
          "JSXElement > *",
          "JSXAttribute",
          "JSXIdentifier",
          "JSXNamespacedName",
          "JSXMemberExpression",
          "JSXSpreadAttribute",
          "JSXExpressionContainer",
          "JSXOpeningElement",
          "JSXClosingElement",
          "JSXFragment",
          "JSXOpeningFragment",
          "JSXClosingFragment",
          "JSXText",
          "JSXEmptyExpression",
          "JSXSpreadChild",
        ],
        ignoreComments: false,
      }],
      "@stylistic/keyword-spacing": ["error", {
        before: true,
        after: true,
        overrides: { return: { after: true }, throw: { after: true }, case: { after: true } },
      }],
      "@stylistic/lines-between-class-members": ["error", { enforce: [{ blankLine: "always", prev: "*", next: "method" }] }, { exceptAfterSingleLine: true }],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/quote-props": ["error", "as-needed"],
      "@stylistic/require-await": "off",
      "@stylistic/semi": ["error", "always"],
      "@stylistic/no-extra-semi": "error",
      "@stylistic/space-before-blocks": "error",
      "@stylistic/space-before-function-paren": ["error", { anonymous: "always", named: "never", asyncArrow: "always" }],

      "no-throw-literal": "off",
      "@/no-throw-literal": "error",
      "func-call-spacing": "off",
      "@/func-call-spacing": ["error", "never"],

      "import/prefer-default-export": "warn",
    },

    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "editor/**",
      "**/*.ref.js",
    ],
  },
];
