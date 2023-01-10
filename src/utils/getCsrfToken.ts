import { HTMLElement } from 'node-html-parser';

const getCsrfToken = (page: HTMLElement) => {
  const tokenEl = page.querySelector('[data-csrf_token]')!;

  const allTokenEls = Array.from(
    page.querySelectorAll('[data-csrf_token]')
  ).map((i) => i.getAttribute('data-csrf_token'));

  const csrfToken = tokenEl?.getAttribute('data-csrf_token');

  return csrfToken ?? null;
};
export default getCsrfToken;
