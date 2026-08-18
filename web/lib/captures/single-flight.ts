export type PromiseRef<T> = { current: Promise<T> | null };

export function runSingleFlight<T>(
	flightRef: PromiseRef<T>,
	action: () => T | PromiseLike<T>,
): Promise<T> {
	if (flightRef.current) return flightRef.current;

	const flight = Promise.resolve().then(action);
	flightRef.current = flight;
	flight.then(
		() => {
			if (flightRef.current === flight) flightRef.current = null;
		},
		() => {
			if (flightRef.current === flight) flightRef.current = null;
		},
	);
	return flight;
}
