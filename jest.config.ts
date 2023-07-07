export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  moduleDirectories: ["node_modules", "<rootDir>"],
  testEnvironment: "jsdom",
  setupFiles: ["fake-indexeddb/auto"],
  transformIgnorePatterns: ["node_modules/(?!(sinon)/)"],
};
