import LanguageDetect from 'languagedetect';

const getLanguageFromTexts = (texts: string[]) => {
  const detector = new LanguageDetect();

  const sentences = texts.reduce<string[]>(
    (arr, text) => [...arr, ...text.split('.')],
    []
  );

  const detectedLangs = sentences.map((i) => detector.detect(i));

  const occurencesByLang = detectedLangs.reduce<Record<string, number>>(
    (prev, matchPairs) => {
      const matchLang = matchPairs[0]?.[0];

      if (matchLang == null) return prev;

      return {
        ...prev,
        [matchLang]: matchLang in prev ? prev[matchLang]! + 1 : 1,
      };
    },
    {}
  );

  // const totalScores = detectedLangs.reduce<Record<string, number>>((prev, sachen) => {
  //   return sachen.reduce<Record<string, number>>(
  //     (obj, [lang, percentage]) => ({
  //       ...obj,
  //       [lang]: lang in obj ? obj[lang]! + percentage : percentage,
  //     }),
  //     prev
  //   );
  // }, {});

  // const languagesByDescendingLikeliness = Object.entries(totalScores).sort(
  //   (a, b) => b[1] - a[1]
  // );

  // const mostLikelyLanguage = languagesByDescendingLikeliness[0]?.[0];

  // return mostLikelyLanguage;

  const languages = Object.entries(occurencesByLang)
    .filter(([lang, occurences]) => occurences > 2)
    .map(([lang, occurences]) => lang);

  return languages;
};
export default getLanguageFromTexts;

/**
 *
 * split into sentences
 * evaluate each sentence
 *
 * get all languages that have at least three matches
 */
