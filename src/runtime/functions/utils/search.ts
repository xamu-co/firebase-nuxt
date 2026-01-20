import words from "lodash-es/words.js";
import deburr from "lodash-es/deburr.js";

/**
 * Get alphanumeric words array
 */
export function getWords(phrase: string): string[] {
	return words(deburr(phrase.toUpperCase())).map((word) => word.replace(/[^a-z0-9]/gi, ""));
}

/**
 * Soundex algorithm in spanish
 *
 * Translated to ts by chatGPT an manually cleaned up
 * @see https://patotech.blogspot.com/2016/04/implementacion-algoritmo-soundex-para.html
 */
export function soundexEs(phrase: string): string {
	let tmp = phrase.replaceAll(" ", "");

	if (!tmp) return "";

	let firstLetter = tmp.charAt(0);
	let rest = tmp.slice(1);

	// Reemplazos iniciales
	firstLetter = firstLetter
		.replace(/[V]/, "B")
		.replace(/[ZX]/, "S")
		.replace(/[G](?=[EI])/, "J")
		.replace(/[C](?![HEI])/, "K");

	// Corrección de letras compuestas
	tmp = firstLetter + rest;
	tmp = tmp
		.replace(/CH/g, "V")
		.replace(/QU/g, "K")
		.replace(/LL/g, "J")
		.replace(/CE|CI/g, "S")
		.replace(/Y[AEIOU]/g, "J")
		.replace(/NY|NH/g, "N");

	// Algoritmo Soundex
	firstLetter = tmp.charAt(0);
	rest = tmp
		.slice(1)
		.replace(/[AEIOUHWY]/g, "")
		.replace(/[BPFV]/g, "1")
		.replace(/[CGKSXZ]/g, "2")
		.replace(/[DT]/g, "3")
		.replace(/[L]/g, "4")
		.replace(/[MN]/g, "5")
		.replace(/[R]/g, "6")
		.replace(/[QJ]/g, "7")
		.replace(/(\d)\1+/g, "$1");

	return (firstLetter + rest).padEnd(4, "0").slice(0, 4);
}

/**
 * Generate indexes to be used as tokens in a fuzzy search
 */
export function getSearchIndexes(
	phrase: string,
	soundexAlgorithm: (phrase: string) => string = soundexEs
): string[] {
	const words = getWords(phrase);
	const indexes = new Set<string>();

	// Iterate over each word in the phrase
	for (let i = 0; i < words.length; i++) {
		// Generate the combinations of words from left to right
		const forwardWords = words.slice(0, words.length - i);
		// Generate the combinations of words from right to left
		const backwardWords = words.slice(i);

		// Iterate over each combination of words
		[forwardWords, backwardWords].forEach((currentWords) => {
			// Generate the search index for each combination of words
			const perPhraseIndex = soundexAlgorithm(currentWords.join(" "));

			// Generate the search index for each word
			const perWordIndex = currentWords
				// Iterate over each word
				.map((word) => {
					// Add additional indexes to the set for long words
					if (word.length >= 7) {
						const threeIndex = soundexAlgorithm(word.slice(0, 3));
						const fiveIndex = soundexAlgorithm(word.slice(0, 5));

						// Add additional indexes to the set
						indexes.add(threeIndex).add(fiveIndex);
					}

					// Generate the search index for the current word
					return soundexAlgorithm(word);
				})
				// Convert the array of indexes into a string
				.join(" ");

			// Add the search index for the current phrase and word to the set
			indexes.add(perPhraseIndex).add(perWordIndex);
		});
	}

	// Convert the set of indexes into an array
	return Array.from(indexes);
}
