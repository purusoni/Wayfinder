/**
 * Search Logic for Wayfinder Application
 */
import { escapeRegExp, levenshteinDistance } from './utils.js';

export class SearchEngine {
    constructor(config) {
        this.config = config || { maxSuggestions: 6 };
    }

    /**
     * Search destinations based on query
     * @param {string} query 
     * @param {Object} libraryData 
     * @returns {Array} - List of matching nodes
     */
    searchDestinations(query, libraryData) {
        if (!libraryData) return [];

        const results = [];
        const queryLower = query.toLowerCase().trim();

        libraryData.nodes.forEach(node => {
            if (node.type !== 'destination') return;

            let score = 0;
            const nameLower = node.name.toLowerCase();
            const nameWords = nameLower.split(/\s+/);

            // 1. Exact name match gets highest score
            if (nameLower === queryLower) {
                score = 100;
            }
            // 2. Name starts with query
            else if (nameLower.startsWith(queryLower)) {
                score = 95;
            }
            // 3. Any word in name starts with query
            else if (nameWords.some(word => word.startsWith(queryLower))) {
                score = 90;
            }
            // 4. Name contains query as substring
            else if (nameLower.includes(queryLower)) {
                score = 85;
            }
            // 5. Check for partial word matches (like "2B" in "Room 2B")
            else if (this.hasPartialWordMatch(nameLower, queryLower)) {
                score = 80;
            }

            // 6. Check keywords for matches
            if (node.search_keywords) {
                let keywordScore = 0;
                node.search_keywords.forEach(keyword => {
                    const keywordLower = keyword.toLowerCase();
                    if (keywordLower === queryLower) {
                        keywordScore = Math.max(keywordScore, 75);
                    } else if (keywordLower.startsWith(queryLower)) {
                        keywordScore = Math.max(keywordScore, 70);
                    } else if (keywordLower.includes(queryLower)) {
                        keywordScore = Math.max(keywordScore, 65);
                    }
                });
                score = Math.max(score, keywordScore);
            }

            // 7. Short query heuristics
            if (queryLower.length <= 3 && score === 0) {
                const wordContainsQuery = nameWords.some(word => word.includes(queryLower));
                if (wordContainsQuery) {
                    score = 75;
                }
                if (score === 0 && nameLower.includes(queryLower)) {
                    score = 70;
                }
            }

            // 8. Pattern matching
            if (this.matchesPattern(queryLower)) {
                const patternScore = this.getPatternMatchScore(nameLower, queryLower);
                score = Math.max(score, patternScore);
            }

            // 9. Fuzzy matching
            if (score === 0 && queryLower.length >= 3) {
                const fuzzyScore = this.getFuzzyMatchScore(nameLower, queryLower);
                score = Math.max(score, fuzzyScore);
            }

            if (score > 0) {
                results.push({ node, score });
            }
        });

        // Sort by score and limit results
        return results
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.node.name.length - b.node.name.length;
            })
            .slice(0, this.config.maxSuggestions)
            .map(result => result.node);
    }

    hasPartialWordMatch(text, query) {
        const words = text.split(/\s+/);
        return words.some(word => {
            if (word.includes(query)) {
                if (query.length <= 2) {
                    return word.startsWith(query) || word.endsWith(query) || /\d/.test(query);
                }
                return true;
            }
            return false;
        });
    }

    matchesPattern(query) {
        return /^[0-9]+[A-Za-z]*$/.test(query) || /^[A-Za-z]+[0-9]+[A-Za-z]*$/.test(query);
    }

    getPatternMatchScore(text, query) {
        const patterns = text.match(/[0-9]+[A-Za-z]*|[A-Za-z]+[0-9]+[A-Za-z]*/g) || [];
        for (const pattern of patterns) {
            if (pattern.toLowerCase() === query) return 85;
            if (pattern.toLowerCase().includes(query)) return 75;
        }
        return 0;
    }

    getFuzzyMatchScore(text, query) {
        const words = text.split(/\s+/);
        let bestScore = 0;
        words.forEach(word => {
            if (Math.abs(word.length - query.length) <= 2) {
                const distance = levenshteinDistance(word, query);
                const maxLength = Math.max(word.length, query.length);
                const similarity = (maxLength - distance) / maxLength;
                if (similarity >= 0.7) {
                    bestScore = Math.max(bestScore, Math.floor(similarity * 60));
                }
            }
        });
        return bestScore;
    }

    highlightSearchTerm(name, searchTerm) {
        if (!searchTerm || searchTerm.length < 1) return name;
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        return name.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
}
