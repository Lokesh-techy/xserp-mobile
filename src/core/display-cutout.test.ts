/** @author Lokesh */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyCutoutMode } = require('../../plugins/with-display-cutout') as { applyCutoutMode: (s: unknown) => { resources: { style: { $: { name: string }; item: { $: { name: string }; _: string }[] }[] } } };

test('the Android app theme draws into the display cutout', () => {
  const styles = { resources: { style: [{ $: { name: 'AppTheme', parent: 'Theme.EdgeToEdge' }, item: [] }] } };
  const out = applyCutoutMode(styles);
  const theme = out.resources.style.find((s) => s.$.name === 'AppTheme')!;
  expect(theme.item).toEqual(expect.arrayContaining([expect.objectContaining({ $: expect.objectContaining({ name: 'android:windowLayoutInDisplayCutoutMode' }), _: 'shortEdges' })]));
});
