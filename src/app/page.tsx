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
