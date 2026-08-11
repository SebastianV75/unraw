const logoSources = {
	mark: "/brand/unraw-mark.png",
	appMark: "/brand/unraw-app-icon.png",
	wordmark: "/brand/unraw-wordmark.png",
};

// Assets oficiales de la marca Unraw.
export default function Logo({
	className = "size-7",
	variant = "mark",
	alt = "",
}) {
	return (
		<img
			src={logoSources[variant]}
			alt={alt}
			aria-hidden={alt ? undefined : true}
			className={`logo-image object-contain ${className}`}
		/>
	);
}
