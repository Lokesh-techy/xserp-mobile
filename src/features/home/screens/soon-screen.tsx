/** @author Lokesh */
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { env } from '@/core/config/env';
import { makeStyles } from '@/core/theme';
import { ScreenHeader, StateView, type IconName } from '@/ui';

export function SoonScreen({ title, icon }: { title: string; icon: IconName }) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} />
      <View style={styles.body}>
        <StateView
          icon={icon}
          title={`${title} is coming to mobile`}
          message="It's available today on XSERP web."
          action={{ label: 'Open XSERP web', onPress: () => void WebBrowser.openBrowserAsync(`${env.serverUrl}/erp/`) }}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({ root: { flex: 1, backgroundColor: t.colors.bg }, body: { padding: t.space.gutter } }));
