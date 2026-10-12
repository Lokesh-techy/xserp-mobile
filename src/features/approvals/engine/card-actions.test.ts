/** @author Lokesh */
import { isInstant, splitActions, type CardAction } from './card-actions';

const act = (key: string, tone: CardAction['tone']): CardAction => ({
  key,
  label: key,
  icon: 'ellipse-outline',
  tone,
  onPress: () => {},
  a11y: key,
});

test('approve is the labelled action; reject is an icon; the rest go behind more', () => {
  const { main, icons, more } = splitActions([
    act('review', 'ghost'),
    act('reject', 'danger'),
    act('approve', 'success'),
    act('pdf', 'ghost'),
  ]);
  expect(main?.key).toBe('approve');
  expect(icons.map((a) => a.key)).toEqual(['reject']);
  expect(more.map((a) => a.key)).toEqual(['review', 'pdf']);
});

test('up to two extra actions stay as icons, with no more button', () => {
  const { main, icons, more } = splitActions([act('pdf', 'ghost'), act('reject', 'danger'), act('approve', 'success')]);
  expect(main?.key).toBe('approve');
  expect(icons.map((a) => a.key)).toEqual(['reject', 'pdf']);
  expect(more).toEqual([]);
});

test('a single action is the labelled one', () => {
  expect(splitActions([act('confirm', 'primary')])).toEqual({
    main: expect.objectContaining({ key: 'confirm' }),
    icons: [],
    more: [],
  });
});

test('approve goes straight to a countdown; anything that needs a reason asks first', () => {
  expect(isInstant({ tone: 'success', remarks: 'optional' })).toBe(true);
  expect(isInstant({ tone: 'success', remarks: 'none' })).toBe(true);
  expect(isInstant({ tone: 'success', remarks: 'required' })).toBe(false);
  expect(isInstant({ tone: 'danger', remarks: 'required' })).toBe(false);
  expect(isInstant({ tone: 'ghost', remarks: 'optional' })).toBe(false);
});
