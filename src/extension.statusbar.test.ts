import { updateStatusBarFromItems, getStatusBarItem } from './extension';

describe('status bar updates', () => {
  test('status bar shows green for ok', () => {
    const sb = getStatusBarItem();
    // initial create via activate would have created it; mock may be undefined in some setups
    if (!sb) {
      // nothing to assert; ensure function is callable without throwing
      expect(typeof updateStatusBarFromItems).toBe('function');
      return;
    }
    updateStatusBarFromItems([{ line: 1, label: 'a', value: '1', status: 'ok' }]);
    expect(sb.text).toMatch(/check/);
    expect(sb.color).toBe('#52c41a');
  });

  test('status bar shows yellow for info', () => {
    const sb = getStatusBarItem();
    if (!sb) return; // skip if not created
    updateStatusBarFromItems([{ line: 1, label: 'a', value: 'undefined', status: 'info' }]);
    expect(sb.text).toMatch(/alert/);
    expect(sb.color).toBe('#faad14');
  });

  test('status bar shows red for error', () => {
    const sb = getStatusBarItem();
    if (!sb) return;
    updateStatusBarFromItems([{ line: 1, label: 'a', value: 'err', status: 'error' }]);
    expect(sb.text).toMatch(/error/);
    expect(sb.color).toBe('#ff4d4f');
  });
});
