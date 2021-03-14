module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: "babel-eslint",
  extends: ["prettier", "plugin:prettier/recommended"],
  plugins: ["prettier"],
};
