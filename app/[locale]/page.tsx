'use client'

import { ReactNode, useState, useEffect, Suspense } from 'react'
import FloatingActivityAlerts from '@/components/home/FloatingActivityAlerts'
import { homeActivityNotifications } from '@/lib/data/activityNotifications'
import LoginModal from '@/components/home/LoginModal'
import RegisterModal from '@/components/home/RegisterModal'
import { useParams, useSearchParams } from 'next/navigation'
import PageLoading from '@/components/general/PageLoading'
import HomeMarque from '@/components/home/HomeBanner'
import Footer from '@/components/general/Footer'

const Section = ({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) => (
  <section className={`py-16 md:py-24 ${className}`}>
    <div className="container mx-auto px-4">
      <h2 className="text-4xl font-bold text-center mb-12">{title}</h2>
      {children}
    </div>
  </section>
)

function HomeContent() {
  const params = useParams()
  const rawLocale = params?.locale
  const locale = Array.isArray(rawLocale) ? rawLocale[0] ?? 'en' : rawLocale ?? 'en'
  const searchParams = useSearchParams()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [refCode, setRefCode] = useState<string | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const howItWorksSteps = [
    { title: 'Register', desc: 'Create a free account in seconds.' },
    { title: 'Complete Tasks', desc: 'Complete simple tasks to earn rewards.' },
    { title: 'Get Paid', desc: 'Withdraw earnings to Mobile Money.' },
  ]

  const testimonials = [
    { quote: 'Ayiicyuzi hano barayatanga nubwo tuba twayakobokeye.', name: 'Aline', location: 'Kigali' },
    { quote: 'Noneho nukureba video gusa, amafranga tugiye kuyakorera kabisa', name: 'Jean', location: 'Musanze' },
    { quote: 'Kandi babimbwiraga nkagira ni scam none ntangiye kuyaryaho.', name: 'Diane', location: 'Huye' },
    { quote: 'Nkunda ko iyo ugize ikibazo bahita bagufasha, iyi platform ifite support team yihuse', name: 'Patrick', location: 'Rubavu' },
    { quote: 'Uziko iyo ureferinze umuntu iyo yinjije nawe baguha bonus kuri buri kantu akoze, iyi fast earn ni sawa cyane kbsa.', name: 'Claudine', location: 'Rwamagana' },
  ]

  const faqItems = [
    { question: 'How do I get paid?', answer: 'Withdraw via Mobile Money once you reach the minimum threshold.' },
    { question: 'Is it free to join?', answer: 'Yes. The Free accountt category gives immediate access to tasks.' },
    { question: 'How long does withdrawal take?', answer: 'Most withdrawals are processed quickly after review.' },
    { question: 'Do referrals really earn money?', answer: 'Yes. You earn referral bonuses on tasks invited users complete.' },
    { question: 'Can I upgrade my account category later?', answer: 'Yes. You can upgrade to Pro or Pro Max anytime from your dashboard.' },
  ]

  useEffect(() => {
    const ref = searchParams?.get('ref')
    if (ref) {
      setRefCode(ref)
    }
  }, [searchParams])

  // Function to handle opening the register modal with a referral code
  const openRegisterModal = (ref?: string) => {
    if (ref) {
      setRefCode(ref)
    }
    setShowRegisterModal(true)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
      <HomeMarque onClaim={() => openRegisterModal()} />
      <FloatingActivityAlerts items={homeActivityNotifications} />

      <header className="relative overflow-hidden py-28 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-emerald-400">
            Welcome
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Make money by completing simple tasks.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => openRegisterModal()}
              className="bg-emerald-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors"
            >
              Start Earning
            </button>
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-colors"
            >
              Log in
            </button>
          </div>
        </div>
      </header>

      <Section title="How It Works">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto text-center">
          {howItWorksSteps.map((step, i) => (
            <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 bg-blue-600 rounded-full text-2xl font-bold">
                {i + 1}
              </div>
              <h3 className="text-xl text-emerald-400 font-bold mb-2">{step.title}</h3>
              <p className="text-gray-300">{step.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Others" className="bg-white/5">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <blockquote key={i} className="p-6 bg-white/10 border rounded-2xl border-gray-700">
              <p className="text-amber-300 tracking-wide mb-3" aria-label="5 out of 5 stars">
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </p>
              <p className="italic text-slate-100">{testimonial.quote}</p>
              <p className="font-bold mt-4 text-blue-200">- {testimonial.name}, {testimonial.location}</p>
            </blockquote>
          ))}
        </div>
      </Section>

      <Section title="Frequently asked Questions" className="bg-white/5">
        <div className="max-w-3xl mx-auto space-y-4 text-slate-100">
          {faqItems.map((item, i) => (
            <details key={i} className="bg-white/10 border border-white/10 p-4">
              <summary className="font-semibold text-white cursor-pointer">{item.question}</summary>
              <p className="mt-2 text-emerald-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <LoginModal 
        locale={locale} 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
      <RegisterModal 
        locale={locale}
        refCode={refCode}
        isOpen={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)} 
      />
      <Footer locale={locale} />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent />
    </Suspense>
  )
}
