type LoginClient = {
	auth: {
		signInWithPassword: (credentials: {
			email: string;
			password: string;
		}) => Promise<{ error: unknown | null }>;
	};
};

type LoginSubmitOptions = {
	email: string;
	password: string;
	createClient: () => LoginClient;
	onSuccess: () => void;
};

export type LoginSubmitResult =
	| "invalid"
	| "credentials-error"
	| "success";
export class LoginServiceError extends Error {
	constructor() {
		super("LOGIN_SERVICE_UNAVAILABLE");
		this.name = "LoginServiceError";
	}
}

export async function submitEmailLogin({
	email,
	password,
	createClient,
	onSuccess,
}: LoginSubmitOptions): Promise<
	"invalid" | "credentials-error" | "success"
> {
	if (!/\S+@\S+\.\S+/.test(email) || !password) {
		return "invalid";
	}

	try {
		const { error } = await createClient().auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			return "credentials-error";
		}

		onSuccess();
		return "success";
	} catch {
		throw new LoginServiceError();
	}
}
