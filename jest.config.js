/** @author Lokesh */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-gifted-charts|gifted-charts-core|zustand|@tanstack/.*|standard-navigation))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.superpowers/'],
};
