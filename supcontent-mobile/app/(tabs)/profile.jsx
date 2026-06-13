import { useAuth } from '../../src/context/AuthContext';
import ModerationScreen from '../../src/screens/ModerationScreen';
import PublicProfileScreen from '../../src/screens/PublicProfileScreen';

export default function ProfileScreen() {
  const { user } = useAuth();

  // Admins see the moderation queue instead of a personal profile (mirrors web)
  if (user?.is_admin) {
    return <ModerationScreen />;
  }

  return <PublicProfileScreen profileUserId={user?.user_id} isTabProfile />;
}
