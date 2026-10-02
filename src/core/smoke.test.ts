/** @author Lokesh */
import Constants from 'expo-constants';

test('expo config extra is available to the app', () => {
  expect(Constants.expoConfig?.extra?.serverUrl).toBe('https://dev.xserp.in');
});
