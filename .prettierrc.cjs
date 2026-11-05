module.exports = {
  plugins: [
    require.resolve("prettier-plugin-java", { paths: [__dirname + "/frontend"] }),
    require.resolve("@prettier/plugin-xml", { paths: [__dirname + "/frontend"] }),
  ],
  printWidth: 100,
  tabWidth: 2,
  singleAttributePerLine: true,
  endOfLine: "lf",
  overrides: [{ files: "*.java", options: { tabWidth: 4 } }],
};
