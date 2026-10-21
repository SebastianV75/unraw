import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./circle-story.css";
import config from "@/config";

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist",
	display: "swap",
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});

const departureMono = localFont({
	src: "./fonts/DepartureMono-Regular.woff2",
	variable: "--font-pixel",
	preload: false,
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_APP_URL || config.app.defaultUrl,
	),
	title: {
		default: config.app.name,
		template: `%s · ${config.app.name}`,
	},
	description: config.app.description,
	openGraph: {
		title: config.app.name,
		description: config.app.description,
		type: "website",
		locale: "es_MX",
	},
	icons: {
		icon: {
			url: "/brand/unraw-favicon.png",
			type: "image/png",
			sizes: "64x64",
		},
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f7f7f6" },
		{ media: "(prefers-color-scheme: dark)", color: "#111110" },
	],
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="es"
			data-theme="unraw"
			suppressHydrationWarning
			className={`${geist.variable} ${geistMono.variable} ${departureMono.variable}`}
		>
			<body className="bg-base-100 text-base-content">
				<a
					href="#main-content"
					className="sr-only z-50 rounded bg-base-100 px-4 py-2 text-base-content focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
				>
					Saltar al contenido principal
				</a>
				<script
					dangerouslySetInnerHTML={{
						__html: `try{var t=localStorage.getItem('theme');if(t==='unraw'||t==='unraw-dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`,
					}}
				/>
				{children}
			</body>
		</html>
	);
}
