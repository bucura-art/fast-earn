import Link from 'next/link'

interface FooterProps {
  locale: string
}

export default function Footer({ locale }: FooterProps) {
  return (
    <footer className="bg-gradient-to-r from-blue-600 to-emerald-500 text-white py-8 border-t border-white/10">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm font-bold text-slate-200">&copy; {new Date().getFullYear()} Fast Earn. All rights reserved.</p>
      </div>
    </footer>
  )
}
