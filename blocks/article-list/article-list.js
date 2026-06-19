/**
 * article-list — delegates to the unified Cards block.
 *
 * DA content using "Article List" block name continues to work unchanged.
 * Config keys supported: source, limit, category, subcategory, year, filter.
 *
 * Adding .cards and .list classes makes cards.js route to decorateDynamicList()
 * which provides paginated, filterable article rows.
 */
import cardsDecorate from '../cards/cards.js';

export default function decorate(block) {
  block.classList.add('cards', 'list');
  return cardsDecorate(block);
}
