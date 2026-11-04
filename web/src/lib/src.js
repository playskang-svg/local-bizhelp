import { cleanSrc } from '../html.js';

// one validator (cleanSrc in html.js); unknown or malformed source becomes 'direct'
export const normalizeSrc = (v) => cleanSrc(v) || 'direct';
