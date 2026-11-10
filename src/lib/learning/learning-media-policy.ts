/** Only same-origin reviewed assets; no remote tracking, embeds or script URLs. */
export function safeLearningMedia(value:unknown){return typeof value==='string' && /^\/learning-media\/[A-Za-z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/.test(value)?value:null}
