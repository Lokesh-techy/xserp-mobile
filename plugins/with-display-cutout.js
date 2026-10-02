/** @author Lokesh */
// Draw into the display cutout (punch-hole / notch) on every Android screen. Edge-to-edge is always on
// in Expo 57; without this, some devices letterbox the app below the cutout (worst in landscape).
// Content stays clear of the camera through the safe-area insets every header already applies.
const { withAndroidStyles, AndroidConfig } = require('expo/config-plugins');

const ITEM = 'android:windowLayoutInDisplayCutoutMode';

function applyCutoutMode(styles) {
  const theme = AndroidConfig.Styles.getAppThemeGroup(styles) ?? AndroidConfig.Styles.getAppThemeLightNoActionBarGroup?.(styles);
  const group = theme ?? { $: { name: 'AppTheme' } };
  return AndroidConfig.Styles.assignStylesValue(styles, { add: true, parent: group, name: ITEM, value: 'shortEdges', targetApi: '27' });
}

const withDisplayCutout = (config) =>
  withAndroidStyles(config, (cfg) => {
    cfg.modResults = applyCutoutMode(cfg.modResults);
    return cfg;
  });

module.exports = withDisplayCutout;
module.exports.applyCutoutMode = applyCutoutMode;
