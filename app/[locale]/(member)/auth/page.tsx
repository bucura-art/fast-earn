import Link from 'next/link'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'

interface AuthPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ mode?: string; ref?: string }>
}

export default async function AuthPage({ params, searchParams }: AuthPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const isRegistering = query.mode === 'register'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 text-white">
      <Link href={`/${locale}`} className="mb-6 text-sm text-blue-300 hover:text-blue-200">
        Back
      </Link>
      {isRegistering ? (
        <RegisterForm locale={locale} refCode={query.ref} />
      ) : (
        <LoginForm locale={locale} refCode={query.ref} />
      )}
    </div>
  )
}