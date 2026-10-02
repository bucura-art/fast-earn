import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-emerald-950 to-slate-900 py-8 text-white">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Platform Settings</h1>
          <p className="text-gray-300">Manage platform-wide settings and configuration.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <Settings className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
          <h2 className="mb-2 text-xl font-semibold">Platform settings are coming soon</h2>
          <p className="text-gray-300">Platform-wide configuration options will be available here.</p>
        </div>
      </div>
    </div>
  )
}
