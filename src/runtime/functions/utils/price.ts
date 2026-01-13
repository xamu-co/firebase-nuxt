import type { PriceData } from "../types/entities/base.js";

export interface iPriceProps extends Pick<PriceData, "price" | "base" | "iva"> {
	quantity?: number;
}

export function makeUsePrice(tax: number, currency = "COP") {
	const CURRENCY = new Intl.NumberFormat("es-CO", {
		style: "currency",
		currency,
	});

	/**
	 * Returns the taxed price
	 */
	return function ({ price = 0, base = 0, iva = 0, quantity = 1 }: iPriceProps = {}) {
		base ||= price / tax;
		iva ||= price - base;

		function format(value: number, free?: boolean) {
			const formatted = `${CURRENCY.format(value)} ${currency.toLowerCase()}`;

			if (value) return formatted;

			return free ? "Gratis" : formatted;
		}

		// multiplied
		const multipliedIva = iva * quantity;
		const multipliedBase = base * quantity;
		const multipliedPrice = price * quantity;

		return {
			iva: multipliedIva,
			base: multipliedBase,
			price: multipliedPrice,
			formattedIva: format(multipliedIva),
			formattedBase: format(multipliedBase),
			formattedPrice: format(multipliedPrice, true),
		};
	};
}
