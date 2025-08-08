const { resolve } = require("path");

const project = resolve(__dirname, "tsconfig.json");

module.exports = {
  root: true,
  extends: [],
  parserOptions: {
    project,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [".eslintrc.js"],
};
