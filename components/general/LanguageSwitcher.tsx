'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  const switchLocale = (locale: string) => {
    if (!pathname) return
    const segments = pathname.split('/')
    // segments[0] is empty string, segments[1] is the locale
    if (segments.length > 1) {
      segments[1] = locale
      router.push(segments.join('/'))
    }
  }

  const currentLocale = pathname?.split('/')[1] || 'en'

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          currentLocale === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        🇬🇧 EN
      </button>
      <button
        onClick={() => switchLocale('rw')}
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          currentLocale === 'rw'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        🇷🇼 RW
      </button>
    </div>
  )
}
