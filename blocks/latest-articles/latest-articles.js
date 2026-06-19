/**
 * latest-articles — delegates to the unified Cards block.
 *
 * DA content using "Latest Articles" block name continues to work unchanged.
 * Config keys supported: source, limit, filter, view-all, eyebrow, title.
 *
 * Adding .cards and .articles classes makes cards.js route to decorateDynamic()
 * and ensures cards.css styles apply.
 */
import cardsDecorate from '../cards/cards.js';

export default function decorate(block) {
  block.classList.add('cards', 'articles');
  return cardsDecorate(block);
}
