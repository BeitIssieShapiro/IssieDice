module.exports = {
  plugins: [
    ["react-native-worklets-core/plugin", { processNestedWorklets: true }],
  ],
  presets: ['module:@react-native/babel-preset'],
};
