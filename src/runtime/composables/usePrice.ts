import { makeUsePrice, type iPriceProps } from "../functions/utils/price";

import { useRootStore } from "#imports";

export default function usePrice(props?: iPriceProps) {
	const ROOT = useRootStore();

	return makeUsePrice(ROOT.tax)(props);
}
