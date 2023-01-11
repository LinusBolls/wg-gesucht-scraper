export const parseCodeword = (str: string) => {
  const quotedWord = /(?<=&quot;).*?(?=&quot;)/i;

  if (quotedWord.test(str)) return str.match(quotedWord)![0]!;

  return null;
};
