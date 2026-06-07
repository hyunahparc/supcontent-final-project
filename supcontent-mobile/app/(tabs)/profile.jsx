import { useAuth } from '../../src/context/AuthContext';
import PublicProfileScreen from '../../src/screens/PublicProfileScreen';

export default function ProfileScreen() {
  const { user } = useAuth();

  return <PublicProfileScreen profileUserId={user?.user_id} isTabProfile />;
}
