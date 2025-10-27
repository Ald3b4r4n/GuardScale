import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Node.js globals
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",

        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        alert: "readonly",
        confirm: "readonly",
        requestAnimationFrame: "readonly",

        // removed io global to avoid no-redeclare
      },
    },
    rules: {
      // Possible Errors
      "no-console": "warn",
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-empty": "warn",
      "no-extra-semi": "error",
      "no-unreachable": "error",
      "valid-typeof": "error",

      // Best Practices
      curly: "error",
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-multi-spaces": "error",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-use-before-define": [
        "error",
        {
          functions: false,
          classes: true,
          variables: true,
        },
      ],

      // Stylistic Issues
      indent: ["error", 2, { SwitchCase: 1 }],
      quotes: ["error", "single", { allowTemplateLiterals: true }],
      semi: ["error", "always"],
      "comma-dangle": ["error", "never"],
      "brace-style": ["error", "1tbs"],
      camelcase: ["warn", { properties: "never" }],
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 2 }],

      // ES6
      "arrow-spacing": "error",
      "no-var": "error",
      "prefer-const": "warn",
      "template-curly-spacing": "error",
    },
    files: ["**/*.js"],
    ignores: ["node_modules/**", "dist/**", "build/**", "*.min.js"],
  },
  {
    // Configuração específica para arquivos do servidor (Node.js)
    files: ["server.js", "src/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        // Node.js específicos
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        global: "readonly",
      },
    },
    rules: {
      "no-console": "off", // Permitir console.log no servidor
    },
  },
  {
    // Configuração específica para arquivos do frontend
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        // Browser específicos
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        alert: "readonly",
        confirm: "readonly",
        console: "readonly",
        FormData: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Notification: "readonly",
        location: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
