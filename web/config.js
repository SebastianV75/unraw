const config = {
	app: {
		name: "Unraw",
		description:
			"Unraw convierte tus notas crudas en tareas, ideas y notas organizadas con IA dentro de tu propio sistema.",
		domain: "unraw.app",
		locale: "es",
		defaultUrl: "http://localhost:3000",
	},
	brand: {
		primary: "#1a1a1a",
		logoText: "Unraw",
		logoSrc: "/brand/unraw-wordmark.png",
		radius: "1rem",
	},
	landing: {
		hero: {
			eyebrow: "Un sistema que hace el trabajo pesado",
			title: "Tira cualquier cosa. Unraw la pone en su sitio.",
			subtitle:
				"Captura una idea, una tarea o un pensamiento a medias. Unraw lo convierte en tareas, ideas y notas listas para usar.",
			cta: { label: "Únete a la lista", href: "#waitlist" },
		},
		features: {
			items: [
				{
					icon: "Inbox",
					title: "Captura sin fricción",
					body: "Escribe ideas y tareas tal como aparecen, sin decidir antes dónde guardarlas.",
				},
				{
					icon: "Sparkles",
					title: "Procesa en segundos",
					body: "La IA detecta la intención de cada nota y la convierte en algo accionable.",
				},
				{
					icon: "ListChecks",
					title: "Encuentra lo importante",
					body: "Tus tareas, ideas y notas quedan organizadas dentro de un sistema que sí puedes mantener.",
				},
			],
		},
		faq: {
			items: [
				{
					q: "¿Tengo que organizar la nota antes de capturarla?",
					a: "No. Escribe la nota como te salga y Unraw se encarga de identificar qué es y dónde debe vivir.",
				},
				{
					q: "¿Qué puede hacer Unraw con mis notas?",
					a: "Puede convertirlas en tareas, ideas o notas organizadas según la intención y el contexto de cada captura.",
				},
				{
					q: "¿Unraw reemplaza Notion u Obsidian?",
					a: "No busca darte otro sistema que mantener. Unraw te ayuda a procesar tus capturas dentro de tu propio sistema.",
				},
				{
					q: "¿La IA guarda todo automáticamente?",
					a: "Unraw te muestra cómo entendió la captura para que puedas revisarla y decidir qué guardar.",
				},
			],
		},
		waitlist: {
			eyebrow: "Acceso anticipado",
			title: "Sé de las primeras personas en capturar sin ordenar.",
			subtitle:
				"Déjanos tu email para recibir acceso anticipado cuando abramos las primeras plazas.",
			buttonLabel: "Únete a la lista",
			placeholder: "tu@email.com",
			successMessage:
				"Tu lugar quedó reservado. Te escribiremos cuando Unraw esté listo.",
		},
	},
	email: {
		from: "Unraw <onboarding@resend.dev>",
		replyTo: "onboarding@resend.dev",
		supportEmail: "onboarding@resend.dev",
	},
	auth: {
		loginUrl: "/login",
		afterLoginUrl: "/capture",
		afterLogoutUrl: "/",
	},
};

export default config;
