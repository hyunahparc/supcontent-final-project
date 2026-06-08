import { Ionicons } from '@expo/vector-icons';
import { Tabs, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getUnreadMessageCount } from '../../src/api/messages';
import { getUnreadCount } from '../../src/api/notifications';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { colors } from '../../src/theme/colors';

const tabIcons = {
  home: 'home',
  search: 'search',
  feed: 'newspaper',
  library: 'albums',
  profile: 'person',
};

export default function TabsLayout() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!token) {
      setHasUnreadNotifications(false);
      return;
    }

    try {
      const [notificationData, messageData] = await Promise.all([
        getUnreadCount(token).catch(() => ({ count: 0 })),
        getUnreadMessageCount(token).catch(() => ({ count: 0 })),
      ]);

      setHasUnreadNotifications(
        Number(notificationData?.count ?? 0) > 0 || Number(messageData?.count ?? 0) > 0
      );
    } catch {
      setHasUnreadNotifications(false);
    }
  }, [token]);

  useEffect(() => {
    loadUnreadCount();

    const intervalId = setInterval(loadUnreadCount, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tab_home'),
          tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.home} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tab_search'),
          tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.search} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t('tab_feed'),
          tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.feed} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tab_library'),
          tabBarIcon: ({ color, size }) => <Ionicons name={tabIcons.library} size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={tabIcons.profile} size={size} color={color} />
              {hasUnreadNotifications ? <View style={styles.unreadDot} /> : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.background,
  },
});
