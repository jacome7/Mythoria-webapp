import { getCurrentPremiumAudiobook } from './audiobook';
import { downloadPremiumAudio } from './storage';

export async function premiumAudioResponse(
  request: Request,
  story: { storyId: string; features: unknown; audiobookUri: unknown; status: string | null },
  trackIndex: number,
) {
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  const premium =
    story.status === 'published'
      ? getCurrentPremiumAudiobook(story.storyId, story.features, story.audiobookUri)
      : null;
  const { searchParams } = new URL(request.url);
  if (!premium || premium.runId !== searchParams.get('runId')) {
    return new Response(null, { status: 404, headers });
  }
  const singleFile = 'audio' in premium;
  const asset = singleFile
    ? trackIndex === 0
      ? premium.audio
      : null
    : premium.tracks[trackIndex]?.audio;
  if (!asset) return new Response(null, { status: 404, headers });

  const audio = await downloadPremiumAudio(asset);
  headers.set('Content-Type', 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (singleFile && searchParams.get('download') === '1') {
    headers.set('Content-Disposition', 'attachment; filename="mythoria-audiobook.mp3"');
  }
  const range = request.headers.get('range');
  if (!range) {
    headers.set('Content-Length', String(audio.length));
    return new Response(new Uint8Array(audio), { headers });
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const start = match?.[1] ? Number(match[1]) : Math.max(0, audio.length - Number(match?.[2]));
  const end =
    match?.[1] && match[2] ? Math.min(Number(match[2]), audio.length - 1) : audio.length - 1;
  if (
    !match ||
    (!match[1] && !match[2]) ||
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end
  ) {
    headers.set('Content-Range', `bytes */${audio.length}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${audio.length}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(new Uint8Array(audio.subarray(start, end + 1)), { status: 206, headers });
}
