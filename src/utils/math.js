export function cosineSimilarity(a, b) {
    // Guard clause: return 0 if inputs aren't arrays or have different lengths
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return 0;
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];  // calculate dot product
        magnitudeA += Math.pow(a[i], 2);  // calculate magnitude of a
        magnitudeB += Math.pow(b[i], 2);  // calculate magnitude of b
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);  // calculate cosine similarity
}
