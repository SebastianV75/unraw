import Image from "next/image";

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
		<Image
			src={logoSources[variant]}
			width={variant === "wordmark" ? 1204 : variant === "mark" ? 682 : 512}
			height={variant === "wordmark" ? 208 : variant === "mark" ? 269 : 512}
			sizes={variant === "wordmark" ? "160px" : "40px"}
			alt={alt}
			aria-hidden={alt ? undefined : true}
			className={`logo-image object-contain ${className}`}
		/>
	);
}
