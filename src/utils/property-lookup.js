/**
 * @layer 2 - Domain (Generic Object Helpers)
 *
 * Case-insensitive property lookup on plain objects.
 * Used for Notion `page.properties` and CSV row objects so the pipeline
 * survives capitalization changes in source-of-truth property/column names.
 */

function pick(obj, key) {
  if (!obj || key == null) return undefined;
  if (obj[key] !== undefined) return obj[key];

  const target = key.toLowerCase();
  const match = Object.keys(obj).find((k) => k.toLowerCase() === target);
  return match ? obj[match] : undefined;
}

module.exports = { pick };
