/**
 * some listings include a passphrase, which is to be included
 * in the application to show that the application text is not just being copy pasted.
 *
 * the passphrase is almost always wrapped in "" quotes though, making it easy for us to parse.
 * to filter out false positives, we only detect quoted expressions of three words or less,
 * in a sentence that has to include either "word" or "wort".
 *
 */
export const parseCodeword = (str: string) => {
  /**
   * match 3 or less words surrounded by quotes
   */
  const sentences = str.split('.');

  for (const sentence of sentences) {
    const quotedPhrase = /(?<=&quot;)(\w+\s?){1,3}?(?=&quot;)/i;

    const quotedPhraseMatch = str.match(quotedPhrase)?.[0];

    if (quotedPhraseMatch != null && /(word|wort)/i.test(sentence))
      return quotedPhraseMatch;
  }
  return null;
};
