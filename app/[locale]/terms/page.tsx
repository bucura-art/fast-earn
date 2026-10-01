import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-20 preserve-bullets">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href={`/${locale}/dashboard`} className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="space-y-8 bg-white/5 p-8 rounded-2xl border border-white/10">
          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing and using the FastEarn application, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. User Responsibilities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Comply with all local, state, national, and international laws and regulations</li>
              <li>Not engage in fraudulent or unlawful activities</li>
              <li>Not attempt to manipulate or exploit the platform</li>
              <li>Not harm the reputation or operations of FastEarn</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. Task Completion and Rewards</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              FastEarn offers various tasks for users to complete and earn rewards. The following terms apply:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Rewards are credited based on task completion and verification</li>
              <li>Fraudulent task completion may result in account suspension and reward forfeiture</li>
              <li>Daily task limits apply based on your subscription tier</li>
              <li>Rewards cannot be exchanged for cash until withdrawal is requested and processed</li>
              <li>FastEarn reserves the right to modify task rewards and requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Subscription Tiers</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              FastEarn offers multiple subscription tiers with varying benefits:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>All tiers receive the same reward for completing a task.</li>
              <li>Free: up to 5 tasks per day</li>
              <li>Pro: up to 10 tasks per day, valid for 30 days from activation</li>
              <li>Pro Max: up to 20 tasks per day, valid for 30 days from activation</li>
              <li>Subscriptions automatically expire after 30 days and revert to Free tier</li>
              <li>Paid subscriptions are non-refundable once activated</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Withdrawal and Payment</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Withdrawal policies include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Minimum withdrawal amount may apply</li>
              <li>Processing time varies by payment method</li>
              <li>Payment information must be accurate and up to date</li>
              <li>FastEarn reserves the right to verify user identity before processing withdrawals</li>
              <li>Fraudulent withdrawal requests will be rejected and may result in account suspension</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Prohibited Activities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Use automated tools or bots to complete tasks</li>
              <li>Manipulate or hack the application</li>
              <li>Engage in account farming or multi-accounting</li>
              <li>Share account credentials with others</li>
              <li>Attempt to earn rewards through fraudulent means</li>
              <li>Harass or abuse other users or support staff</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">7. Account Suspension and Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              FastEarn reserves the right to suspend or terminate your account without notice if you engage in prohibited activities or violate these terms of service. Upon termination, any accumulated rewards may be forfeited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              FastEarn and its owners, operators, and affiliates are not liable for any direct, indirect, incidental, consequential, or special damages arising from the use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              FastEarn may modify these terms at any time. Your continued use of the service constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">10. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about these Terms of Service, please contact us at support@fastearn.com or through the contact form in our application.
            </p>
          </section>

          <section className="pt-4 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              Last Updated: February 22, 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
