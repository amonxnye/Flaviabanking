import AuthForm from '@/components/AuthForm'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { redirect } from 'next/navigation'

// Reads the session cookie on every request, so never pre-render it.
export const dynamic = 'force-dynamic';

const SignIn = async () => {
  const loggedIn = await getLoggedInUser();
  if (loggedIn) redirect('/');

  return (
    <section className="flex-center size-full max-sm:px-6">
      <AuthForm type="sign-in" />
    </section>
  )
}

export default SignIn