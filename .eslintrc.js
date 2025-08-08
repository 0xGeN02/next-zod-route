import { resolve } from "path";

const project = resolve(__dirname, "tsconfig.json");

export const root = true;
export const parserOptions = {
  project,
};
export const settings = {
  "import/resolver": {
    typescript: {
      project,
    },
  },
};
export const ignorePatterns = [".eslintrc.js"];
