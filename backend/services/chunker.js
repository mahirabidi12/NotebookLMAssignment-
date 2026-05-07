const SEPARATORS = ["\n\n", "\n", " ", ""];

function splitText(text, separator) {
  if (separator === "") return text.split("");
  return text.split(separator);
}

function mergeChunks(splits, separator, chunkSize, overlap) {
  const chunks = [];
  let current = "";

  for (const split of splits) {
    const candidate = current ? current + separator + split : split;

    if (candidate.length > chunkSize && current) {
      chunks.push(current);
      // start next chunk with overlap from tail of current
      const words = current.split(" ");
      let tail = "";
      for (let i = words.length - 1; i >= 0; i--) {
        const t = words[i] + (tail ? " " + tail : "");
        if (t.length > overlap) break;
        tail = t;
      }
      current = tail ? tail + separator + split : split;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current);
  return chunks;
}

function recursiveSplit(text, separators, chunkSize, overlap) {
  const [sep, ...rest] = separators;
  const splits = splitText(text, sep);

  const goodSplits = [];
  const finalChunks = [];

  for (const split of splits) {
    if (split.length <= chunkSize) {
      goodSplits.push(split);
    } else {
      if (goodSplits.length) {
        finalChunks.push(...mergeChunks(goodSplits, sep, chunkSize, overlap));
        goodSplits.length = 0;
      }
      if (rest.length) {
        finalChunks.push(...recursiveSplit(split, rest, chunkSize, overlap));
      } else {
        finalChunks.push(split);
      }
    }
  }

  if (goodSplits.length) {
    finalChunks.push(...mergeChunks(goodSplits, sep, chunkSize, overlap));
  }

  return finalChunks;
}

/**
 * Split text into overlapping chunks using recursive character splitting.
 * Strategy: try \n\n → \n → space → character in order until splits fit chunkSize.
 */
export function chunkText(text, chunkSize = 800, overlap = 150) {
  const raw = recursiveSplit(text, SEPARATORS, chunkSize, overlap);
  return raw.map((t) => t.trim()).filter((t) => t.length > 20);
}
