const handyWorkModule = import('https://cdn.jsdelivr.net/npm/handy-work/build/handy-work.min.js');
async function recordPose(frames=180, inputSources, referenceSpace) {
  const {generatePose} = await handyWorkModule;
  const tempHands = {};
	for (const source of inputSources) {
		if (!source.hand) continue;
		tempHands[source.handedness] = source.hand;
	}
	if (tempHands.left && tempHands.right) {
		const size = tempHands.left.size;
		const outData = new Float32Array((
			1 +         // store size
			size * 16 + // left hand
			size * 16 + // right hand
			size +      // weighting for individual joints left hand
			size        // weighting for individual joints right hand
		) * size);
  }
}