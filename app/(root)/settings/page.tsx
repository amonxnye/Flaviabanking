import HeaderBox from '@/components/HeaderBox';
import SettingsForm from '@/components/SettingsForm';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Settings = async () => {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) return null;

  return (
    <section className="settings">
      <div className="mx-auto max-w-3xl w-full p-6">
        <HeaderBox
          title="Settings"
          subtext="Manage your profile, security, and account preferences."
        />

        <SettingsForm user={loggedIn} />
      </div>
    </section>
  );
};

export default Settings;
