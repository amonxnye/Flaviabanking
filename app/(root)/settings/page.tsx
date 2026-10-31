import HeaderBox from '@/components/HeaderBox';
import SettingsForm from '@/components/SettingsForm';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Settings = async () => {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) return null;

  return (
    <section className="page">
      <HeaderBox
        title="Settings"
        subtext="Your profile, your data and your account"
      />

      <SettingsForm user={loggedIn} />
    </section>
  );
};

export default Settings;
