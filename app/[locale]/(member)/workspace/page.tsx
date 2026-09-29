import Image from 'next/image'
import Link from 'next/link'
import SiteHeader from '@/components/general/SiteHeader'

interface WorkspacePageProps {
	params: Promise<{ locale: string }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
	const { locale } = await params

	return (
		<div className="min-h-screen bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 pb-24 text-white md:pb-8">
			<SiteHeader locale={locale} />
			<main className="container mx-auto px-4 pt-8">
				<h1 className="mb-2 text-4xl font-bold">Workspace</h1>
				<p className="mb-8 text-gray-300">Choose how you want to earn today.</p>

				<div className="grid gap-6 md:grid-cols-2">
					<Link
						href={`/${locale}/workspace/videos`}
						className="group relative overflow-hidden border border-blue-500/30 bg-blue-600/20 transition-colors hover:bg-blue-600/30"
					>
						<Image
							src="/images/CTA/video.jpg"
							alt="Watch sponsored videos"
							width={600}
							height={350}
							className="h-65 w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
							unoptimized
						/>
						<div className="flex flex-col items-center p-6 text-center">
							<h2 className="mb-2 rounded-lg bg-emerald-600 px-4 py-2 text-lg font-bold text-white shadow-lg shadow-emerald-900/20">
								Watch Videos
							</h2>
						</div>
					</Link>

					<Link
						href={`/${locale}/workspace/tasks`}
						className="group relative overflow-hidden border border-blue-500/30 bg-blue-600/20 transition-colors hover:bg-blue-600/30"
					>
						<Image
							src="/images/CTA/tasks.jpg"
							alt="Complete earning tasks"
							width={600}
							height={350}
							className="h-65 w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
							unoptimized
						/>
						<div className="flex flex-col items-center p-6 text-center">
							<h2 className="mb-2 rounded-lg bg-emerald-600 px-4 py-2 text-lg font-bold text-white shadow-lg shadow-emerald-900/20">
								Quick Tasks
							</h2>
						</div>
					</Link>
				</div>
			</main>
		</div>
	)
}
