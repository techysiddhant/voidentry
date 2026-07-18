import Footer from "@/components/footer";
import Header from "@/components/header";
import Features from "@/components/home/features";
import Hero from "@/components/home/hero";
import HowItWorks from "@/components/home/how-it-work";
import InsightsPreview from "@/components/home/insights-preview";
import Marquee from "@/components/home/marquee";

export default function Home() {
	return (
		<>
			<BetaRibbon />
			<Header />
			<Hero />
			<Marquee />
			<Features />
			<InsightsPreview />
			<HowItWorks />
			<Footer />
		</>
	);
}
function BetaRibbon() {
	return (
		<div className="border-b-2 border-ink bg-ink text-paper">
			<div className="mx-auto max-w-7xl px-6 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-widest">
				<span>
					<span className="text-pink">✦</span> Voidentry is in beta — expect rough edges.
				</span>
			</div>
		</div>
	);
}