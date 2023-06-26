/**
 * Outputs every argument passed to it.
 *
 * @param args arguments passed to the echo macro.
 */
export default function echo(...args: Array<unknown>): number {
	return (print(...args) as undefined) ?? 1;
}
