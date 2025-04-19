module.exports = {
  plugins: [
    'react-native-reanimated/plugin',
    ["react-native-worklets-core/plugin", { processNestedWorklets: true }],
  ],
  presets: ['module:@react-native/babel-preset'],
};
