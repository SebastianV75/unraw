import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
	icons: { icon: "/brand/unraw-favicon.png" },
};

export const viewport: Viewport = {
	themeColor: config.brand.primary,
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
			className={`${geist.variable} ${geistMono.variable}`}
		>
			<body className="bg-base-100 text-base-content">
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
